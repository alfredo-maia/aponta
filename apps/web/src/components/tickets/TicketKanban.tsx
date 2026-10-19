import { useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart,
} from '@hello-pangea/dnd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../../lib/api';
import type { Ticket, TicketStatus, TicketsPage } from '../../hooks/useTickets';
import type { DeskStage } from '../MesaStagesEditor';
import { TicketCard, statusLabels } from './TicketCard';
import { useAuthStore } from '../../stores/authStore';
import { EzAlert, EzSpinner, EzTag } from '../ds';
import { cn } from '../ds/utils';

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

  if (stageMode) {
    const orderedStages = [...stages].sort((a, b) => a.position - b.position);
    const hasInitialStage = stages.some((stage) => stage.isInitial);
    const stageColumns = orderedStages.map((stage) => ({
      id: stage.id,
      label: stage.name,
      tickets: tickets.filter((t) => t.stageId === stage.id),
    }));
    stageColumns.push({
      id: NO_STAGE_COLUMN_ID,
      label: 'Sem estágio',
      tickets: tickets.filter(
        (t) => stageColumnIdFor(t, stages) === NO_STAGE_COLUMN_ID,
      ),
    });

    return (
      <div className="space-y-3">
        {mesaSelector}
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
              const isUnreachableWhileDragging =
                draggingAllowedColumnIds !== null &&
                !draggingAllowedColumnIds.has(col.id);
              const dropDisabled =
                isClient ||
                col.id === NO_STAGE_COLUMN_ID ||
                isUnreachableWhileDragging;

              return (
                <Droppable
                  key={col.id}
                  droppableId={col.id}
                  isDropDisabled={dropDisabled}
                >
                  {(provided, snapshot) => (
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
                        <h3 className="text-sm font-semibold text-gray-900">
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
                                  <TicketCard ticket={ticket} />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    );
  }

  // Fallback: no mesa selected — groups by the generic `status` enum (visão "todas as mesas").
  const grouped = statusColumns.reduce(
    (acc, col) => {
      acc[col] = tickets.filter((t) => t.status === col);
      return acc;
    },
    {} as Record<TicketStatus, Ticket[]>,
  );

  return (
    <div className="space-y-3">
      {mesaSelector}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          {statusColumns.map((col) => (
            <Droppable
              key={col}
              droppableId={col}
              isDropDisabled={isClient} // Clientes não podem mudar status arrastando (geralmente nem vêem o Kanban, mas só pra garantir)
            >
              {(provided, snapshot) => (
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
                    <h3 className="text-sm font-semibold text-gray-900">
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
                        isDragDisabled={isClient || ticket.status === 'CLOSED'}
                      >
                        {(provided, dragSnapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`${dragSnapshot.isDragging ? 'opacity-70 rotate-2 scale-105' : ''} transition-transform`}
                            style={provided.draggableProps.style}
                          >
                            <TicketCard ticket={ticket} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
