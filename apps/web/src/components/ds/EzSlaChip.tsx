import { CheckCircle2, MessageCircle } from 'lucide-react';
import type { SlaStatus } from '../../hooks/useTickets';
import { cn } from './utils';

export interface EzSlaChipProps {
  /** Qual prazo o chip representa: primeira resposta ou resolução. */
  kind: 'response' | 'resolve';
  /** Estado calculado pelo backend (`responseSlaStatus`/`resolveSlaStatus`). */
  status: SlaStatus | null | undefined;
  /** Prazo ISO; sem ele o chip mostra só o ícone e o estado. */
  deadline?: string | null;
  /** Relógio injetável para testes. */
  now?: Date;
}

/** Pares [texto, fundo] de token por estado; o teste confere contraste AA (4.5:1). */
export const slaChipTokenPairs: Record<SlaStatus, [string, string]> = {
  ON_TRACK: ['green-800', 'green-100'],
  AT_RISK: ['yellow-800', 'yellow-100'],
  BREACHED: ['red-800', 'red-100'],
};

const STATE = {
  ON_TRACK: { text: 'dentro do prazo', className: 'bg-green-100 text-green-800' },
  AT_RISK: { text: 'em risco', className: 'bg-yellow-100 text-yellow-800' },
  BREACHED: { text: 'vencido', className: 'bg-red-100 text-red-800' },
} satisfies Record<SlaStatus, { text: string; className: string }>;

function formatRemaining(ms: number): string {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(abs / 3600000);
  if (hours >= 1) return `${hours}h${String(Math.floor((abs % 3600000) / 60000)).padStart(2, '0')}`;
  return `${Math.floor(abs / 60000)}min`;
}

/**
 * Chip compacto de prazo (SLA): ícone + tempo restante (negativo = vencido),
 * cor semântica do DS e o texto completo no nome acessível e no tooltip.
 * Não renderiza nada sem estado, então pode ser usado sem condicional.
 */
export function EzSlaChip({ kind, status, deadline, now = new Date() }: EzSlaChipProps) {
  if (!status) return null;

  const { text, className } = STATE[status];
  const kindLabel = kind === 'response' ? 'Resposta' : 'Resolução';
  const Icon = kind === 'response' ? MessageCircle : CheckCircle2;
  const remaining = deadline ? new Date(deadline).getTime() - now.getTime() : null;
  const time = remaining === null ? null : formatRemaining(remaining);
  const label =
    time === null
      ? `${kindLabel}: ${text}`
      : status === 'BREACHED'
        ? `${kindLabel}: ${text} há ${time}`
        : `${kindLabel}: ${text}, vence em ${time}`;

  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium leading-none',
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {time !== null && (remaining !== null && remaining < 0 ? `-${time}` : time)}
    </span>
  );
}

export default EzSlaChip;
