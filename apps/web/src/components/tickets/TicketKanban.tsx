import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Ticket, TicketStatus, TicketsPage } from '../../hooks/useTickets';
import { TicketCard, statusLabels } from './TicketCard';
import { useAuthStore } from '../../stores/authStore';
import { EzAlert, EzSpinner, EzTag } from '../ds';

const columns: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'PENDING_CUSTOMER', 'PENDING_APPROVAL', 'ON_HOLD', 'RESOLVED', 'CLOSED'];

interface TicketKanbanProps {
  tickets: Ticket[];
  isLoading: boolean;
  isError: boolean;
}

export function TicketKanban({ tickets, isLoading, isError }: TicketKanbanProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { mutate } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}/status`, { status });
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
    onError: (err, newTicket, context) => {
      context?.previousQueries?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return; // Same column

    // Optimistic update
    mutate({ id: draggableId, status: destination.droppableId as TicketStatus });
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col}
            className="w-80 shrink-0 space-y-4 rounded-lg border border-gray-100 bg-gray-80 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-600">
              {statusLabels[col]}
            </h3>
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white">
              <EzSpinner label={col === 'OPEN' ? 'Carregando...' : undefined} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <EzAlert variant="error">Falha ao carregar os chamados.</EzAlert>;
  }

  // Agrupa os chamados
  const grouped = columns.reduce((acc, col) => {
    acc[col] = tickets.filter((t) => t.status === col);
    return acc;
  }, {} as Record<TicketStatus, Ticket[]>);

  const isClient = user?.role === 'CLIENT';

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
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
  );
}
