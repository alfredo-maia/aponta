import { ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart,
  DroppableProvidedProps,
} from '@hello-pangea/dnd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Ticket, TicketStatus, TicketsPage } from '../../hooks/useTickets';
import type { DeskStage } from '../MesaStagesEditor';
import { statusLabels, priorityLabels } from './TicketCard';
import { TicketKanbanCard } from './TicketKanbanCard';
import { useAuthStore } from '../../stores/authStore';
import { EzAlert, EzAvatar, EzSpinner, EzTag } from '../ds';
import { cn } from '../ds/utils';
import { useUserScreenConfig } from '../../hooks/useUserScreenConfig';

const statusColumns: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'ESCALATED',
  'PENDING_CUSTOMER',
  'PENDING_APPROVAL',
  'ON_HOLD',
  'RESOLVED',
  'CLOSED',
];

/** "Ordenar" fields (D6b) — only fields that exist in the Aponta ticket model. */
const SORT_FIELDS: { id: string; label: string }[] = [
  { id: 'title', label: 'Título' },
  { id: 'protocol', label: 'Número' },
  { id: 'agent', label: 'Responsável' },
  { id: 'priority', label: 'Prioridade' },
  { id: 'resolveDeadline', label: 'Vencimento de solução' },
  { id: 'responseDeadline', label: 'Vencimento de atendimento' },
  { id: 'createdAt', label: 'Data de criação' },
  { id: 'status', label: 'Status' },
  { id: 'updatedAt', label: 'Data de atualização' },
];

const PRIORITY_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
const STATUS_RANK: Record<string, number> = Object.fromEntries(
  statusColumns.map((status, index) => [status, index]),
);

function sortValue(ticket: Ticket, field: string): string | number {
  switch (field) {
    case 'title':
      return ticket.title.toLowerCase();
    case 'protocol':
      return ticket.protocol.toLowerCase();
    case 'agent':
      return (ticket.agent?.name ?? '').toLowerCase();
    case 'priority':
      return PRIORITY_RANK[ticket.priority] ?? 0;
    case 'status':
      return STATUS_RANK[ticket.status] ?? 0;
    case 'resolveDeadline':
      return ticket.resolveDeadline ? new Date(ticket.resolveDeadline).getTime() : 0;
    case 'responseDeadline':
      return ticket.responseDeadline ? new Date(ticket.responseDeadline).getTime() : 0;
    case 'createdAt':
      return new Date(ticket.createdAt).getTime();
    case 'updatedAt':
      return new Date(ticket.updatedAt).getTime();
    default:
      return 0;
  }
}

