import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, TicketPriority, TicketStatus } from '@prisma/client';
import {
  assertDeskAllowsAddSlaHours,
  assertDeskAllowsCancel,
  assertDeskAllowsOpen,
  assertDeskAllowsPauseResume,
  assertDeskAllowsReopen,
  assertListedAgentMayMutate,
  isTicketBilled,
  isUserListedOnDesk,
} from './desk-policy';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

const agent: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };
const client: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };
const requester = {
  name: 'Ana',
  email: 'ana@acme.com',
  phone: '11999999999',
  extension: '123',
};

const openDesk = {
  active: true,
  acceptingNewTickets: true,
  internalUse: false,
  openByAgentsOnly: false,
  catalogRequiredOnOpen: false,
  requireRequesterName: false,
  requireRequesterEmail: false,
  requireRequesterPhone: false,
  requireRequesterExtension: false,
  requireResourceGroup: false,
  requireAttachments: false,
  listedGroupsOnly: false,
  unlistedCanCreateTicket: true,
  priorities: [
    { ticketPriority: TicketPriority.HIGH, enabled: true },
    { ticketPriority: TicketPriority.LOW, enabled: false },
  ],
  agents: [{ id: 'agent-1' }],
  agentGroups: [],
};

describe('assertDeskAllowsOpen', () => {
  it('allows a default open on an active desk', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: openDesk,
        user: agent,
        requester,
        attachmentCount: 0,
      }),
    ).not.toThrow();
  });

  it('rejects inactive desks', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: { ...openDesk, active: false },
        user: agent,
        requester,
        attachmentCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects desks that are not accepting tickets', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: { ...openDesk, acceptingNewTickets: false },
        user: agent,
        requester,
        attachmentCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects CLIENT on an internal desk', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: { ...openDesk, internalUse: true },
        user: client,
        requester,
        attachmentCount: 0,
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects CLIENT when openByAgentsOnly', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: { ...openDesk, openByAgentsOnly: true },
        user: client,
        requester,
        attachmentCount: 0,
      }),
    ).toThrow(ForbiddenException);
  });

  it('requires catalog when catalogRequiredOnOpen', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: { ...openDesk, catalogRequiredOnOpen: true },
        user: agent,
        requester,
        attachmentCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a disabled priority', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: openDesk,
        user: agent,
        requester,
        priority: TicketPriority.LOW,
        attachmentCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('requires resource group when flagged', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: { ...openDesk, requireResourceGroup: true },
        user: agent,
        requester,
        attachmentCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('requires attachments when flagged', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: { ...openDesk, requireAttachments: true },
        user: agent,
        requester,
        attachmentCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('blocks unlisted agents from creating when listedGroupsOnly and unlistedCanCreateTicket=false', () => {
    expect(() =>
      assertDeskAllowsOpen({
        desk: {
          ...openDesk,
          listedGroupsOnly: true,
          unlistedCanCreateTicket: false,
          agents: [],
          agentGroups: [],
        },
        user: agent,
        requester,
        attachmentCount: 0,
      }),
    ).toThrow(ForbiddenException);
  });
});

describe('isUserListedOnDesk', () => {
  it('matches direct agents and group members', () => {
    expect(isUserListedOnDesk({ agents: [{ id: 'a' }], agentGroups: [] }, 'a')).toBe(true);
    expect(
      isUserListedOnDesk(
        { agents: [], agentGroups: [{ members: [{ id: 'b' }] }] },
        'b',
      ),
    ).toBe(true);
    expect(isUserListedOnDesk({ agents: [], agentGroups: [] }, 'c')).toBe(false);
  });
});

describe('isTicketBilled', () => {
  it('treats billable or manual valued worklogs as billed', () => {
    expect(isTicketBilled([{ billable: true, valuationType: 'CONTRACT', value: null }])).toBe(true);
    expect(isTicketBilled([{ billable: false, valuationType: 'MANUAL', value: 10 }])).toBe(true);
    expect(isTicketBilled([{ billable: false, valuationType: 'GUARANTEE', value: 0 }])).toBe(false);
  });
});

describe('assertDeskAllowsCancel', () => {
  it('allows cancel when the flag is true', () => {
    expect(() => assertDeskAllowsCancel({ allowCancelTicket: true })).not.toThrow();
  });

  it('forbids cancel when the flag is false', () => {
    expect(() => assertDeskAllowsCancel({ allowCancelTicket: false })).toThrow(ForbiddenException);
  });
});

describe('assertDeskAllowsAddSlaHours', () => {
  it('allows adding hours when SLA is on and the flag is true', () => {
    expect(() =>
      assertDeskAllowsAddSlaHours({ allowAddSlaHours: true, slaControlEnabled: true }),
    ).not.toThrow();
  });

  it('rejects when SLA control is off', () => {
    expect(() =>
      assertDeskAllowsAddSlaHours({ allowAddSlaHours: true, slaControlEnabled: false }),
    ).toThrow(BadRequestException);
  });

  it('forbids when the flag is false', () => {
    expect(() =>
      assertDeskAllowsAddSlaHours({ allowAddSlaHours: false, slaControlEnabled: true }),
    ).toThrow(ForbiddenException);
  });
});

describe('assertDeskAllowsPauseResume', () => {
  it('forbids ON_HOLD / PENDING_CUSTOMER transitions when the flag is false', () => {
    expect(() =>
      assertDeskAllowsPauseResume(
        { allowPauseResumeSla: false },
        TicketStatus.IN_PROGRESS,
        TicketStatus.ON_HOLD,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertDeskAllowsPauseResume(
        { allowPauseResumeSla: false },
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.IN_PROGRESS,
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows unrelated transitions even when pause/resume is off', () => {
    expect(() =>
      assertDeskAllowsPauseResume(
        { allowPauseResumeSla: false },
        TicketStatus.OPEN,
        TicketStatus.IN_PROGRESS,
      ),
    ).not.toThrow();
  });
});

describe('assertDeskAllowsReopen', () => {
  it('forbids billed reopen when allowReopenBilled is false', () => {
    expect(() =>
      assertDeskAllowsReopen({ allowReopenUnbilled: true, allowReopenBilled: false }, true),
    ).toThrow(ForbiddenException);
  });

  it('forbids unbilled reopen when allowReopenUnbilled is false', () => {
    expect(() =>
      assertDeskAllowsReopen({ allowReopenUnbilled: false, allowReopenBilled: true }, false),
    ).toThrow(ForbiddenException);
  });

  it('allows billed reopen when the flag is true', () => {
    expect(() =>
      assertDeskAllowsReopen({ allowReopenUnbilled: false, allowReopenBilled: true }, true),
    ).not.toThrow();
  });
});

describe('assertListedAgentMayMutate', () => {
  const listedDesk = {
    listedGroupsOnly: true,
    agents: [{ id: 'agent-1' }],
    agentGroups: [],
  };

  it('lets ADMIN mutate even when unlisted', () => {
    expect(() =>
      assertListedAgentMayMutate({
        desk: { ...listedDesk, agents: [] },
        user: { id: 'admin-1', role: Role.ADMIN },
      }),
    ).not.toThrow();
  });

  it('lets a listed agent mutate', () => {
    expect(() =>
      assertListedAgentMayMutate({ desk: listedDesk, user: agent }),
    ).not.toThrow();
  });

  it('blocks an unlisted agent', () => {
    expect(() =>
      assertListedAgentMayMutate({
        desk: { ...listedDesk, agents: [] },
        user: agent,
      }),
    ).toThrow(ForbiddenException);
  });
});
