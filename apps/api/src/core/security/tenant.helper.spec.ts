import { AppointmentType, Role } from '@prisma/client';
import { TenantHelper } from './tenant.helper';
import { CurrentUserPayload } from '../../tickets/decorators/current-user.decorator';

describe('TenantHelper', () => {
  it('should restrict CLIENT to their own tickets', () => {
    const user: CurrentUserPayload = { id: 'u1', role: Role.CLIENT };
    const where = TenantHelper.getTicketWhere(user);
    expect(where).toEqual({ requesterId: 'u1' });
  });

  it('should restrict CLIENT_MASTER to their organization tickets', () => {
    const user: CurrentUserPayload = { id: 'u2', role: Role.CLIENT_MASTER, organizationId: 'org1' };
    const where = TenantHelper.getTicketWhere(user);
    expect(where).toEqual({ requester: { organizationId: 'org1' } });
  });

  it('should restrict CLIENT_MASTER to their own tickets if no organization', () => {
    const user: CurrentUserPayload = { id: 'u2', role: Role.CLIENT_MASTER };
    const where = TenantHelper.getTicketWhere(user);
    expect(where).toEqual({ requesterId: 'u2' });
  });

  it('should restrict AGENT and AGENT_MASTER to their service desks', () => {
    const agent: CurrentUserPayload = { id: 'agent1', role: Role.AGENT };
    const agentMaster: CurrentUserPayload = { id: 'agent2', role: Role.AGENT_MASTER };
    expect(TenantHelper.getTicketWhere(agent)).toEqual({
      serviceDesk: {
        OR: [
          { agents: { some: { id: 'agent1' } } },
          { agentGroups: { some: { members: { some: { id: 'agent1' } } } } },
          { allowCrossDeskInteraction: true },
        ],
      },
    });
    expect(TenantHelper.getTicketWhere(agentMaster)).toEqual({
      serviceDesk: {
        OR: [
          { agents: { some: { id: 'agent2' } } },
          { agentGroups: { some: { members: { some: { id: 'agent2' } } } } },
          { allowCrossDeskInteraction: true },
        ],
      },
    });
  });

  it('should return empty where clause for ADMIN', () => {
    const user: CurrentUserPayload = { id: 'admin1', role: Role.ADMIN };
    const where = TenantHelper.getTicketWhere(user);
    expect(where).toEqual({});
  });

  it('should return a fail-closed clause for unknown roles', () => {
    const user = { id: 'unknown', role: 'SPY' as Role };
    const where = TenantHelper.getTicketWhere(user);
    expect(where).toHaveProperty('id', '00000000-0000-0000-0000-000000000000');
  });

  describe('getServiceDeskWhere', () => {
    it('returns empty where for ADMIN', () => {
      const user: CurrentUserPayload = { id: 'admin1', role: Role.ADMIN };
      expect(TenantHelper.getServiceDeskWhere(user)).toEqual({});
    });

    it('filters CLIENT to active non-internal desks of their org or global', () => {
      const user: CurrentUserPayload = {
        id: 'c1',
        role: Role.CLIENT,
        organizationId: 'org1',
      };
      expect(TenantHelper.getServiceDeskWhere(user)).toEqual({
        active: true,
        acceptingNewTickets: true,
        internalUse: false,
        OR: [
          { organizations: { none: {} } },
          { organizations: { some: { id: 'org1' } } },
        ],
      });
    });
  });

  describe('getContractWhere', () => {
    it('returns empty where for ADMIN', () => {
      const user: CurrentUserPayload = { id: 'admin1', role: Role.ADMIN };
      expect(TenantHelper.getContractWhere(user)).toEqual({});
    });

    it('scopes CLIENT_MASTER to their own organization', () => {
      const user: CurrentUserPayload = { id: 'cm1', role: Role.CLIENT_MASTER, organizationId: 'org1' };
      expect(TenantHelper.getContractWhere(user)).toEqual({ organizationId: 'org1' });
    });

    it('restricts AGENT and AGENT_MASTER to active contracts linked to desks they can access, not just any active contract', () => {
      const agent: CurrentUserPayload = { id: 'agent1', role: Role.AGENT };
      const agentMaster: CurrentUserPayload = { id: 'agent2', role: Role.AGENT_MASTER };
      expect(TenantHelper.getContractWhere(agent)).toEqual({
        active: true,
        serviceDesks: {
          some: {
            OR: [
              { agents: { some: { id: 'agent1' } } },
              { agentGroups: { some: { members: { some: { id: 'agent1' } } } } },
              { allowCrossDeskInteraction: true },
            ],
          },
        },
      });
      expect(TenantHelper.getContractWhere(agentMaster)).toEqual({
        active: true,
        serviceDesks: {
          some: {
            OR: [
              { agents: { some: { id: 'agent2' } } },
              { agentGroups: { some: { members: { some: { id: 'agent2' } } } } },
              { allowCrossDeskInteraction: true },
            ],
          },
        },
      });
    });

    it('fails closed for a plain CLIENT', () => {
      const user: CurrentUserPayload = { id: 'c1', role: Role.CLIENT };
      expect(TenantHelper.getContractWhere(user)).toEqual({ id: '00000000-0000-0000-0000-000000000000' });
    });
  });

  describe('getAppointmentWhere', () => {
    it('should return empty where clause for ADMIN', () => {
      const user: CurrentUserPayload = { id: 'admin1', role: Role.ADMIN };
      expect(TenantHelper.getAppointmentWhere(user)).toEqual({});
    });

    it('should restrict CLIENT_MASTER to their organization and hide ABSENCE', () => {
      const user: CurrentUserPayload = { id: 'cm1', role: Role.CLIENT_MASTER, organizationId: 'org123' };
      expect(TenantHelper.getAppointmentWhere(user)).toEqual({
        organizationId: 'org123',
        type: { not: AppointmentType.ABSENCE },
      });
    });

    it('should fail-closed for CLIENT_MASTER without organizationId', () => {
      const user: CurrentUserPayload = { id: 'cm1', role: Role.CLIENT_MASTER };
      expect(TenantHelper.getAppointmentWhere(user)).toEqual({
        id: '00000000-0000-0000-0000-000000000000',
      });
    });

    it('should restrict AGENT and AGENT_MASTER to their own userId', () => {
      const agent: CurrentUserPayload = { id: 'agent1', role: Role.AGENT };
      const agentMaster: CurrentUserPayload = { id: 'agent2', role: Role.AGENT_MASTER };
      expect(TenantHelper.getAppointmentWhere(agent)).toEqual({ userId: 'agent1' });
      expect(TenantHelper.getAppointmentWhere(agentMaster)).toEqual({ userId: 'agent2' });
    });

    it('should fail-closed for CLIENT', () => {
      const user: CurrentUserPayload = { id: 'c1', role: Role.CLIENT };
      expect(TenantHelper.getAppointmentWhere(user)).toEqual({
        id: '00000000-0000-0000-0000-000000000000',
      });
    });

    it('should fail-closed for unmapped roles', () => {
      const user = { id: 'unknown', role: 'UNKNOWN' as Role };
      expect(TenantHelper.getAppointmentWhere(user)).toEqual({
        id: '00000000-0000-0000-0000-000000000000',
      });
    });
  });
});
