import { Prisma, Role } from '@prisma/client';
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
      return { serviceDesk: { agents: { some: { id: user.id } } } };
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
}
