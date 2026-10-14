import {
  ServiceDeskSectionKey,
  TicketPriority,
} from '@prisma/client';

export const DEFAULT_DESK_PRIORITIES: {
  ticketPriority: TicketPriority;
  label: string;
  icon: string;
  sortOrder: number;
  enabled: boolean;
}[] = [
  { ticketPriority: TicketPriority.CRITICAL, label: 'Crítica', icon: 'critical', sortOrder: 0, enabled: true },
  { ticketPriority: TicketPriority.HIGH, label: 'Alta', icon: 'high', sortOrder: 1, enabled: true },
  { ticketPriority: TicketPriority.MEDIUM, label: 'Média', icon: 'medium', sortOrder: 2, enabled: true },
  { ticketPriority: TicketPriority.LOW, label: 'Baixa', icon: 'low', sortOrder: 3, enabled: true },
];

const ENABLED_SECTIONS = new Set<ServiceDeskSectionKey>([
  ServiceDeskSectionKey.GENERAL_INFO,
  ServiceDeskSectionKey.CATEGORY,
  ServiceDeskSectionKey.WORKLOGS,
  ServiceDeskSectionKey.COMMUNICATION,
  ServiceDeskSectionKey.APPOINTMENTS,
  ServiceDeskSectionKey.VALUATION,
  ServiceDeskSectionKey.HISTORY,
]);

export const DEFAULT_DESK_SECTIONS: {
  key: ServiceDeskSectionKey;
  enabled: boolean;
  sortOrder: number;
}[] = (
  Object.values(ServiceDeskSectionKey) as ServiceDeskSectionKey[]
).map((key, sortOrder) => ({
  key,
  enabled: ENABLED_SECTIONS.has(key),
  sortOrder,
}));

export const DESK_INCLUDE = {
  agents: { select: { id: true, name: true, email: true } },
  organizations: { select: { id: true, name: true } },
  agentGroups: { select: { id: true, name: true, organizationId: true } },
  priorities: { orderBy: { sortOrder: 'asc' as const } },
  ticketSections: { orderBy: { sortOrder: 'asc' as const } },
};
