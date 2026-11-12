import { AppointmentType, Prisma, Role } from '@prisma/client';
import { CurrentUserPayload } from '../../tickets/decorators/current-user.decorator';

export class TenantHelper {
  static getTicketWhere(user: CurrentUserPayload): Prisma.TicketWhereInput {
    if (user.role === Role.ADMIN) return {};
    if (user.role === Role.CLIENT) return { requesterId: user.id };
    if (user.role === Role.CLIENT_MASTER) {
      return user.organizationId
        ? { requester: { organizationId: user.organizationId } }
        : { requesterId: user.id };
    }
    if (user.role === Role.AGENT || user.role === Role.AGENT_MASTER) {
      return {
        serviceDesk: {
          OR: [
            { agents: { some: { id: user.id } } },
            { agentGroups: { some: { members: { some: { id: user.id } } } } },
            { allowCrossDeskInteraction: true },
          ],
        },
      };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  static getServiceDeskWhere(user: CurrentUserPayload): Prisma.ServiceDeskWhereInput {
    if (user.role === Role.ADMIN) return {};
    if (user.role === Role.CLIENT || user.role === Role.CLIENT_MASTER) {
      const orgFilter = user.organizationId
        ? [
            { organizations: { none: {} } },
            { organizations: { some: { id: user.organizationId } } },
          ]
        : [{ organizations: { none: {} } }];
      return {
        active: true,
        acceptingNewTickets: true,
        internalUse: false,
        OR: orgFilter,
      };
    }
    if (user.role === Role.AGENT || user.role === Role.AGENT_MASTER) {
      return {
        OR: [
          { agents: { some: { id: user.id } } },
          { agentGroups: { some: { members: { some: { id: user.id } } } } },
          { allowCrossDeskInteraction: true, active: true },
        ],
      };
    }
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  static getCredentialWhere(user: CurrentUserPayload): Prisma.CredentialWhereInput {
    if (user.role === Role.ADMIN) return {};
    if (user.role === Role.AGENT || user.role === Role.AGENT_MASTER) {
      // Agents can see all credentials. Controller will enforce Read-Only.
      return {};
    }
    // CLIENT and CLIENT_MASTER are mapped to fail-closed
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  static getContractWhere(user: CurrentUserPayload): Prisma.ContractWhereInput {
    if (user.role === Role.ADMIN) return {};
    if (user.role === Role.CLIENT_MASTER && user.organizationId) {
      return { organizationId: user.organizationId };
    }
    if (user.role === Role.AGENT || user.role === Role.AGENT_MASTER) {
      // Only active contracts linked to a desk the agent actually has access
      // to (same desk-access pattern as getTicketWhere/getServiceDeskWhere),
      // minus financials via mask(). Prevents an agent on desk X from seeing
      // contract scope/conditions of organizations unrelated to their desks.
      return {
        active: true,
        serviceDesks: {
          some: {
            OR: [
              { agents: { some: { id: user.id } } },
              { agentGroups: { some: { members: { some: { id: user.id } } } } },
              { allowCrossDeskInteraction: true },
            ],
          },
        },
      };
    }
    // Fail-closed for standard CLIENT
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  static getAppointmentWhere(user: CurrentUserPayload): Prisma.AppointmentWhereInput {
    if (user.role === Role.ADMIN) return {};
    if (user.role === Role.CLIENT_MASTER) {
      if (!user.organizationId) {
        return { id: '00000000-0000-0000-0000-000000000000' };
      }
      return {
        organizationId: user.organizationId,
        type: { not: AppointmentType.ABSENCE },
      };
    }
    if (user.role === Role.AGENT || user.role === Role.AGENT_MASTER) {
      return { userId: user.id };
    }
    // Fail-closed for standard CLIENT and unmapped roles
    return { id: '00000000-0000-0000-0000-000000000000' };
  }
}
