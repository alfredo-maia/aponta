import { Prisma, Role } from '@prisma/client';
import { CurrentUserPayload } from '../../tickets/decorators/current-user.decorator';

export class TenantHelper {
  /**
   * Retrieves the base Prisma `where` clause for the Ticket model
   * to strictly enforce Tenant and Role isolation.
   */
  static getTicketWhere(user: CurrentUserPayload): Prisma.TicketWhereInput {
    switch (user.role) {
      case Role.CLIENT:
        return { requesterId: user.id };

      case Role.CLIENT_MASTER:
        if (user.organizationId) {
          return { requester: { organizationId: user.organizationId } };
        }
        return { requesterId: user.id };

      case Role.AGENT:
      case Role.AGENT_MASTER:
        return { serviceDesk: { agents: { some: { id: user.id } } } };

      case Role.ADMIN:
        return {};

      default:
        // Fail closed for unknown/unmapped roles
        return { id: 'FAIL_CLOSED' };
    }
  }
}
