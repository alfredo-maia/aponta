import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Role, TicketStatus } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { PrismaService } from '../prisma/prisma.service';

// DMTE-485: Cliente gravado no chamado, mesa que serve o Cliente e "não catalogado".
describe('TicketsService.create: Cliente e catálogo (DMTE-485)', () => {
  let service: TicketsService;
  let tx: { ticket: { findFirst: jest.Mock; create: jest.Mock } };
  let prisma: {
    serviceDesk: { findUnique: jest.Mock };
    serviceCatalogItem: { findUnique: jest.Mock };
    organization: { findUnique: jest.Mock };
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
    organizations: [] as { id: string }[],
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
      organization: {
        findUnique: jest.fn(({ where }) =>
          Promise.resolve(where.id === 'org-9' ? { id: 'org-9', active: true } : null),
        ),
      },
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

  it('AC-05: atendente com organizationId grava o Cliente em commercialOrganizationId', async () => {
    await service.create({ ...dto, organizationId: 'org-9' }, agent);
    expect(created().commercialOrganizationId).toBe('org-9');
  });

  it('AC-05: CLIENT tem o organizationId enviado ignorado e fica na organização do solicitante', async () => {
    const client = { id: 'client-1', role: Role.CLIENT, organizationId: 'org-1' };
    await service.create({ ...dto, organizationId: 'org-9' }, client);
    expect(created().commercialOrganizationId).toBe('org-1');
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it('AC-06: recusa Cliente que não existe', async () => {
    await expect(
      service.create({ ...dto, organizationId: 'org-404' }, agent),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.ticket.create).not.toHaveBeenCalled();
  });

  it('AC-06: recusa Cliente inativo', async () => {
    prisma.organization.findUnique.mockResolvedValue({ id: 'org-9', active: false });
    await expect(
      service.create({ ...dto, organizationId: 'org-9' }, agent),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.ticket.create).not.toHaveBeenCalled();
  });

  it('AC-06: recusa mesa que não serve o Cliente e aceita mesa vinculada a ele', async () => {
    desks['desk-1'] = { ...baseDesk, organizations: [{ id: 'org-1' }] };
    await expect(
      service.create({ ...dto, organizationId: 'org-9' }, agent),
    ).rejects.toBeInstanceOf(BadRequestException);

    desks['desk-1'] = { ...baseDesk, organizations: [{ id: 'org-9' }] };
    await service.create({ ...dto, organizationId: 'org-9' }, agent);
    expect(created().commercialOrganizationId).toBe('org-9');
  });

  it('AC-06: a mesa avaliada é a do item do catálogo, não a enviada no corpo', async () => {
    desks['desk-2'] = { ...baseDesk, organizations: [{ id: 'org-9' }] };
    desks['desk-1'] = { ...baseDesk, organizations: [{ id: 'org-1' }] };
    prisma.serviceCatalogItem.findUnique.mockResolvedValue({
      id: 'item-1',
      isActive: true,
      defaultPriority: 'MEDIUM',
      defaultServiceDeskId: 'desk-2',
    });
    await service.create({ ...dto, catalogItemId: 'item-1', organizationId: 'org-9' }, agent);
    expect(created().serviceDeskId).toBe('desk-2');
    expect(created().commercialOrganizationId).toBe('org-9');
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

  describe('DTO de criação', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const run = (body: Record<string, unknown>) =>
      pipe.transform(body, { type: 'body', metatype: CreateTicketDto });

    it('AC-05 e AC-11: aceita organizationId (UUID) e semCatalogo (booleano)', async () => {
      const body = {
        title: 't',
        description: 'd',
        serviceDeskId: '123e4567-e89b-12d3-a456-426614174001',
        organizationId: '123e4567-e89b-12d3-a456-426614174002',
        semCatalogo: true,
      };
      await expect(run(body)).resolves.toMatchObject({ semCatalogo: true });
    });

    it('recusa organizationId que não é UUID e semCatalogo que não é booleano', async () => {
      const ok = {
        title: 't',
        description: 'd',
        serviceDeskId: '123e4567-e89b-12d3-a456-426614174001',
      };
      await expect(run({ ...ok, organizationId: 'abc' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(run({ ...ok, semCatalogo: 'sim' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
