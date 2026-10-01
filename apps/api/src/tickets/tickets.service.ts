import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Role, Ticket, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { CurrentUserPayload } from './decorators/current-user.decorator';
import { addBusinessHours } from '../scheduling/business-hours';
import { getSlaStatus } from '../scheduling/sla-status';

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

/**
 * Calculates SLA deadlines counting only *business* hours, as configured
 * via the service desk's Expediente (`BusinessHour` + `Holiday`). A
 * service desk with no Expediente configured (`businessHours.length ===
 * 0`) falls back to plain 24/7 wall-clock hours — see
 * `addBusinessHours` in `../scheduling/business-hours`.
 */
function calculateSla(
  createdAt: Date,
  priority: TicketPriority,
  businessHours: { weekday: number; startTime: string; endTime: string }[],
  holidays: { date: Date }[],
): { responseDeadline: Date; resolveDeadline: Date } {
  const { responseHours, resolveHours } = SLA_HOURS[priority];
  return {
    responseDeadline: addBusinessHours(
      createdAt,
      responseHours,
      businessHours,
      holidays,
    ),
    resolveDeadline: addBusinessHours(
      createdAt,
      resolveHours,
      businessHours,
      holidays,
    ),
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

/**
 * Fixed width the numeric suffix of a protocol is zero-padded to (e.g.
 * `0001` in `AP-2026-0001`). This width must stay fixed for as long as
 * `tickets.service.ts` relies on `orderBy: { protocol: 'desc' }` (a plain
 * string sort) to find the highest-numbered protocol for a year: a fixed
 * width plus a fixed-length prefix means every protocol string for a
 * given year has equal length, so lexicographic descending order is
 * exactly numeric descending order. Do not raise sequence numbers past
 * `MAX_PROTOCOL_SEQUENCE` without widening this constant (and updating
 * every existing protocol's padding) first.
 */
const PROTOCOL_SEQUENCE_WIDTH = 4;
const MAX_PROTOCOL_SEQUENCE = 10 ** PROTOCOL_SEQUENCE_WIDTH - 1;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Adds `responseSlaStatus`/`resolveSlaStatus` ('ON_TRACK' | 'AT_RISK' |
   * 'BREACHED' | null) to a ticket payload, derived from its
   * createdAt/deadlines relative to "now". Pure presentation data — not
   * persisted — so every read path (list + detail) can decorate
   * consistently without duplicating the classification logic.
   */
  private decorateWithSlaStatus<
    T extends {
      status: TicketStatus;
      createdAt: Date;
      responseDeadline: Date | null;
      resolveDeadline: Date | null;
    },
  >(ticket: T): T & { responseSlaStatus: string | null; resolveSlaStatus: string | null } {
    // Once a ticket reaches a terminal state, elapsed wall-clock time no
    // longer reflects whether the SLA was honored (we don't track a
    // resolvedAt/closedAt timestamp to compare against). Showing a
    // permanently "BREACHED" badge on a ticket resolved on time would be
    // misleading, so SLA status is only meaningful while the ticket is open.
    const isTerminal =
      ticket.status === TicketStatus.RESOLVED ||
      ticket.status === TicketStatus.CLOSED;
    if (isTerminal) {
      return {
        ...ticket,
        responseSlaStatus: null,
        resolveSlaStatus: null,
      };
    }

    const now = new Date();
    return {
      ...ticket,
      responseSlaStatus: getSlaStatus(
        ticket.createdAt,
        ticket.responseDeadline,
        now,
      ),
      resolveSlaStatus: getSlaStatus(
        ticket.createdAt,
        ticket.resolveDeadline,
        now,
      ),
    };
  }

  /**
   * Generates the next protocol number for the given year (e.g.
   * AP-2026-0001) and creates the ticket in the SAME database transaction
   * used to derive it, then relies on the DB-level unique constraint on
   * `protocol` as the final race-safety backstop; see the class-level
   * comment in the report for the full explanation of what this proves
   * and what it doesn't.
   *
   * Sequence derivation: the next number is derived from the HIGHEST
   * existing protocol for the year (`findFirst` ordered by `protocol`
   * desc), not from a `count()` of rows for the year. A count-based
   * derivation breaks the moment any row for that year is deleted (manual
   * DB cleanup, a future soft/hard-delete feature, failed test teardown,
   * etc.): the count drops below the highest sequence number already
   * issued, so every subsequent create() would recompute the same
   * already-used protocol, hit P2002, retry, recompute the SAME wrong
   * number again, and eventually exhaust MAX_PROTOCOL_RETRY_ATTEMPTS —
   * permanently bricking ticket creation for that year. Deriving from the
   * max surviving protocol is immune to gaps: it always resumes counting
   * from the highest number ever issued, regardless of what was deleted
   * in between.
   *
   * `orderBy: { protocol: 'desc' }` sorts numerically-equivalently here
   * ONLY because the numeric suffix is zero-padded to a FIXED width (4
   * digits, see `PROTOCOL_SEQUENCE_WIDTH` below) and the `AP-<year>-`
   * prefix has a fixed length too — so all protocols for a given year are
   * equal-length strings and lexicographic (string) descending order
   * matches numeric descending order. If the sequence within a year ever
   * needed a 5th digit, `String(n).padStart(4, '0')` would silently
   * overflow to a 5-character suffix (e.g. "10000"), which would sort
   * BEFORE "9999" lexicographically ("1..." < "9..."), breaking the
   * string-sort assumption. `MAX_SAFE_SEQUENCE` below guards against that
   * by throwing rather than silently emitting a protocol that could
   * mis-sort or duplicate an existing row.
   */
  async create(
    dto: CreateTicketDto,
    requesterId: string,
  ): Promise<Ticket> {
    const priority = dto.priority ?? TicketPriority.MEDIUM;
    const createdAt = new Date();
    const [businessHours, holidays] = await Promise.all([
      this.prisma.businessHour.findMany({
        where: { serviceDeskId: dto.serviceDeskId },
      }),
      this.prisma.holiday.findMany({
        where: { serviceDeskId: dto.serviceDeskId },
      }),
    ]);
    const { responseDeadline, resolveDeadline } = calculateSla(
      createdAt,
      priority,
      businessHours,
      holidays,
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
          const highest = await tx.ticket.findFirst({
            where: { protocol: { startsWith: yearPrefix } },
            orderBy: { protocol: 'desc' },
          });
          const nextNumber = this.nextSequenceNumber(
            highest?.protocol,
            yearPrefix,
          );
          const protocol = `${yearPrefix}${String(nextNumber).padStart(PROTOCOL_SEQUENCE_WIDTH, '0')}`;

          const ticket = await tx.ticket.create({
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
            include: {
              requester: { select: { email: true } },
            },
          });
          
          this.eventEmitter.emit('ticket.created', {
            ticket,
            requesterEmail: ticket.requester?.email,
          });

          return ticket;
        });
      } catch (error) {
        lastError = error;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === UNIQUE_CONSTRAINT_VIOLATION &&
          this.isProtocolConflict(error)
        ) {
          // Another concurrent request committed the protocol we tried to
          // use first. Retry: the next attempt's findFirst() will observe
          // the just-committed row as the new highest and pick the
          // following number. Kept as the concurrency safety net — this
          // fix only changes HOW the sequence number is derived, not this
          // retry-on-collision backstop.
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

  /**
   * Parses the numeric suffix out of the highest existing protocol for
   * the year (if any) and returns the next sequence number. Guards
   * against the padded suffix ever overflowing its fixed width, which
   * would break the string-sort-equals-numeric-sort assumption that
   * `orderBy: { protocol: 'desc' }` relies on.
   */
  private nextSequenceNumber(
    highestProtocol: string | undefined,
    yearPrefix: string,
  ): number {
    if (!highestProtocol) {
      return 1;
    }
    const suffix = highestProtocol.slice(yearPrefix.length);
    const parsed = Number.parseInt(suffix, 10);
    const current = Number.isNaN(parsed) ? 0 : parsed;
    const next = current + 1;
    if (next > MAX_PROTOCOL_SEQUENCE) {
      throw new BadRequestException(
        `Ticket protocol sequence for prefix ${yearPrefix} exhausted ` +
          `${PROTOCOL_SEQUENCE_WIDTH}-digit capacity (${MAX_PROTOCOL_SEQUENCE}); ` +
          'widen PROTOCOL_SEQUENCE_WIDTH before more tickets can be created this year.',
      );
    }
    return next;
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
  ): Promise<{
    data: Ticket[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const where: Prisma.TicketWhereInput = {};
    if (query.serviceDeskId) {
      where.serviceDeskId = query.serviceDeskId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { protocol: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (currentUser.role === Role.CLIENT) {
      where.requesterId = currentUser.id;
    } else if (currentUser.role === Role.CLIENT_MASTER) {
      // Sees all tickets requested by users in the same organization, OR their own if no org
      if (currentUser.organizationId) {
        where.requester = { organizationId: currentUser.organizationId };
      } else {
        where.requesterId = currentUser.id;
      }
    } else if (currentUser.role === Role.AGENT || currentUser.role === Role.AGENT_MASTER) {
      // Agents only see tickets belonging to ServiceDesks they are assigned to
      where.serviceDesk = { agents: { some: { id: currentUser.id } } };
    }
    // ADMIN has no restrictions, sees everything

    const page = Math.max(parseInt(query.page ?? '1', 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit ?? '20', 10) || 20, 1),
      100,
    );

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: data.map((t) => this.decorateWithSlaStatus(t)),
      meta: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  }

  async findOne(
    id: string,
    currentUser: CurrentUserPayload,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({ 
      where: { id },
      include: {
        requester: { select: { organizationId: true } },
        serviceDesk: { select: { agents: { where: { id: currentUser.id }, select: { id: true } } } }
      }
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    let isAuthorized = false;

    if (currentUser.role === Role.ADMIN) {
      isAuthorized = true;
    } else if (currentUser.role === Role.CLIENT) {
      isAuthorized = ticket.requesterId === currentUser.id;
    } else if (currentUser.role === Role.CLIENT_MASTER) {
      isAuthorized = ticket.requesterId === currentUser.id || 
                     (!!currentUser.organizationId && (ticket as Ticket & { requester?: any, serviceDesk?: any }).requester?.organizationId === currentUser.organizationId);
    } else if (currentUser.role === Role.AGENT || currentUser.role === Role.AGENT_MASTER) {
      // Authorized if the agent is assigned to this ticket's service desk
      isAuthorized = (ticket as Ticket & { requester?: any, serviceDesk?: any }).serviceDesk?.agents?.length > 0;
    }

    if (!isAuthorized) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // strip out the included relations we used only for authorization
    delete (ticket as Ticket & { requester?: any, serviceDesk?: any }).requester;
    delete (ticket as Ticket & { requester?: any, serviceDesk?: any }).serviceDesk;

    return this.decorateWithSlaStatus(ticket);
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
      const [businessHours, holidays] = await Promise.all([
        this.prisma.businessHour.findMany({
          where: { serviceDeskId: existing.serviceDeskId },
        }),
        this.prisma.holiday.findMany({
          where: { serviceDeskId: existing.serviceDeskId },
        }),
      ]);
      const { responseDeadline, resolveDeadline } = calculateSla(
        existing.createdAt,
        dto.priority,
        businessHours,
        holidays,
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
      const ticket = await this.prisma.ticket.update({
        where: { id },
        data: { agentId },
        include: { agent: { select: { email: true } } },
      });
      this.eventEmitter.emit('ticket.assigned', {
        ticket,
        agentEmail: ticket.agent?.email,
      });
      return ticket;
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

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data:
        newStatus === TicketStatus.RESOLVED && !existing.csatToken
          ? { status: newStatus, csatToken: randomUUID() }
          : { status: newStatus },
      include: { requester: { select: { email: true } } },
    });
    
    this.eventEmitter.emit('ticket.status_changed', {
      ticket,
      requesterEmail: ticket.requester?.email,
    });
    return ticket;
  }
}
