import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Ticket, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { CurrentUserPayload } from './decorators/current-user.decorator';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

/**
 * SLA offsets in hours, per priority, as specified in the task brief.
 */
const SLA_HOURS: Record<
  TicketPriority,
  { responseHours: number; resolveHours: number }
> = {
  CRITICAL: { responseHours: 1, resolveHours: 4 },
  HIGH: { responseHours: 4, resolveHours: 8 },
  MEDIUM: { responseHours: 8, resolveHours: 24 },
  LOW: { responseHours: 24, resolveHours: 72 },
};

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function calculateSla(
  createdAt: Date,
  priority: TicketPriority,
): { responseDeadline: Date; resolveDeadline: Date } {
  const { responseHours, resolveHours } = SLA_HOURS[priority];
  return {
    responseDeadline: addHours(createdAt, responseHours),
    resolveDeadline: addHours(createdAt, resolveHours),
  };
}

/**
 * Allowed forward transitions in the ticket lifecycle state machine:
 *   OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
 * Backward transitions are rejected for everyone EXCEPT the single
 * "reopen" exception: CLOSED -> OPEN, and only for ADMIN. All other
 * backward/sideways/same-state jumps are rejected regardless of role.
 */
const FORWARD_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: [TicketStatus.IN_PROGRESS],
  IN_PROGRESS: [TicketStatus.RESOLVED],
  RESOLVED: [TicketStatus.CLOSED],
  CLOSED: [],
};

const MAX_PROTOCOL_RETRY_ATTEMPTS = 3;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates the next protocol number for the given year (e.g.
   * AP-2026-0001) and creates the ticket in the SAME database transaction
   * as the count, then relies on the DB-level unique constraint on
   * `protocol` as the final race-safety backstop; see the class-level
   * comment in the report for the full explanation of what this proves
   * and what it doesn't.
   */
  async create(
    dto: CreateTicketDto,
    requesterId: string,
  ): Promise<Ticket> {
    const priority = dto.priority ?? TicketPriority.MEDIUM;
    const createdAt = new Date();
    const { responseDeadline, resolveDeadline } = calculateSla(
      createdAt,
      priority,
    );
    const year = createdAt.getUTCFullYear();
    const yearPrefix = `AP-${year}-`;

    let lastError: unknown;
    for (
      let attempt = 0;
      attempt < MAX_PROTOCOL_RETRY_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const existingCount = await tx.ticket.count({
            where: { protocol: { startsWith: yearPrefix } },
          });
          const nextNumber = existingCount + 1;
          const protocol = `${yearPrefix}${String(nextNumber).padStart(4, '0')}`;

          return tx.ticket.create({
            data: {
              protocol,
              title: dto.title,
              description: dto.description,
              serviceDeskId: dto.serviceDeskId,
              requesterId,
              status: TicketStatus.OPEN,
              priority,
              responseDeadline,
              resolveDeadline,
            },
          });
        });
      } catch (error) {
        lastError = error;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === UNIQUE_CONSTRAINT_VIOLATION &&
          this.isProtocolConflict(error)
        ) {
          // Another concurrent request committed the protocol we tried to
          // use first. Retry: the next attempt's count() will observe the
          // just-committed row and pick the following number.
          continue;
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === FOREIGN_KEY_VIOLATION
        ) {
          throw new BadRequestException(
            'Invalid serviceDeskId: service desk does not exist',
          );
        }
        throw error;
      }
    }

    throw new BadRequestException(
      'Could not generate a unique ticket protocol after multiple attempts',
      { cause: lastError as Error },
    );
  }

  private isProtocolConflict(
    error: Prisma.PrismaClientKnownRequestError,
  ): boolean {
    const target = error.meta?.['target'];
    if (Array.isArray(target)) {
      return target.includes('protocol');
    }
    if (typeof target === 'string') {
      return target.includes('protocol');
    }
    // If Prisma didn't report which constraint failed, be conservative and
    // still treat it as a protocol conflict so we retry rather than fail
    // spuriously (protocol is the only unique constraint on Ticket).
    return true;
  }

  async findAll(
    query: TicketQueryDto,
    currentUser: CurrentUserPayload,
  ): Promise<Ticket[]> {
    const where: Prisma.TicketWhereInput = {};
    if (query.serviceDeskId) {
      where.serviceDeskId = query.serviceDeskId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (currentUser.role === Role.CLIENT) {
      where.requesterId = currentUser.id;
    }

    return this.prisma.ticket.findMany({ where });
  }

  async findOne(
    id: string,
    currentUser: CurrentUserPayload,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    if (
      currentUser.role === Role.CLIENT &&
      ticket.requesterId !== currentUser.id
    ) {
      // Deliberately NotFoundException (not Forbidden): do not leak the
      // existence of other users' tickets to a CLIENT.
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  /**
   * Updates ticket fields. If `priority` changes, SLA deadlines are
   * recalculated from the ticket's ORIGINAL `createdAt` (not from the
   * moment of the update) — see report for rationale.
   */
  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const data: Prisma.TicketUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      data.priority = dto.priority;
      const { responseDeadline, resolveDeadline } = calculateSla(
        existing.createdAt,
        dto.priority,
      );
      data.responseDeadline = responseDeadline;
      data.resolveDeadline = resolveDeadline;
    }

    return this.prisma.ticket.update({ where: { id }, data });
  }

  async assign(id: string, agentId: string): Promise<Ticket> {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    try {
      return await this.prisma.ticket.update({
        where: { id },
        data: { agentId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new BadRequestException(
          `Invalid agentId: user ${agentId} does not exist`,
        );
      }
      throw error;
    }
  }

  /**
   * Enforces the OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED state machine.
   * Any transition not explicitly listed in FORWARD_TRANSITIONS is
   * rejected, EXCEPT CLOSED -> OPEN ("reopen"), which is allowed only for
   * ADMIN callers.
   */
  async changeStatus(
    id: string,
    newStatus: TicketStatus,
    currentUser: CurrentUserPayload,
  ): Promise<Ticket> {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const isReopenByAdmin =
      existing.status === TicketStatus.CLOSED &&
      newStatus === TicketStatus.OPEN &&
      currentUser.role === Role.ADMIN;
    const isValidForwardTransition =
      FORWARD_TRANSITIONS[existing.status].includes(newStatus);

    if (!isValidForwardTransition && !isReopenByAdmin) {
      throw new BadRequestException(
        `Cannot transition ticket from ${existing.status} to ${newStatus}`,
      );
    }

    return this.prisma.ticket.update({
      where: { id },
      data: { status: newStatus },
    });
  }
}
