import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Unlink, Link2, GitFork, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Ticket } from '../../hooks/useTickets';
import { statusLabels, statusTagVariants } from './TicketCard';
import { EzButton, EzTag, EzTextInput } from '../ds';

export function TicketParentChild({ ticket }: { ticket: Ticket }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAgentOrAdmin = ['AGENT', 'AGENT_MASTER', 'ADMIN'].includes(user?.role as string);

  const [parentProtocol, setParentProtocol] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const mutation = useMutation({
    mutationFn: (protocol: string | null) =>
      api.patch(`/tickets/${ticket.id}/parent`, { parentProtocol: protocol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticket.id] });
      setIsEditing(false);
      setParentProtocol('');
    },
  });

  const isChild = !!ticket.parentTicketId;
  const hasChildren = ticket.subTickets && ticket.subTickets.length > 0;

  if (!isAgentOrAdmin) return null;

  return (
    <section className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-80 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {hasChildren ? <GitFork className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          Agrupamento de Chamados
        </h2>
      </div>

      {isChild && ticket.parentTicket && (
        <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-100/40 p-3">
          <div className="flex items-center gap-3">
            <span className="rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs font-bold text-brand-600">
              {ticket.parentTicket.protocol}
            </span>
            <a
              href={`/app/tickets/${ticket.parentTicket.id}`}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              {ticket.parentTicket.title}
            </a>
            <EzTag
              label={statusLabels[ticket.parentTicket.status]}
              variant={statusTagVariants[ticket.parentTicket.status]}
            />
          </div>
          <EzButton
            type="button"
            variant="tertiary"
            size="small"
            leftIcon={Unlink}
            onClick={() => mutation.mutate(null)}
            disabled={mutation.isPending}
            className="!text-red-600 hover:!text-red-700"
          >
            Desvincular
          </EzButton>
        </div>
      )}

      {!isChild && !hasChildren && !isEditing && (
        <p className="flex items-center gap-2 text-xs text-gray-500">
          Este chamado não está vinculado.
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="cursor-pointer font-medium text-brand-600 hover:underline"
          >
            Vincular a um chamado Pai
          </button>
        </p>
      )}

      {!isChild && (isEditing || hasChildren) && (
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(parentProtocol);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <EzTextInput
                id="parent-protocol"
                className="[&_input]:pl-9"
                placeholder="Digite o protocolo AP-202X-... e aperte Enter"
                value={parentProtocol}
                onChange={(e) => setParentProtocol(e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            {mutation.isError && (
              <AlertCircle className="h-5 w-5 text-red-500" aria-label="Erro ao vincular" />
            )}
          </form>

          {hasChildren && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Este é o Chamado Pai de {ticket.subTickets?.length || 0} Solicitações:
              </h3>
              <ul className="space-y-2">
                {ticket.subTickets?.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/app/tickets/${sub.id}`}
                          className="font-mono text-xs font-bold text-gray-500 transition-colors hover:text-brand-600"
                        >
                          {sub.protocol}
                        </a>
                        <span className="max-w-[200px] truncate font-medium text-gray-900 sm:max-w-md">
                          {sub.title}
                        </span>
                      </div>
                      <EzTag
                        label={statusLabels[sub.status]}
                        variant={statusTagVariants[sub.status]}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
