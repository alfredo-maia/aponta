import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ServiceDeskEditor } from '../components/ServiceDeskEditor';
import { BusinessHoursEditor } from '../components/BusinessHoursEditor';
import { EzAlert, EzButton, EzCardItem, EzEmptyCard, EzSpinner, EzTextInput } from '../components/ds';

interface ServiceDesk {
  id: string;
  name: string;
  agents?: { id: string; name: string }[];
  createdAt: string;
}

const serviceDeskFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
});

type ServiceDeskFormValues = z.infer<typeof serviceDeskFormSchema>;

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
      ) : (
        <EzCardItem flat className="max-w-2xl overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {(serviceDesks ?? []).map((desk) => (
              <li key={desk.id} className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{desk.name}</div>
                <ServiceDeskEditor desk={desk} agents={agents ?? []} />
                <BusinessHoursEditor serviceDeskId={desk.id} />
              </li>
            ))}
          </ul>
          {serviceDesks?.length === 0 && (
            <div className="p-4">
              <EzEmptyCard title="Nenhum departamento cadastrado ainda." />
            </div>
          )}
        </EzCardItem>
      )}
    </div>
  );
}

export default ServiceDesksPage;
