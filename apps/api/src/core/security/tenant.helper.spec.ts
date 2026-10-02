import { Role } from '@prisma/client';
import { TenantHelper } from './tenant.helper';
import { CurrentUserPayload } from '../../tickets/decorators/current-user.decorator';

describe('TenantHelper', () => {
  describe('getTicketWhere', () => {
    it('should return client isolation for CLIENT', () => {
      const user: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };
      const where = TenantHelper.getTicketWhere(user);
      expect(where).toEqual({ requesterId: 'client-1' });
    });

    it('should return org isolation for CLIENT_MASTER with organizationId', () => {
      const user: CurrentUserPayload = { id: 'master-1', role: Role.CLIENT_MASTER, organizationId: 'org-1' };
      const where = TenantHelper.getTicketWhere(user);
      expect(where).toEqual({ requester: { organizationId: 'org-1' } });
    });

    it('should fallback to requesterId for CLIENT_MASTER without organizationId', () => {
      const user: CurrentUserPayload = { id: 'master-1', role: Role.CLIENT_MASTER };
      const where = TenantHelper.getTicketWhere(user);
      expect(where).toEqual({ requesterId: 'master-1' });
    });

    it('should return service desk isolation for AGENT', () => {
      const user: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };
      const where = TenantHelper.getTicketWhere(user);
      expect(where).toEqual({ serviceDesk: { agents: { some: { id: 'agent-1' } } } });
    });

    it('should return service desk isolation for AGENT_MASTER', () => {
      const user: CurrentUserPayload = { id: 'agent-master-1', role: Role.AGENT_MASTER };
      const where = TenantHelper.getTicketWhere(user);
      expect(where).toEqual({ serviceDesk: { agents: { some: { id: 'agent-master-1' } } } });
    });

    it('should return empty where (no restrictions) for ADMIN', () => {
      const user: CurrentUserPayload = { id: 'admin-1', role: Role.ADMIN };
      const where = TenantHelper.getTicketWhere(user);
      expect(where).toEqual({});
    });

    it('should return highly restrictive fail-closed where clause for unknown role', () => {
      const user = { id: 'unknown-1', role: 'UNKNOWN_ROLE' as Role };
      const where = TenantHelper.getTicketWhere(user);
      expect(where).toEqual({ id: 'FAIL_CLOSED' });
    });
  });
});
