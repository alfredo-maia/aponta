import { Prisma, Role } from '@prisma/client';
import { CurrentUserPayload } from '../../tickets/decorators/current-user.decorator';

export class TenantHelper {
  static getTicketWhere(user: CurrentUserPayload): Prisma.TicketWhereInput {
    // ADMIN has no restrictions
    if (user.role === Role.ADMIN) {
      return {};
    }

    if (user.role === Role.CLIENT) {
      return { requesterId: user.id };
    }

    if (user.role === Role.CLIENT_MASTER) {
      if (user.organizationId) {
        return { requester: { organizationId: user.organizationId } };
      }
      return { requesterId: user.id };
    }

    if (user.role === Role.AGENT || user.role === Role.AGENT_MASTER) {
      return { serviceDesk: { agents: { some: { id: user.id } } } };
    }

    // Default deny for unknown/unmapped roles
    return { id: '00000000-0000-0000-0000-000000000000' };
  }
}
