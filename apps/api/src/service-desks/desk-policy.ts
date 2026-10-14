import {
  Role,
  TicketPriority,
  TicketStatus,
  type ServiceDesk,
  type ServiceDeskPriority,
  type User,
} from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

export type DeskOpenContext = Pick<
  ServiceDesk,
  | 'active'
  | 'acceptingNewTickets'
  | 'internalUse'
  | 'openByAgentsOnly'
  | 'catalogRequiredOnOpen'
  | 'requireRequesterName'
  | 'requireRequesterEmail'
  | 'requireRequesterPhone'
  | 'requireRequesterExtension'
  | 'requireResourceGroup'
  | 'requireAttachments'
  | 'listedGroupsOnly'
  | 'unlistedCanCreateTicket'
> & {
  priorities?: Pick<ServiceDeskPriority, 'ticketPriority' | 'enabled'>[];
  agents?: { id: string }[];
  agentGroups?: { members?: { id: string }[] }[];
};

export function assertDeskAllowsOpen(params: {
  desk: DeskOpenContext;
  user: CurrentUserPayload;
  requester: Pick<User, 'name' | 'email' | 'phone' | 'extension'>;
  catalogItemId?: string;
  priority?: TicketPriority;
  resourceGroup?: string;
  attachmentCount: number;
}): void {
  const { desk, user, requester } = params;

  if (!desk.active) {
    throw new BadRequestException('Esta mesa está inativa.');
  }
  if (!desk.acceptingNewTickets) {
    throw new BadRequestException('Esta mesa não está recebendo novos tickets.');
  }
  if (desk.internalUse && (user.role === Role.CLIENT || user.role === Role.CLIENT_MASTER)) {
    throw new ForbiddenException('Esta mesa é de uso interno.');
  }
  if (
    desk.openByAgentsOnly &&
    (user.role === Role.CLIENT || user.role === Role.CLIENT_MASTER)
  ) {
    throw new ForbiddenException('Somente atendentes podem abrir tickets nesta mesa.');
  }
  if (desk.catalogRequiredOnOpen && !params.catalogItemId) {
    throw new BadRequestException('O item do catálogo é obrigatório nesta mesa.');
  }
  if (params.priority && desk.priorities) {
    const row = desk.priorities.find((p) => p.ticketPriority === params.priority);
    if (row && !row.enabled) {
      throw new BadRequestException('Esta prioridade não está habilitada nesta mesa.');
    }
  }
  if (desk.requireRequesterName && !requester.name?.trim()) {
    throw new BadRequestException('O nome do solicitante é obrigatório nesta mesa.');
  }
  if (desk.requireRequesterEmail && !requester.email?.trim()) {
    throw new BadRequestException('O e-mail do solicitante é obrigatório nesta mesa.');
  }
  if (desk.requireRequesterPhone && !requester.phone?.trim()) {
    throw new BadRequestException('O telefone do solicitante é obrigatório nesta mesa.');
  }
  if (desk.requireRequesterExtension && !requester.extension?.trim()) {
    throw new BadRequestException('O ramal do solicitante é obrigatório nesta mesa.');
  }
  if (desk.requireResourceGroup && !params.resourceGroup?.trim()) {
    throw new BadRequestException('O grupo de recurso é obrigatório nesta mesa.');
  }
  if (desk.requireAttachments && params.attachmentCount < 1) {
    throw new BadRequestException('Anexos são obrigatórios nesta mesa.');
  }

  if (desk.listedGroupsOnly && (user.role === Role.AGENT || user.role === Role.AGENT_MASTER)) {
    const listed = isUserListedOnDesk(desk, user.id);
    if (!listed && !desk.unlistedCanCreateTicket) {
      throw new ForbiddenException('Você não tem acesso para criar tickets nesta mesa.');
    }
  }
}

export function isUserListedOnDesk(
  desk: Pick<DeskOpenContext, 'agents' | 'agentGroups'>,
  userId: string,
): boolean {
  if (desk.agents?.some((a) => a.id === userId)) return true;
  return Boolean(
    desk.agentGroups?.some((g) => g.members?.some((m) => m.id === userId)),
  );
}

export function isTicketBilled(worklogs: { billable: boolean; valuationType: string; value: number | null }[]): boolean {
  return worklogs.some(
    (w) => w.billable === true || (w.valuationType === 'MANUAL' && (w.value ?? 0) > 0),
  );
}

const SLA_PAUSE_STATUSES: TicketStatus[] = [
  TicketStatus.ON_HOLD,
  TicketStatus.PENDING_CUSTOMER,
];

export function isSlaPauseResumeTransition(from: TicketStatus, to: TicketStatus): boolean {
  return SLA_PAUSE_STATUSES.includes(from) || SLA_PAUSE_STATUSES.includes(to);
}

export function assertDeskAllowsCancel(desk: { allowCancelTicket: boolean }): void {
  if (desk.allowCancelTicket === false) {
    throw new ForbiddenException('Esta mesa não permite cancelar tickets.');
  }
}

export function assertDeskAllowsAddSlaHours(desk: {
  allowAddSlaHours: boolean;
  slaControlEnabled: boolean;
}): void {
  if (desk.slaControlEnabled === false) {
    throw new BadRequestException('O controle de SLA está desligado nesta mesa.');
  }
  if (desk.allowAddSlaHours !== true) {
    throw new ForbiddenException('Esta mesa não permite adicionar horas ao SLA.');
  }
}

export function assertDeskAllowsPauseResume(
  desk: { allowPauseResumeSla: boolean },
  from: TicketStatus,
  to: TicketStatus,
): void {
  if (isSlaPauseResumeTransition(from, to) && desk.allowPauseResumeSla === false) {
    throw new ForbiddenException('Esta mesa não permite pausar ou retomar o SLA.');
  }
}

export function assertDeskAllowsReopen(
  desk: { allowReopenUnbilled: boolean; allowReopenBilled: boolean },
  billed: boolean,
): void {
  if (billed && desk.allowReopenBilled === false) {
    throw new ForbiddenException('Esta mesa não permite reabrir tickets faturados.');
  }
  if (!billed && desk.allowReopenUnbilled === false) {
    throw new ForbiddenException('Esta mesa não permite reabrir tickets não faturados.');
  }
}

export function assertListedAgentMayMutate(params: {
  desk: Pick<DeskOpenContext, 'listedGroupsOnly' | 'agents' | 'agentGroups'>;
  user: CurrentUserPayload;
}): void {
  const { desk, user } = params;
  if (user.role === Role.ADMIN) return;
  if (user.role !== Role.AGENT && user.role !== Role.AGENT_MASTER) return;
  if (!desk.listedGroupsOnly) return;
  if (!isUserListedOnDesk(desk, user.id)) {
    throw new ForbiddenException(
      'Somente grupos ou agentes vinculados a esta mesa podem manipular o ticket.',
    );
  }
}
