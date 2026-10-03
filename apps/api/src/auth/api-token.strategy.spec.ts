import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ApiTokenStrategy } from './api-token.strategy';

describe('ApiTokenStrategy', () => {
  let strategy: ApiTokenStrategy;
  let mockPrisma: any;
  let mockUsersService: any;

  const PLAIN_TOKEN = 'apta_' + 'a'.repeat(64);
  const PREFIX = PLAIN_TOKEN.slice(0, 12);

  beforeEach(async () => {
    const tokenHash = await bcrypt.hash(PLAIN_TOKEN, 10);
    mockPrisma = {
      apiToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tok-1',
          prefix: PREFIX,
          tokenHash,
          userId: 'user-1',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    mockUsersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'agent@dmtecnologia.com.br',
        role: 'AGENT',
        organizationId: null,
      }),
    };
    strategy = new ApiTokenStrategy(mockPrisma, mockUsersService);
  });

  it('rejects tokens without the apta_ prefix', async () => {
    await expect(strategy.validate('not-a-real-token')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when no ApiToken row matches the prefix', async () => {
    mockPrisma.apiToken.findFirst.mockResolvedValue(null);
    await expect(strategy.validate(PLAIN_TOKEN)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when the bcrypt hash does not match (wrong/revoked token)', async () => {
    mockPrisma.apiToken.findFirst.mockResolvedValue({
      id: 'tok-1',
      prefix: PREFIX,
      tokenHash: await bcrypt.hash('apta_' + 'b'.repeat(64), 10),
      userId: 'user-1',
    });
    await expect(strategy.validate(PLAIN_TOKEN)).rejects.toThrow(UnauthorizedException);
  });

  it('resolves the FRESH user role/org from the DB, not a cached value on the token', async () => {
    const result = await strategy.validate(PLAIN_TOKEN);
    expect(result).toEqual({
      id: 'user-1',
      email: 'agent@dmtecnologia.com.br',
      role: 'AGENT',
      organizationId: null,
    });
    expect(mockUsersService.findById).toHaveBeenCalledWith('user-1');
  });

  it('rejects when the owning user no longer exists', async () => {
    mockUsersService.findById.mockResolvedValue(null);
    await expect(strategy.validate(PLAIN_TOKEN)).rejects.toThrow(UnauthorizedException);
  });
});
