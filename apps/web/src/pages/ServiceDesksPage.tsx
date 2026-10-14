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
import { MesaFlagEditor } from '../components/MesaFlagEditor';
import {
  EzAlert,
  EzButton,
  EzCardItem,
  EzCheck,
  EzEmptyCard,
  EzEntityScreenConfigModal,
  EzEntityToolbar,
  EzSpinner,
  EzTabs,
  EzTextInput,
} from '../components/ds';
import { EzEntityGrid } from '../components/ds/EzEntityGrid';
import { useUserScreenConfig } from '../hooks/useUserScreenConfig';

interface ServiceDesk {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  active?: boolean;
  acceptingNewTickets?: boolean;
  agents?: { id: string; name: string }[];
  organizations?: { id: string; name: string }[];
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
  defaultOpenStatus?: string;
  defaultClosedStatus?: string;
  reviewType?: string | null;
  reviewDeadlineDays?: number | null;
  priorities?: { id: string; ticketPriority: string; label: string; enabled: boolean }[];
  ticketSections?: { id: string; key: string; enabled: boolean; sortOrder: number }[];
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
      accessorKey: 'displayName',
      header: 'Nome de exibição',
      cell: ({ row }) => row.original.displayName || '—',
    },
    {
      id: 'active',
      header: 'Ativa',
      cell: ({ row }) => (row.original.active === false ? 'Não' : 'Sim'),
    },
    {
      id: 'accepting',
      header: 'Recebendo',
      cell: ({ row }) => (row.original.acceptingNewTickets === false ? 'Não' : 'Sim'),
    },
    {
      id: 'organization',
      header: 'Clientes',
      cell: ({ row }) =>
        row.original.organizations?.map((org) => org.name).join(', ') ||
        row.original.organization?.name ||
        '—',
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
  const [activeTab, setActiveTab] = useState('basics');

  const mesaTabs = [
    { id: 'basics', label: 'Informações básicas' },
    { id: 'params', label: 'Parâmetros' },
    { id: 'required', label: 'Campos obrigatórios' },
    { id: 'priorities', label: 'Prioridades' },
    { id: 'clients', label: 'Clientes' },
    { id: 'groups', label: 'Grupos de atendentes' },
    { id: 'stages', label: 'Estágio', disabled: true },
    { id: 'status', label: 'Status' },
    { id: 'reopen', label: 'Reabertura' },
    { id: 'sections', label: 'Seções do ticket' },
    { id: 'review', label: 'Revisão' },
    { id: 'hours', label: 'Expediente' },
  ];

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
    setActiveTab('basics');
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
    const confirmMsg = `Deseja excluir ${selectedDesks.length} mesa(s) selecionada(s)?`;
    if (window.confirm(confirmMsg)) {
      selectedDesks.forEach((desk) => deleteMutation.mutate(desk.id));
      setSelectedDesks([]);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-[20px] font-semibold text-gray-900">Mesa</h1>
        <p className="text-sm text-gray-500">
          Você não tem permissão para ver esta página. Somente
          administradores podem gerenciar mesas.
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
      <h1 className="text-[20px] font-semibold text-gray-900">Mesa</h1>

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
            insertAriaLabel="Nova Mesa"
            insertTooltip="Nova Mesa"
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
                    <EzAlert variant="error">Falha ao criar a mesa. Tente novamente.</EzAlert>
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
                  <EzTabs
                    tabs={mesaTabs}
                    activeTab={activeTab}
                    onChange={(tabId) => setActiveTab(String(tabId))}
                  />
                  <EzCardItem flat className="p-4">
                    {activeTab === 'basics' && (
                      <>
                        <form
                          className="mb-4 space-y-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const form = event.currentTarget;
                            const displayName = (form.elements.namedItem('displayName') as HTMLInputElement).value;
                            const description = (form.elements.namedItem('description') as HTMLInputElement).value;
                            void api
                              .patch(`/service-desks/${activeDesk.id}`, { displayName, description })
                              .then(() =>
                                queryClient.invalidateQueries({ queryKey: ['service-desks'] }),
                              );
                          }}
                        >
                          <EzTextInput
                            id="mesa-display-name"
                            name="displayName"
                            label="Nome de exibição"
                            defaultValue={activeDesk.displayName ?? ''}
                          />
                          <EzTextInput
                            id="mesa-description"
                            name="description"
                            label="Descrição"
                            defaultValue={activeDesk.description ?? ''}
                          />
                          <div className="flex justify-end">
                            <EzButton type="submit" size="small">Salvar dados básicos</EzButton>
                          </div>
                        </form>
                        <MesaFlagEditor
                          deskId={activeDesk.id}
                          flags={[
                            { key: 'active', label: 'Ativa' },
                            { key: 'acceptingNewTickets', label: 'Recebendo novos tickets' },
                            { key: 'internalUse', label: 'Uso interno' },
                            { key: 'worklogsWithValuation', label: 'Apontamentos com valorização' },
                          ]}
                          values={activeDesk}
                        />
                      </>
                    )}
                    {(activeTab === 'basics' || activeTab === 'clients') && (
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
                    )}
                    {activeTab === 'groups' && (
                      <>
                        <MesaFlagEditor
                          deskId={activeDesk.id}
                          flags={[
                            { key: 'listedGroupsOnly', label: 'Somente grupos listados' },
                            { key: 'unlistedCanCreateTicket', label: 'Não listados podem criar ticket' },
                          ]}
                          values={activeDesk}
                        />
                        <ServiceDeskEditor desk={activeDesk} agents={agents ?? []} />
                      </>
                    )}
                    {activeTab === 'hours' && (
                      <BusinessHoursEditor serviceDeskId={activeDesk.id} />
                    )}
                    {activeTab === 'params' && (
                      <MesaFlagEditor
                        deskId={activeDesk.id}
                        flags={[
                          { key: 'allowCrossDeskInteraction', label: 'Interação com outras mesas' },
                          { key: 'allowCancelTicket', label: 'Permitir cancelar ticket' },
                          { key: 'catalogRequiredOnOpen', label: 'Catálogo obrigatório ao abrir' },
                          { key: 'slaControlEnabled', label: 'Controle de SLA' },
                          { key: 'allowAddSlaHours', label: 'Permitir adicionar horas ao SLA' },
                          { key: 'allowPauseResumeSla', label: 'Permitir parar e retomar o SLA' },
                          { key: 'reviewFlowEnabled', label: 'Fluxo de revisão' },
                          { key: 'evaluationEnabled', label: 'Avaliação' },
                          { key: 'openByAgentsOnly', label: 'Abertura só por atendentes' },
                        ]}
                        values={activeDesk}
                      />
                    )}
                    {activeTab === 'required' && (
                      <MesaFlagEditor
                        deskId={activeDesk.id}
                        flags={[
                          { key: 'requireRequesterName', label: 'Nome do solicitante' },
                          { key: 'requireRequesterEmail', label: 'E-mail do solicitante' },
                          { key: 'requireRequesterPhone', label: 'Telefone do solicitante' },
                          { key: 'requireRequesterExtension', label: 'Ramal do solicitante' },
                          { key: 'requireResourceGroup', label: 'Grupo de recurso' },
                          { key: 'requireAttachments', label: 'Anexos' },
                        ]}
                        values={activeDesk}
                      />
                    )}
                    {activeTab === 'reopen' && (
                      <MesaFlagEditor
                        deskId={activeDesk.id}
                        flags={[
                          { key: 'allowReopenUnbilled', label: 'Permitir reabrir não faturados' },
                          { key: 'allowReopenBilled', label: 'Permitir reabrir faturados' },
                        ]}
                        values={activeDesk}
                      />
                    )}
                    {activeTab === 'priorities' && (
                      <div className="space-y-2">
                        {(activeDesk.priorities ?? []).map((priority) => (
                          <EzCheck
                            key={priority.ticketPriority}
                            id={`mesa-priority-${priority.ticketPriority}`}
                            label={priority.label}
                            checked={priority.enabled}
                            onChange={() => {
                              void api
                                .patch(`/service-desks/${activeDesk.id}`, {
                                  priorities: [
                                    {
                                      ticketPriority: priority.ticketPriority,
                                      enabled: !priority.enabled,
                                    },
                                  ],
                                })
                                .then(() =>
                                  queryClient.invalidateQueries({ queryKey: ['service-desks'] }),
                                );
                            }}
                          />
                        ))}
                        {(activeDesk.priorities ?? []).length === 0 && (
                          <p className="text-sm text-gray-500">
                            Prioridades padrão são criadas ao cadastrar a mesa.
                          </p>
                        )}
                      </div>
                    )}
                    {activeTab === 'sections' && (
                      <div className="space-y-2">
                        {(activeDesk.ticketSections ?? []).map((section) => (
                          <EzCheck
                            key={section.key}
                            id={`mesa-section-${section.key}`}
                            label={section.key}
                            checked={section.enabled}
                            onChange={() => {
                              void api
                                .patch(`/service-desks/${activeDesk.id}`, {
                                  ticketSections: [
                                    { key: section.key, enabled: !section.enabled },
                                  ],
                                })
                                .then(() =>
                                  queryClient.invalidateQueries({ queryKey: ['service-desks'] }),
                                );
                            }}
                          />
                        ))}
                        {(activeDesk.ticketSections ?? []).length === 0 && (
                          <p className="text-sm text-gray-500">
                            Seções padrão são criadas ao cadastrar a mesa.
                          </p>
                        )}
                      </div>
                    )}
                    {activeTab === 'status' && (
                      <form
                        className="space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = event.currentTarget;
                          const defaultOpenStatus = (form.elements.namedItem('defaultOpenStatus') as HTMLSelectElement).value;
                          const defaultClosedStatus = (form.elements.namedItem('defaultClosedStatus') as HTMLSelectElement).value;
                          void api
                            .patch(`/service-desks/${activeDesk.id}`, {
                              defaultOpenStatus,
                              defaultClosedStatus,
                            })
                            .then(() =>
                              queryClient.invalidateQueries({ queryKey: ['service-desks'] }),
                            );
                        }}
                      >
                        <label className="block text-sm">
                          <span className="mb-1 block text-gray-700">Status padrão ao abrir</span>
                          <select
                            name="defaultOpenStatus"
                            defaultValue={activeDesk.defaultOpenStatus ?? 'OPEN'}
                            className="w-full rounded-md border border-gray-200 px-3 py-2"
                          >
                            <option value="OPEN">Aberto</option>
                            <option value="IN_PROGRESS">Em andamento</option>
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block text-gray-700">Status padrão ao fechar</span>
                          <select
                            name="defaultClosedStatus"
                            defaultValue={activeDesk.defaultClosedStatus ?? 'CLOSED'}
                            className="w-full rounded-md border border-gray-200 px-3 py-2"
                          >
                            <option value="CLOSED">Fechado</option>
                            <option value="RESOLVED">Resolvido</option>
                          </select>
                        </label>
                        <div className="flex justify-end">
                          <EzButton type="submit" size="small">Salvar status</EzButton>
                        </div>
                      </form>
                    )}
                    {activeTab === 'review' && (
                      <MesaFlagEditor
                        deskId={activeDesk.id}
                        flags={[
                          { key: 'reviewNotifyEmail', label: 'Notificar revisão por e-mail' },
                          { key: 'reviewReminder', label: 'Lembrete de revisão' },
                          { key: 'reviewReapplyReopen', label: 'Reaplicar revisão na reabertura' },
                        ]}
                        values={activeDesk}
                      />
                    )}
                  </EzCardItem>
                </div>
              ) : null
            ) : (serviceDesks ?? []).length === 0 ? (
              <EzEmptyCard title="Nenhuma mesa cadastrada ainda." />
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
