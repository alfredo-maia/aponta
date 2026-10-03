import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });

  it('should connect to database', async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    const service = module.get<PrismaService>(PrismaService);
    await service.$connect();
    await service.$disconnect();
  });

  describe('onModuleInit', () => {
    it('calls $connect', async () => {
      const module = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();
      const service = module.get<PrismaService>(PrismaService);
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls $disconnect', async () => {
      const module = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();
      const service = module.get<PrismaService>(PrismaService);
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('enableShutdownHooks', () => {
    it('registers a beforeExit hook that closes the Nest app', async () => {
      const module = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();
      const service = module.get<PrismaService>(PrismaService);
      const onSpy = jest.spyOn(service, '$on').mockImplementation((() => undefined) as any);
      const fakeApp = { close: jest.fn().mockResolvedValue(undefined) } as any;

      service.enableShutdownHooks(fakeApp);

      expect(onSpy).toHaveBeenCalledWith('beforeExit', expect.any(Function));

      // Simulate Prisma firing the beforeExit event and ensure it closes the app.
      const handler = onSpy.mock.calls[0][1] as () => void;
      handler();

      expect(fakeApp.close).toHaveBeenCalledTimes(1);
    });
  });
});
