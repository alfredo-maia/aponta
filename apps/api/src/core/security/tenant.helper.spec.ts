import { Role } from '@prisma/client';
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
    expect(TenantHelper.getTicketWhere(agent)).toEqual({ serviceDesk: { agents: { some: { id: 'agent1' } } } });
    expect(TenantHelper.getTicketWhere(agentMaster)).toEqual({ serviceDesk: { agents: { some: { id: 'agent2' } } } });
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
});
