import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { PrismaService } from '../prisma/prisma.service';

// DMTE-485: "não catalogado" na criação. O Cliente do chamado continua sendo o do solicitante.
describe('TicketsService.create: não catalogado (DMTE-485)', () => {
  let service: TicketsService;
  let tx: { ticket: { findFirst: jest.Mock; create: jest.Mock } };
  let prisma: {
    serviceDesk: { findUnique: jest.Mock };
    serviceCatalogItem: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    businessHour: { findMany: jest.Mock };
    holiday: { findMany: jest.Mock };
    ticketAudit: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const baseDesk = {
    slaControlEnabled: false,
    defaultOpenStatus: TicketStatus.OPEN,
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
    priorities: [],
    agents: [],
    agentGroups: [],
    stages: [{ id: 'stage-initial' }],
  };

  const desks: Record<string, typeof baseDesk> = {};
  const agent = { id: 'agent-1', role: Role.AGENT };
  const dto = { title: 't', description: 'd', serviceDeskId: 'desk-1' };

  const created = () => tx.ticket.create.mock.calls[0][0].data;

  beforeEach(async () => {
    for (const key of Object.keys(desks)) delete desks[key];
    desks['desk-1'] = { ...baseDesk };
    tx = { ticket: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() } };
    tx.ticket.create.mockImplementation(({ data }) => ({ id: 'ticket-1', ...data }));
    prisma = {
      serviceDesk: {
        findUnique: jest.fn(({ where }) => Promise.resolve(desks[where.id] ?? null)),
      },
      serviceCatalogItem: { findUnique: jest.fn().mockResolvedValue(null) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          name: 'Requester',
          email: 'requester@aponta.com',
          phone: '11999999999',
          extension: null,
          organizationId: 'org-1',
        }),
      },
      businessHour: { findMany: jest.fn().mockResolvedValue([]) },
      holiday: { findMany: jest.fn().mockResolvedValue([]) },
      ticketAudit: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get(TicketsService);
  });

  it('AC-11: semCatalogo abre o chamado em mesa com catálogo exigido e não é gravado', async () => {
    desks['desk-1'] = { ...baseDesk, catalogRequiredOnOpen: true };
    await service.create({ ...dto, semCatalogo: true }, agent);
    expect(created()).not.toHaveProperty('semCatalogo');
  });

  it('AC-11: sem semCatalogo e sem item a mesa com catálogo exigido continua recusando', async () => {
    desks['desk-1'] = { ...baseDesk, catalogRequiredOnOpen: true };
    await expect(service.create(dto, agent)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('DMTE-485: o Cliente comercial do chamado é a organização do solicitante', async () => {
    await service.create(dto, agent);
    expect(created().commercialOrganizationId).toBe('org-1');
  });

  describe('DTO de criação', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const run = (body: Record<string, unknown>) =>
      pipe.transform(body, { type: 'body', metatype: CreateTicketDto });

    const ok = {
      title: 't',
      description: 'd',
      serviceDeskId: '123e4567-e89b-12d3-a456-426614174001',
    };

    it('AC-11: aceita semCatalogo booleano', async () => {
      await expect(run({ ...ok, semCatalogo: true })).resolves.toMatchObject({ semCatalogo: true });
    });

    it('AC-11: recusa semCatalogo que não é booleano', async () => {
      await expect(run({ ...ok, semCatalogo: 'sim' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('DMTE-485: recusa organizationId, porque o Cliente do chamado é o do solicitante', async () => {
      await expect(
        run({ ...ok, organizationId: '123e4567-e89b-12d3-a456-426614174002' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
