import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, TicketCheck } from 'lucide-react';
import { api } from '../../lib/api';
import type { TicketFiltersInput } from '../../hooks/useTickets';
import { EzBadge } from '../ds';

/** Perfis que podem liberar um ticket em Aguardando Aprovação (`changeStatus` na API). */
const AUTHORIZER_ROLES = ['ADMIN', 'AGENT_MASTER', 'CLIENT_MASTER'];

type ShortcutPatch = Pick<TicketFiltersInput, 'status' | 'closedOnly'>;

interface TicketShortcutsProps {
  role?: string;
  status?: TicketFiltersInput['status'];
  closedOnly?: boolean;
  onSelect: (patch: ShortcutPatch) => void;
}

const buttonClass = (active: boolean) =>
  `inline-flex h-[var(--control-height-compact)] min-w-0 items-center gap-2 rounded-control border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
    active
      ? 'border-brand-600 bg-brand-100/50 text-brand-700'
      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-90'
  }`;

/**
 * Atalhos da Lista de Tickets (SPEC DMTE-503): cada um liga e desliga um filtro
 * da própria lista (um por vez). O estado vem dos filtros, não de estado próprio,
 * então um link com `closedOnly` ou `status` na URL já abre o atalho ligado.
 */
export function TicketShortcuts({ role, status, closedOnly, onSelect }: TicketShortcutsProps) {
  const canAuthorize = AUTHORIZER_ROLES.includes(role ?? '');
  const closedActive = Boolean(closedOnly);
  const authorizationActive = status === 'PENDING_APPROVAL';

  const { data: authorizationTotal } = useQuery({
    queryKey: ['tickets', 'authorization-count'],
    queryFn: async () => {
      const { data } = await api.get<{ meta?: { total?: number } }>('/tickets', {
        params: { status: 'PENDING_APPROVAL', limit: 1 },
      });
      return data?.meta?.total ?? 0;
    },
    enabled: canAuthorize,
  });

  return (
    <div role="group" aria-label="Atalhos da lista" className="flex flex-wrap items-center gap-2">
      {canAuthorize && (
        <button
          type="button"
          aria-pressed={authorizationActive}
          className={buttonClass(authorizationActive)}
          onClick={() =>
            onSelect(
              authorizationActive
                ? { status: undefined }
                : { status: 'PENDING_APPROVAL', closedOnly: undefined },
            )
          }
        >
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          Autorizações
          <span aria-live="polite">
            {authorizationTotal ? (
              <EzBadge size="small" colorClass="bg-red-600 text-white" className="tabular-nums">
                {authorizationTotal}
              </EzBadge>
            ) : null}
          </span>
        </button>
      )}
      <button
        type="button"
        aria-pressed={closedActive}
        className={buttonClass(closedActive)}
        onClick={() =>
          onSelect(closedActive ? { closedOnly: undefined } : { closedOnly: true, status: undefined })
        }
      >
        <TicketCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        Tickets fechados
      </button>
    </div>
  );
}

export default TicketShortcuts;
