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
import {
  EzAlert,
  EzButton,
  EzCardItem,
  EzEmptyCard,
  EzEntityScreenConfigModal,
  EzEntityToolbar,
  EzSpinner,
  EzTextInput,
} from '../components/ds';
import { EzEntityGrid } from '../components/ds/EzEntityGrid';
import { useUserScreenConfig } from '../hooks/useUserScreenConfig';

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
 *
 * Standardized on the Sankhya ERP grid pattern (parity with
 * OrganizationsPage / TicketsPage): EzEntityToolbar for Incluir / Recarregar
 * / Excluir / Duplicar / Configurar colunas, plus per-user column
 * configuration via useUserScreenConfig. Scope kept proportional to this
 * screen's size — no Endereços/Contatos/Relacionamentos tabs, since a
 * department has none of that; the existing ADMIN-only guard and the
 * ServiceDeskEditor / ServiceDeskSlaEditor / BusinessHoursEditor detail
 * editors are untouched.
 */
export function ServiceDesksPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  // Sankhya parity: Modo Grade (lista) / Modo Formulário (criação ou
  // detalhe), controlado pela EzEntityToolbar — mesmo padrão de
  // OrganizationsPage/TicketsPage.
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);
  const [selectedDesks, setSelectedDesks] = useState<ServiceDesk[]>([]);
  const [isScreenConfigModalOpen, setIsScreenConfigModalOpen] = useState(false);

  const {
    config: screenConfig,
    setColumnVisibility,
    setDensity,
    setFormLayout,
    restoreDefaults,
  } = useUserScreenConfig('service-desks', {
    grid: {
      columnVisibility: {},
      density: 'compact',
    },
    form: {
      layout: 'CASCADE',
    },
    viewMode: 'GRID',
  });

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
    setValue,
    formState: { errors },
  } = useForm<ServiceDeskFormValues>({
    resolver: zodResolver(serviceDeskFormSchema),
    defaultValues: { name: '' },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ServiceDeskFormValues) => {
      const { data } = await api.post<ServiceDesk>('/service-desks', values);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-desks'] });
      reset();
      setMode('list');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (deskId: string) => {
      await api.delete(`/service-desks/${deskId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-desks'] });
    },
  });

  const openDetail = (deskId: string) => {
    setSelectedDeskId(deskId);
    setMode('form');
  };

  const backToList = () => {
    setMode('list');
    setSelectedDeskId(null);
  };

  const handleInsert = () => {
    reset();
    setSelectedDeskId(null);
    setMode('form');
  };

  const handleClone = () => {
    const active = selectedDesks[0];
    if (!active) return;
    reset();
    setValue('name', `${active.name} (Cópia)`);
    setSelectedDeskId(null);
    setMode('form');
  };

  const handleDelete = () => {
    if (selectedDesks.length === 0) return;
    const confirmMsg = `Deseja excluir ${selectedDesks.length} departamento(s) selecionado(s)?`;
    if (window.confirm(confirmMsg)) {
      selectedDesks.forEach((desk) => deleteMutation.mutate(desk.id));
      setSelectedDesks([]);
    }
  };

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

  const serviceDeskGridColumns = serviceDeskColumns(openDetail);
  const screenConfigColumns = serviceDeskGridColumns.map((c) => {
    const colId = (c as { accessorKey?: string }).accessorKey ?? c.id ?? '';
    const label = typeof c.header === 'string' ? c.header : colId;
    const isVisible = screenConfig.grid.columnVisibility[colId] !== false;
    return { id: colId, label, isVisible };
  });

  const totalCount = serviceDesks?.length ?? 0;
  const activeDesk = serviceDesks?.find((desk) => desk.id === selectedDeskId) ?? null;
  const recordCountText =
    mode === 'form' && selectedDeskId
      ? `1 de ${totalCount}`
      : `${totalCount === 0 ? 0 : 1} - ${totalCount} de ${totalCount}`;

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-gray-900">Departamentos</h1>

      {isLoading ? (
        <EzSpinner label="Carregando…" />
      ) : (
        <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden shadow-xs flex flex-col">
          <EzEntityToolbar
            viewMode={mode === 'list' ? 'GRID' : 'FORM'}
            onToggleViewMode={(nextMode) => {
              if (nextMode === 'FORM') {
                const active = selectedDesks[0] ?? serviceDesks?.[0];
                if (active) {
                  openDetail(active.id);
                } else {
                  handleInsert();
                }
              } else {
                backToList();
              }
            }}
            onInsert={handleInsert}
            insertAriaLabel="Novo Departamento"
            insertTooltip="Novo Departamento"
            selectedCount={selectedDesks.length}
            onDelete={handleDelete}
            onClone={handleClone}
            onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['service-desks'] })}
            onOpenGridConfig={() => setIsScreenConfigModalOpen(true)}
            onOpenScreenConfig={() => setIsScreenConfigModalOpen(true)}
            recordCountText={recordCountText}
          />

          <div className="p-3">
            {mode === 'form' ? (
              selectedDeskId === null ? (
                <form
                  onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                  noValidate
                  className="max-w-lg space-y-3"
                >
                  <EzCardItem flat className="flex-row items-end gap-3 p-4">
                    <div className="flex-1">
                      <EzTextInput
                        id="service-desk-name"
                        label="Nome"
                        hasError={!!errors.name}
                        message={errors.name?.message}
                        {...register('name')}
                      />
                    </div>
                    <EzButton type="submit" disabled={createMutation.isPending}>
                      Criar
                    </EzButton>
                  </EzCardItem>
                  {createMutation.isError && (
                    <EzAlert variant="error">Falha ao criar o departamento. Tente novamente.</EzAlert>
                  )}
                </form>
              ) : activeDesk ? (
                <div className="max-w-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-gray-900">{activeDesk.name}</h2>
                    <EzButton type="button" variant="secondary" size="small" onClick={backToList}>
                      Voltar
                    </EzButton>
                  </div>
                  <EzCardItem flat className="p-4">
                    <ServiceDeskEditor desk={activeDesk} agents={agents ?? []} />
                    <ServiceDeskSlaEditor
                      deskId={activeDesk.id}
                      initial={{
                        organizationId: activeDesk.organizationId ?? activeDesk.organization?.id ?? null,
                        organizationName: activeDesk.organization?.name ?? null,
                        slaCriticalResponseHours: activeDesk.slaCriticalResponseHours,
                        slaCriticalResolveHours: activeDesk.slaCriticalResolveHours,
                        slaHighResponseHours: activeDesk.slaHighResponseHours,
                        slaHighResolveHours: activeDesk.slaHighResolveHours,
                        slaMediumResponseHours: activeDesk.slaMediumResponseHours,
                        slaMediumResolveHours: activeDesk.slaMediumResolveHours,
                        slaLowResponseHours: activeDesk.slaLowResponseHours,
                        slaLowResolveHours: activeDesk.slaLowResolveHours,
                      }}
                    />
                    <BusinessHoursEditor serviceDeskId={activeDesk.id} />
                  </EzCardItem>
                </div>
              ) : null
            ) : (serviceDesks ?? []).length === 0 ? (
              <EzEmptyCard title="Nenhum departamento cadastrado ainda." />
            ) : (
              <EzEntityGrid
                data={serviceDesks ?? []}
                columns={serviceDeskGridColumns}
                selectable
                showRowNumbers
                enableColumnMenu
                enableColumnFilters
                zebraStriping
                density={screenConfig.grid.density}
                initialColumnVisibility={screenConfig.grid.columnVisibility}
                onSelectionChange={setSelectedDesks}
                pageSize={10}
              />
            )}
          </div>
        </div>
      )}

      {isScreenConfigModalOpen && (
        <EzEntityScreenConfigModal
          columns={screenConfigColumns}
          onToggleColumn={(colId) => {
            setColumnVisibility((prev) => ({
              ...prev,
              [colId]: prev[colId] === false ? true : false,
            }));
          }}
          density={screenConfig.grid.density}
          onDensityChange={setDensity}
          formLayout={screenConfig.form.layout}
          onFormLayoutChange={setFormLayout}
          onRestoreDefaults={restoreDefaults}
          onClose={() => setIsScreenConfigModalOpen(false)}
          initialTab="grid"
        />
      )}
    </div>
  );
}

export default ServiceDesksPage;
