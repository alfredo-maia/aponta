import type { TicketPriority, TicketStatus } from '../../hooks/useTickets';

export const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  PENDING_CUSTOMER: 'Aguardando Cliente',
  ON_HOLD: 'Aguardando Terceiros',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  ESCALATED: 'Escalonado',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

export const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const statusTagVariants: Record<
  TicketStatus,
  'ocean' | 'gray' | 'green' | 'yellow' | 'red' | 'petroleum' | 'outline'
> = {
  OPEN: 'ocean',
  IN_PROGRESS: 'yellow',
  PENDING_CUSTOMER: 'yellow',
  ON_HOLD: 'petroleum',
  PENDING_APPROVAL: 'petroleum',
  ESCALATED: 'red',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

export const priorityTagVariants: Record<
  TicketPriority,
  'ocean' | 'gray' | 'green' | 'yellow' | 'red' | 'petroleum' | 'outline'
> = {
  LOW: 'gray',
  MEDIUM: 'ocean',
  HIGH: 'yellow',
  CRITICAL: 'red',
};

