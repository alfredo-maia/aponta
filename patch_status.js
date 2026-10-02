const fs = require('fs');
let code = fs.readFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', 'utf8');

const newTransitions = `const FORWARD_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED],
  IN_PROGRESS: [TicketStatus.RESOLVED, TicketStatus.PENDING_CUSTOMER, TicketStatus.PENDING_APPROVAL, TicketStatus.ON_HOLD, TicketStatus.ESCALATED],
  PENDING_CUSTOMER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  PENDING_APPROVAL: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  ON_HOLD: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  ESCALATED: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  CLOSED: [],
};`;

code = code.replace(/const FORWARD_TRANSITIONS[\s\S]*?CLOSED: \[\],\n\};/, newTransitions);

const changeStatusRegex = /async changeStatus\([\s\S]*?return ticket;\n  \}/;
const newChangeStatus = `async changeStatus(
    id: string,
    newStatus: TicketStatus,
    currentUser: CurrentUserPayload,
  ): Promise<Ticket> {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(\`Ticket with ID \${id} not found\`);
    }

    const isReopenByAdmin =
      existing.status === TicketStatus.CLOSED &&
      newStatus === TicketStatus.OPEN &&
      currentUser.role === 'ADMIN';

    // RBAC Security Check: Only ADMIN or CLIENT_MASTER can approve/move out of PENDING_APPROVAL
    if (existing.status === TicketStatus.PENDING_APPROVAL || newStatus === TicketStatus.PENDING_APPROVAL) {
      if (currentUser.role !== 'ADMIN' && currentUser.role !== 'CLIENT_MASTER' && currentUser.role !== 'AGENT_MASTER') {
         // Agents can move it to PENDING_APPROVAL, but let's say only ADMIN, AGENT_MASTER, CLIENT_MASTER can approve. Wait, this is controller logic. I'll just check if they are transitioning out of pending_approval.
         if (existing.status === TicketStatus.PENDING_APPROVAL) {
           throw new Error('Somente perfis administrativos podem liberar chamados que aguardam aprovação comercial.');
         }
      }
    }

    const isValidForwardTransition =
      FORWARD_TRANSITIONS[existing.status]?.includes(newStatus);

    if (!isValidForwardTransition && !isReopenByAdmin) {
      throw new Error(
        \`Cannot transition ticket from \${existing.status} to \${newStatus}\`,
      );
    }

    let updateData = { status: newStatus };
    
    if (newStatus === TicketStatus.RESOLVED && !existing.csatToken) {
       updateData.csatToken = randomUUID();
    }

    // SLA Mathematics Logic
    // se entrou em PENDING_CUSTOMER, congela!
    if (newStatus === TicketStatus.PENDING_CUSTOMER) {
       updateData.slaPausedAt = new Date();
    }
    // se SAÍU de PENDING_CUSTOMER, descongela e computa os minutos!
    if (existing.status === TicketStatus.PENDING_CUSTOMER && newStatus !== TicketStatus.PENDING_CUSTOMER) {
       if (existing.slaPausedAt) {
         const diffMinutes = Math.floor((new Date().getTime() - existing.slaPausedAt.getTime()) / 60000);
         updateData.slaAccumulatedPauseTime = existing.slaAccumulatedPauseTime + diffMinutes;
         updateData.slaPausedAt = null;
       }
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: { requester: { select: { email: true } } },
    });

    await this.prisma.ticketAudit.create({
      data: {
        action: 'STATUS_CHANGED',
        prevVal: existing.status,
        newVal: newStatus,
        ticketId: id,
        userId: currentUser.id,
      },
    });

    this.eventEmitter.emit('ticket.status_changed', {
      ticket,
      requesterEmail: ticket.requester?.email,
    });
    return ticket;
  }`;

code = code.replace(changeStatusRegex, newChangeStatus);
fs.writeFileSync('/home/hermes/repos/aponta/apps/api/src/tickets/tickets.service.ts', code);
