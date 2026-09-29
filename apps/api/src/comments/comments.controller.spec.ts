import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

const mockCommentsService = {
  create: jest.fn(),
  findByTicket: jest.fn(),
};

describe('CommentsController', () => {
  let controller: CommentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [{ provide: CommentsService, useValue: mockCommentsService }],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to the service with the ticket id, dto and calling user (even when a CLIENT sends isInternal: true)', async () => {
      const dto = { content: 'hi', isInternal: true };
      const req = { user: { id: 'client-1', role: Role.CLIENT } };
      mockCommentsService.create.mockResolvedValue({ id: 'c1' });

      await controller.create('ticket-1', dto, req as never);

      expect(mockCommentsService.create).toHaveBeenCalledWith(
        'ticket-1',
        dto,
        { id: 'client-1', role: Role.CLIENT },
      );
    });
  });

  describe('findByTicket', () => {
    it('delegates to the service with the ticket id and calling user', async () => {
      const req = { user: { id: 'agent-1', role: Role.AGENT } };
      mockCommentsService.findByTicket.mockResolvedValue([]);

      await controller.findByTicket('ticket-1', req as never);

      expect(mockCommentsService.findByTicket).toHaveBeenCalledWith(
        'ticket-1',
        { id: 'agent-1', role: Role.AGENT },
      );
    });
  });

  describe('guard declarations', () => {
    it('registers JwtAuthGuard at the class level', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, CommentsController),
      ).toContain(JwtAuthGuard);
    });

    it('does not register RolesGuard on any handler (role rules live in the service)', () => {
      for (const handler of [controller.create, controller.findByTicket]) {
        const guards = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
        expect(guards).not.toContain(RolesGuard);
        expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
      }
    });
  });
});
