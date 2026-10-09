import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ServiceDeskEditor } from '../components/ServiceDeskEditor';
import { BusinessHoursEditor } from '../components/BusinessHoursEditor';
import { ServiceDeskSlaEditor } from '../components/ServiceDeskSlaEditor';
import { EzAlert, EzButton, EzCardItem, EzEmptyCard, EzSpinner, EzTextInput } from '../components/ds';
import { EzEntityGrid } from '../components/ds/EzEntityGrid';

interface ServiceDesk {
  id: string;
  name: string;
  agents?: { id: string; name: string }[];
  organization?: { id: string; name: string } | null;
  organizationId?: string | null;
  slaCriticalResponseHours?: number | null;
  slaCriticalResolveHours?: number | null;
  slaHighResponseHours?: number | null;
  slaHighResolveHours?: number | null;
  slaMediumResponseHours?: number | null;
  slaMediumResolveHours?: number | null;
  slaLowResponseHours?: number | null;
  slaLowResolveHours?: number | null;
  createdAt: string;
}

const serviceDeskFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
});

type ServiceDeskFormValues = z.infer<typeof serviceDeskFormSchema>;

function serviceDeskColumns(
  onSelect: (deskId: string) => void,
): ColumnDef<ServiceDesk>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onSelect(row.original.id)}
          className="text-left font-medium text-brand-700 hover:underline"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      id: 'organization',
      header: 'Cliente vinculado',
      cell: ({ row }) => row.original.organization?.name ?? '—',
    },
    {
      id: 'agents',
      header: 'Agentes',
      cell: ({ row }) => row.original.agents?.length ?? 0,
    },
  ];
}

/**
 * ADMIN-only page for managing departments (API resource: "service desk").
 * The create-ticket form (TicketForm) reads its dropdown from
 * `GET /service-desks` but had no UI anywhere to populate that list — an
 * ADMIN previously had to call the API directly. This page closes that
 * gap: list existing departments and a form to create new ones, matching
 * the API's ADMIN-only `POST /service-desks` guard
 * (service-desks.controller.ts) on the client side too so non-admins get
 * an immediate, clear message instead of a silent 403 from a hidden form.
 */
export function ServiceDesksPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);

  const { data: serviceDesks, isLoading } = useQuery({
    queryKey: ['service-desks'],
    queryFn: async () => {
      const { data } = await api.get<ServiceDesk[]>('/service-desks');
      return data;
    },
    enabled: isAdmin,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; name: string; email: string }[]>('/users/agents');
      return data;
    },
    enabled: isAdmin,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceDeskFormValues>({
    resolver: zodResolver(serviceDeskFormSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: ServiceDeskFormValues) => {
      const { data } = await api.post<ServiceDesk>('/service-desks', values);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-desks'] });
      reset();
    },
  });

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-[20px] font-semibold text-gray-900">Departamentos</h1>
        <p className="text-sm text-gray-500">
          Você não tem permissão para ver esta página. Somente
          administradores podem gerenciar departamentos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-gray-900">Departamentos</h1>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="flex max-w-lg items-end gap-3"
      >
        <EzCardItem flat className="flex-1 flex-row items-end gap-3 p-4">
          <div className="flex-1">
            <EzTextInput
              id="service-desk-name"
              label="Nome"
              hasError={!!errors.name}
              message={errors.name?.message}
              {...register('name')}
            />
          </div>
          <EzButton type="submit" disabled={mutation.isPending}>
            Criar
          </EzButton>
        </EzCardItem>
      </form>
      {mutation.isError && (
        <EzAlert variant="error">Falha ao criar o departamento. Tente novamente.</EzAlert>
      )}

      {isLoading ? (
        <EzSpinner label="Carregando…" />
      ) : selectedDeskId === null ? (
        (serviceDesks ?? []).length === 0 ? (
          <EzCardItem flat className="max-w-2xl overflow-hidden">
            <div className="p-4">
              <EzEmptyCard title="Nenhum departamento cadastrado ainda." />
            </div>
          </EzCardItem>
        ) : (
          <EzEntityGrid
            data={serviceDesks ?? []}
            columns={serviceDeskColumns(setSelectedDeskId)}
            pageSize={10}
          />
        )
      ) : (
        (() => {
          const selectedDesk = serviceDesks?.find((desk) => desk.id === selectedDeskId);
          if (!selectedDesk) return null;
          return (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-gray-900">{selectedDesk.name}</h2>
                <EzButton
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setSelectedDeskId(null)}
                >
                  Voltar
                </EzButton>
              </div>
              <EzCardItem flat className="p-4">
                <ServiceDeskEditor desk={selectedDesk} agents={agents ?? []} />
                <ServiceDeskSlaEditor
                  deskId={selectedDesk.id}
                  initial={{
                    organizationId: selectedDesk.organizationId ?? selectedDesk.organization?.id ?? null,
                    organizationName: selectedDesk.organization?.name ?? null,
                    slaCriticalResponseHours: selectedDesk.slaCriticalResponseHours,
                    slaCriticalResolveHours: selectedDesk.slaCriticalResolveHours,
                    slaHighResponseHours: selectedDesk.slaHighResponseHours,
                    slaHighResolveHours: selectedDesk.slaHighResolveHours,
                    slaMediumResponseHours: selectedDesk.slaMediumResponseHours,
                    slaMediumResolveHours: selectedDesk.slaMediumResolveHours,
                    slaLowResponseHours: selectedDesk.slaLowResponseHours,
                    slaLowResolveHours: selectedDesk.slaLowResolveHours,
                  }}
                />
                <BusinessHoursEditor serviceDeskId={selectedDesk.id} />
              </EzCardItem>
            </div>
          );
        })()
      )}
    </div>
  );
}

export default ServiceDesksPage;