/** Reorders cards within a column (D6b) — purely cosmetic, never re-fetches. */
function applySort(list: Ticket[], field: string | null, dir: 'asc' | 'desc'): Ticket[] {
  if (!field) return list;
  const sorted = [...list].sort((a, b) => {
    const va = sortValue(a, field);
    const vb = sortValue(b, field);
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

/**
 * Synthetic column id for tickets with no recognized current stage on the
 * selected mesa — either `ticket.stageId` is null, or it points at a stage
 * that doesn't belong to this mesa's current stage list (e.g. deleted
 * stage). Not a real `TicketStage.id`. The backend has no "unset stage"
 * operation, so this column never accepts a drop — but its cards ARE
 * draggable OUT to the mesa's initial stage(s), since the backend allows
 * that exact move for a stageless ticket (see `getAllowedStageIds`).
 */
const NO_STAGE_COLUMN_ID = '__NO_STAGE__';

interface ServiceDesk {
  id: string;
  name: string;
}

interface TicketKanbanProps {
  tickets: Ticket[];
  isLoading: boolean;
  isError: boolean;
  /**
   * Mesa (service desk) inicial, usada apenas para semear a seleção do
   * seletor de Mesa dedicado do Kanban (ex. ao chegar de um link do
   * Dashboard com `?serviceDeskId=...`). Depois da primeira renderização, a
   * escolha de mesa vive inteiramente dentro do Kanban — como no TiFlux,
   * onde o seletor "Mesa: <nome>" do quadro é independente de qualquer
   * filtro da tela de Lista — e não é mais sincronizada com o filtro
   * "Departamento" de `TicketFilters`.
   */
  initialServiceDeskId?: string;
}

/**
 * Estágios para os quais é permitido mover `ticket`, espelhando a regra que
 * `TicketsService.changeStage` aplica no backend: um ticket com estágio
 * reconhecido só pode se mover para um estágio presente em
 * `transitionToIds` do seu estágio atual (dados de `TicketStageTransition`,
 * os mesmos retornados por `GET /service-desks/:id/stages`); um ticket SEM
 * estágio reconhecido só pode ir para um estágio `isInitial` (mesma regra
 * do backend para `existing.stageId` nulo).
 */
function getAllowedStageIds(ticket: Ticket, stages: DeskStage[]): Set<string> {
  const currentStage = ticket.stageId
    ? stages.find((stage) => stage.id === ticket.stageId)
    : undefined;
  if (currentStage) return new Set(currentStage.transitionToIds);
  // No recognized current stage: only the mesa's initial stage(s) are valid targets.
  return new Set(
    stages.filter((stage) => stage.isInitial).map((stage) => stage.id),
  );
}

/** The column id a ticket belongs to in stage mode: its own stage id when
 * recognized on this mesa, or the `NO_STAGE_COLUMN_ID` bucket otherwise. */
function stageColumnIdFor(ticket: Ticket, stages: DeskStage[]): string {
  const recognized =
    Boolean(ticket.stageId) &&
    stages.some((stage) => stage.id === ticket.stageId);
  return recognized ? (ticket.stageId as string) : NO_STAGE_COLUMN_ID;
}

/** Extracts a user-facing message from a failed stage-change call,
 * preferring the backend's own validation message (e.g. "Transição de
 * estágio não permitida") when present. */
function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)
      ?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Não foi possível mover o chamado. Tente novamente.';
}

/** TiFlux parity: a collapsed column shrinks to a thin strip (no ticket
 * list), with its label rotated vertically and a chevron to re-expand. It
 * still renders the Droppable's ref/props (required by @hello-pangea/dnd
 * even while `isDropDisabled`) but never accepts a drop while collapsed. */
function CollapsedColumn({
  label,
  count,
  onExpand,
  droppableRef,
  droppableProps,
  placeholder,
}: {
  label: string;
  count: number;
  onExpand: () => void;
  droppableRef: (element: HTMLElement | null) => void;
  droppableProps: DroppableProvidedProps;
  placeholder: ReactNode;
}) {
  return (
    <div
      ref={droppableRef}
      {...droppableProps}
      className="flex w-12 shrink-0 flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-80 p-2"
    >
      <button
        type="button"
        onClick={onExpand}
        className="text-gray-400 hover:text-gray-700 cursor-pointer"
        title="Expandir coluna"
        data-testid="expand-column"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
      <EzTag label={String(count)} variant="gray" className="!px-1.5 !py-0.5" />
      <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-semibold text-gray-900 py-1 whitespace-nowrap">
        {label}
      </span>
      {placeholder}
    </div>
  );
}

/** TiFlux parity: a quick-add link at the bottom of each (expanded) Kanban
 * column — same destination as the Grid toolbar's "+" action. */
function NewTicketButton() {
  return (
    <Link
      to="/tickets/new"
      className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-[12px] font-medium text-gray-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
    >
      <Plus className="w-3.5 h-3.5" />
      Abrir novo ticket
    </Link>
  );
}

export function TicketKanban({
  tickets,
  isLoading,
  isError,
  initialServiceDeskId,
}: TicketKanbanProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isClient = user?.role === 'CLIENT';

  // Dedicated Mesa selector (TiFlux parity): lives entirely inside the
  // Kanban, independent of the "Departamento" filter used by Lista/Grade.
  // Seeded once from `initialServiceDeskId`; further changes come only from
  // the dropdown below, not from the parent re-rendering with a new prop.
  const [selectedDeskId, setSelectedDeskId] = useState<string>(
    initialServiceDeskId ?? '',
  );
  const stageMode = Boolean(selectedDeskId);

  // D6c "Configurações": Agrupar por (Estágio padrão, Status, Responsável,
  // Prioridade), persisted per user. "Estágio" only applies while a Mesa is
  // selected — falls back to "Status" otherwise (same as the pre-D6c
  // behavior), so switching Mesa off never leaves the board stuck on an
  // ungroupable dimension.
  const { config: kanbanConfig, setGroupBy } = useUserScreenConfig('tickets-kanban', {
    groupBy: 'stage',
  });
  const groupBy = kanbanConfig.groupBy || 'stage';
  const effectiveGroupBy = groupBy === 'stage' && !stageMode ? 'status' : groupBy;

  // D6a: fila de avatares dos agentes presentes no board inteiro (não só os
  // visíveis após outros filtros), clique alterna filtro por agente (multi).
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const presentAgents = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    tickets.forEach((t) => {
      if (t.agent) byId.set(t.agent.id, t.agent);
    });
    return Array.from(byId.values());
  }, [tickets]);
  const toggleAgentFilter = (agentId: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };
  const visibleTickets = useMemo(
    () =>
      selectedAgentIds.size === 0
        ? tickets
        : tickets.filter((t) => t.agentId && selectedAgentIds.has(t.agentId)),
    [tickets, selectedAgentIds],
  );

  // D6b "Ordenar": reorders cards within each column; purely client-side,
  // not persisted (session-local).
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);
  const handleSortFieldClick = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const { data: serviceDesks = [] } = useQuery({
    queryKey: ['service-desks'],
    queryFn: async () => {
      const { data } = await api.get<ServiceDesk[]>('/service-desks');
      return data;
    },
  });

  const [dropError, setDropError] = useState<string | null>(null);
  // Set of column ids the currently-dragged card may be dropped on
  // (including its own origin column, so same-column reordering/no-op stays
  // enabled). `null` while nothing is being dragged.
  const [draggingAllowedColumnIds, setDraggingAllowedColumnIds] =
    useState<Set<string> | null>(null);

  // TiFlux parity: columns (status or stage) can be individually collapsed
  // to a thin strip, independent of which mesa/mode is active. Keyed by
  // column id, so the set is naturally shared across both render modes.
  const [collapsedColumnIds, setCollapsedColumnIds] = useState<Set<string>>(
    new Set(),
  );
  const toggleColumnCollapsed = (columnId: string) => {
    setCollapsedColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  };

  const {
    data: stages = [],
    isLoading: isStagesLoading,
    isError: isStagesError,
  } = useQuery({
    queryKey: ['service-desk-stages', selectedDeskId],
    queryFn: async () => {
      const { data } = await api.get<DeskStage[]>(
        `/service-desks/${selectedDeskId}/stages`,
      );
      return data;
    },
    enabled: stageMode,
  });

  const { mutate: mutateStatus } = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: TicketStatus;
    }) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}/status`, {
        status,
      });
      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      const previousQueries = queryClient.getQueriesData<TicketsPage>({
        queryKey: ['tickets'],
      });
      queryClient.setQueriesData<TicketsPage>(
        { queryKey: ['tickets'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((t) => (t.id === id ? { ...t, status } : t)),
          };
        },
      );
      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      context?.previousQueries?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const { mutate: mutateStage } = useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}/stage`, {
        stageId,
      });
      return data;
    },
    onMutate: async ({ id, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      const previousQueries = queryClient.getQueriesData<TicketsPage>({
        queryKey: ['tickets'],
      });
      queryClient.setQueriesData<TicketsPage>(
        { queryKey: ['tickets'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((t) => (t.id === id ? { ...t, stageId } : t)),
          };
        },
      );
      return { previousQueries };
    },
    onError: (err, _vars, context) => {
      context?.previousQueries?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      setDropError(extractErrorMessage(err));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const onDragStart = (start: DragStart) => {
    if (!stageMode) return;
    const ticket = tickets.find((t) => t.id === start.draggableId);
    if (!ticket) return;
    const allowed = getAllowedStageIds(ticket, stages);
    allowed.add(start.source.droppableId);
    setDraggingAllowedColumnIds(allowed);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    setDraggingAllowedColumnIds(null);

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return; // Same column: no-op

    if (!stageMode) {
      mutateStatus({
        id: draggableId,
        status: destination.droppableId as TicketStatus,
      });
      return;
    }

    if (destination.droppableId === NO_STAGE_COLUMN_ID) return; // No backend operation to unset a stage

    const ticket = tickets.find((t) => t.id === draggableId);
    if (!ticket) return;

    const allowed = getAllowedStageIds(ticket, stages);
    if (!allowed.has(destination.droppableId)) {
      setDropError('Transição de estágio não permitida para este chamado.');
      return;
    }
    setDropError(null);
    mutateStage({ id: draggableId, stageId: destination.droppableId });
  };

  // TiFlux parity: a dedicated "Mesa" dropdown above the columns, always
  // visible regardless of loading/error/fallback state, so switching mesas
  // never requires leaving the Kanban.
  const mesaSelector = (
    <div className="max-w-xs">
      <label htmlFor="kanban-mesa-select" className="sr-only">
        Mesa
      </label>
      <select
        id="kanban-mesa-select"
        data-testid="kanban-mesa-select"
        value={selectedDeskId}
        onChange={(e) => setSelectedDeskId(e.target.value)}
        className="h-[38px] w-full rounded-[10px] border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-900 hover:border-gray-300 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
      >
        <option value="">Mesa: Todas</option>
        {serviceDesks.map((desk) => (
          <option key={desk.id} value={desk.id}>
            Mesa: {desk.name}
          </option>
        ))}
      </select>
    </div>
  );

  // D6a: fila de avatares (clique alterna filtro por agente, multi).
  const agentAvatarRow = presentAgents.length > 0 && (
    <div className="flex items-center -space-x-1.5" role="group" aria-label="Filtrar por responsável">
      {presentAgents.map((agent) => (
        <button
          key={agent.id}
          type="button"
          aria-label={`Filtrar por ${agent.name}`}
          aria-pressed={selectedAgentIds.has(agent.id)}
          onClick={() => toggleAgentFilter(agent.id)}
          className={cn(
            'rounded-full ring-2 ring-white transition-transform hover:z-10 hover:scale-110',
            selectedAgentIds.has(agent.id) && 'ring-brand-500',
          )}
        >
          <EzAvatar name={agent.name} size={28} />
        </button>
      ))}
    </div>
  );

  // D6b "Ordenar": popover with one button per sortable field + Limpar.
  const sortMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsSortMenuOpen((prev) => !prev)}
        className="flex h-[38px] items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-90"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        Ordenar
      </button>
      {isSortMenuOpen && (
        <div className="absolute z-20 mt-1 w-64 rounded-[10px] border border-gray-200 bg-white p-2 shadow-md">
          <p className="px-1 pb-1 text-[12px] font-semibold text-gray-500">
            Ordenar os cards por
          </p>
          {SORT_FIELDS.map((field) => (
            <button
              key={field.id}
              type="button"
              onClick={() => handleSortFieldClick(field.id)}
              className="flex w-full items-center justify-between rounded-[6px] px-2 py-1.5 text-left text-[13px] text-gray-700 hover:bg-gray-80"
            >
              {field.label}
              {sortField === field.id && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSortField(null)}
            className="mt-1 w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50"
          >
            Limpar ordenação
          </button>
        </div>
      )}
    </div>
  );

  // D6c "Configurações": por ora, Agrupar por (Exibir campos do card fica
  // fora desta rodada — ver comentário no report do SPEC).
  const configMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsConfigMenuOpen((prev) => !prev)}
        className="flex h-[38px] items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-90"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Configurações
      </button>
      {isConfigMenuOpen && (
        <div className="absolute z-20 mt-1 w-64 rounded-[10px] border border-gray-200 bg-white p-2 shadow-md">
          <label htmlFor="kanban-group-by" className="px-1 text-[12px] font-semibold text-gray-500">
            Agrupar por
          </label>
          <select
            id="kanban-group-by"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="mt-1 h-[34px] w-full rounded-[8px] border border-gray-200 bg-white px-2 text-[13px] text-gray-900"
          >
            <option value="stage">Estágio</option>
            <option value="status">Status</option>
            <option value="agent">Responsável</option>
            <option value="priority">Prioridade</option>
          </select>
        </div>
      )}
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      {mesaSelector}
      {agentAvatarRow}
      {sortMenu}
      {configMenu}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {mesaSelector}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statusColumns.map((col) => (
            <div
              key={col}
              className="w-80 shrink-0 space-y-4 rounded-lg border border-gray-100 bg-gray-80 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-600">
                {statusLabels[col]}
              </h3>
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white">
                <EzSpinner
                  label={col === 'OPEN' ? 'Carregando...' : undefined}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        {mesaSelector}
        <EzAlert variant="error">Falha ao carregar os chamados.</EzAlert>
      </div>
    );
  }

  if (stageMode && isStagesLoading) {
    return (
      <div className="space-y-3">
        {mesaSelector}
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white">
          <EzSpinner label="Carregando estágios da mesa…" />
        </div>
      </div>
    );
  }

  if (stageMode && isStagesError) {
    return (
      <div className="space-y-3">
        {mesaSelector}
        <EzAlert variant="error">
          Falha ao carregar os estágios desta mesa.
        </EzAlert>
      </div>
    );
  }

  if (effectiveGroupBy === 'stage') {
    const orderedStages = [...stages].sort((a, b) => a.position - b.position);
    const hasInitialStage = stages.some((stage) => stage.isInitial);
    const stageColumns = orderedStages.map((stage) => ({
      id: stage.id,
      label: stage.name,
      tickets: applySort(visibleTickets.filter((t) => t.stageId === stage.id), sortField, sortDir),
    }));
    stageColumns.push({
      id: NO_STAGE_COLUMN_ID,
      label: 'Sem estágio',
      tickets: applySort(
        visibleTickets.filter(
          (t) => stageColumnIdFor(t, stages) === NO_STAGE_COLUMN_ID,
        ),
        sortField,
        sortDir,
      ),
    });

    return (
      <div className="space-y-3">
        {toolbar}
        {dropError && (
          <EzAlert variant="error" onClose={() => setDropError(null)}>
            {dropError}
          </EzAlert>
        )}
        {stages.length === 0 && (
          <EzAlert variant="info">
            Esta mesa ainda não possui estágios configurados.
          </EzAlert>
        )}
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {stageColumns.map((col) => {
              const isCollapsed = collapsedColumnIds.has(col.id);
              const isUnreachableWhileDragging =
                draggingAllowedColumnIds !== null &&
                !draggingAllowedColumnIds.has(col.id);
              const dropDisabled =
                isClient ||
                col.id === NO_STAGE_COLUMN_ID ||
                isUnreachableWhileDragging ||
                isCollapsed;

              return (
                <Droppable
                  key={col.id}
                  droppableId={col.id}
                  isDropDisabled={dropDisabled}
                >
                  {(provided, snapshot) =>
                    isCollapsed ? (
                      <CollapsedColumn
                        label={col.label}
                        count={col.tickets.length}
                        onExpand={() => toggleColumnCollapsed(col.id)}
                        droppableRef={provided.innerRef}
                        droppableProps={provided.droppableProps}
                        placeholder={provided.placeholder}
                      />
                    ) : (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex w-80 shrink-0 flex-col gap-3 rounded-lg border p-4 min-h-[500px] transition-colors',
                          snapshot.isDraggingOver && !dropDisabled
                            ? 'border-brand-500 bg-brand-100/30 ring-1 ring-brand-200'
                            : 'border-gray-200 bg-gray-80',
                          isUnreachableWhileDragging && 'opacity-50',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleColumnCollapsed(col.id)}
                            className="flex items-center gap-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                            title="Recolher coluna"
                            data-testid={`collapse-column-${col.id}`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <h3 className="flex-1 text-sm font-semibold text-gray-900">
                            {col.label}
                          </h3>
                          <EzTag
                            label={String(col.tickets.length)}
                            variant="gray"
                            className="!px-2 !py-0.5"
                          />
                        </div>

                        <div className="flex flex-1 flex-col gap-3">
                          {col.tickets.map((ticket, index) => {
                            // Unstaged tickets ("Sem estágio") ARE draggable when the mesa has an
                            // initial stage: the backend allows moving a stageless ticket there
                            // (TicketsService.changeStage), so getAllowedStageIds mirrors that.
                            const isDraggable =
                              col.id !== NO_STAGE_COLUMN_ID || hasInitialStage;
                            return (
                              <Draggable
                                key={ticket.id}
                                draggableId={ticket.id}
                                index={index}
                                isDragDisabled={isClient || !isDraggable}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={`${dragSnapshot.isDragging ? 'opacity-70 rotate-2 scale-105' : ''} transition-transform`}
                                    style={dragProvided.draggableProps.style}
                                  >
                                    <TicketKanbanCard ticket={ticket} />
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                        {!isClient && <NewTicketButton />}
                      </div>
                    )
                  }
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    );
  }

  if (effectiveGroupBy === 'status') {
  // Groups by the generic `status` enum (visão "todas as mesas", ou Status
  // escolhido explicitamente em Configurações mesmo com uma Mesa ativa).
  const grouped = statusColumns.reduce(
    (acc, col) => {
      acc[col] = applySort(visibleTickets.filter((t) => t.status === col), sortField, sortDir);
      return acc;
    },
    {} as Record<TicketStatus, Ticket[]>,
  );

  return (
    <div className="space-y-3">
      {toolbar}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          {statusColumns.map((col) => {
            const isCollapsed = collapsedColumnIds.has(col);
            return (
              <Droppable
                key={col}
                droppableId={col}
                isDropDisabled={isClient || isCollapsed} // Clientes não podem mudar status arrastando (geralmente nem vêem o Kanban, mas só pra garantir)
              >
                {(provided, snapshot) =>
                  isCollapsed ? (
                    <CollapsedColumn
                      label={statusLabels[col]}
                      count={grouped[col].length}
                      onExpand={() => toggleColumnCollapsed(col)}
                      droppableRef={provided.innerRef}
                      droppableProps={provided.droppableProps}
                      placeholder={provided.placeholder}
                    />
                  ) : (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex w-80 shrink-0 flex-col gap-3 rounded-lg border p-4 min-h-[500px] transition-colors ${
                        snapshot.isDraggingOver
                          ? 'border-brand-500 bg-brand-100/30 ring-1 ring-brand-200'
                          : 'border-gray-200 bg-gray-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleColumnCollapsed(col)}
                          className="flex items-center gap-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                          title="Recolher coluna"
                          data-testid={`collapse-column-${col}`}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <h3 className="flex-1 text-sm font-semibold text-gray-900">
                          {statusLabels[col]}
                        </h3>
                        <EzTag
                          label={String(grouped[col].length)}
                          variant="gray"
                          className="!px-2 !py-0.5"
                        />
                      </div>

                      <div className="flex flex-1 flex-col gap-3">
                        {grouped[col].map((ticket, index) => (
                          <Draggable
                            key={ticket.id}
                            draggableId={ticket.id}
                            index={index}
                            // Disable drag for clients or closed tickets if needed
                            isDragDisabled={
                              isClient || ticket.status === 'CLOSED'
                            }
                          >
                            {(provided, dragSnapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`${dragSnapshot.isDragging ? 'opacity-70 rotate-2 scale-105' : ''} transition-transform`}
                                style={provided.draggableProps.style}
                              >
                                <TicketKanbanCard ticket={ticket} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                      {!isClient && <NewTicketButton />}
                    </div>
                  )
                }
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
  }

  // D6c: Agrupar por Responsável ou Prioridade — visão somente leitura
  // (nenhuma dessas dimensões tem uma operação de arrastar-para-mudar no
  // backend atual, diferente de Estágio/Status).
  const dynamicColumns =
    effectiveGroupBy === 'agent'
      ? (() => {
          const byAgent = new Map<string, { label: string; tickets: Ticket[] }>();
          visibleTickets.forEach((t) => {
            const key = t.agent?.id ?? '__unassigned__';
            const label = t.agent?.name ?? 'Não atribuído';
            const bucket = byAgent.get(key) ?? { label, tickets: [] };
            bucket.tickets.push(t);
            byAgent.set(key, bucket);
          });
          return Array.from(byAgent.entries()).map(([id, { label, tickets: colTickets }]) => ({
            id,
            label,
            tickets: applySort(colTickets, sortField, sortDir),
          }));
        })()
      : (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => ({
          id: priority,
          label: priorityLabels[priority],
          tickets: applySort(
            visibleTickets.filter((t) => t.priority === priority),
            sortField,
            sortDir,
          ),
        }));

  return (
    <div className="space-y-3">
      {toolbar}
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {dynamicColumns.map((col) => (
          <div
            key={col.id}
            className="flex w-80 shrink-0 flex-col gap-3 rounded-lg border border-gray-200 bg-gray-80 p-4 min-h-[500px]"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex-1 text-sm font-semibold text-gray-900">{col.label}</h3>
              <EzTag label={String(col.tickets.length)} variant="gray" className="!px-2 !py-0.5" />
            </div>
            <div className="flex flex-1 flex-col gap-3">
              {col.tickets.map((ticket) => (
                <TicketKanbanCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
