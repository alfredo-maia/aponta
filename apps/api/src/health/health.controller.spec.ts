import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  PrismaHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let prismaHealthIndicator: { pingCheck: jest.Mock };

  beforeEach(async () => {
    healthCheckService = { check: jest.fn() };
    prismaHealthIndicator = { pingCheck: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: PrismaHealthIndicator, useValue: prismaHealthIndicator },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('delegates to HealthCheckService with a database ping check and returns its result', async () => {
      const expected: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      healthCheckService.check.mockImplementation(async (checks: Array<() => unknown>) => {
        // Exercise every indicator function passed in, proving the
        // controller actually wires the Prisma ping check (not a no-op).
        await Promise.all(checks.map((fn) => fn()));
        return expected;
      });
      prismaHealthIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' } });

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
      expect(prismaHealthIndicator.pingCheck).toHaveBeenCalledWith('database', expect.anything());
      expect(result).toEqual(expected);
    });

    it('propagates the error when the database check fails (down)', async () => {
      healthCheckService.check.mockRejectedValue(
        new Error('Health check failed: database down'),
      );

      await expect(controller.check()).rejects.toThrow('database down');
    });
  });
});
