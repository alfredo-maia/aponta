import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { getSlaStatus } from './sla-status';
import { TicketStatus, TicketPriority } from '@prisma/client';

@Injectable()
export class SlaEscalationCron {
  private readonly logger = new Logger(SlaEscalationCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleSlaEscalations() {
    this.logger.log('Starting SLA escalation sweep...');

    // Fetch all open tickets that are neither terminal nor paused explicitly (if it's paused, it can't breach today usually, but the status func handles it mathematically anyway).
    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: {
          notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.ESCALATED],
        },
        resolveDeadline: { not: null }
      },
    });

    let escalatedCount = 0;
    const now = new Date();

    for (const ticket of tickets) {
      const status = getSlaStatus(
        ticket.createdAt,
        ticket.resolveDeadline,
        now,
        ticket.slaAccumulatedPauseTime,
        ticket.slaPausedAt
      );

      if (status === 'BREACHED') {
        const priorityEscalationMap: Record<TicketPriority, TicketPriority> = {
          LOW: 'MEDIUM',
          MEDIUM: 'HIGH',
          HIGH: 'CRITICAL',
          CRITICAL: 'CRITICAL', // Tops out at critical
        };

        const newPriority = priorityEscalationMap[ticket.priority];
        
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.ESCALATED,
            priority: newPriority,
          }
        });

        await this.prisma.ticketAudit.create({
          data: {
            ticketId: ticket.id,
            action: 'SLA_BREACH_ESCALATION',
            prevVal: ticket.status,
            newVal: TicketStatus.ESCALATED,
            // System-level audit user or null is ideal; assuming userId is optional or using a system constant if needed.
            userId: ticket.requesterId, // fallback to requester for lack of sys user
          }
        });

        this.logger.warn(`Escalated Ticket ${ticket.protocol} due to SLA Breach`);
        escalatedCount++;
      }
    }

    this.logger.log(`SLA escalation sweep complete. Escalated ${escalatedCount} tickets.`);
  }
}
