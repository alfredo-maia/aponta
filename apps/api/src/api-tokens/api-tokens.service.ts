import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

const TOKEN_PREFIX = 'apta_';
// Length of the plaintext slice we keep unhashed for fast lookup — it is
// not a secret on its own (the full token's remaining bytes are), it just
// lets us index-search instead of scanning every ApiToken row with bcrypt.
const PREFIX_LENGTH = 12;

/**
 * Personal API tokens let a user drive the Aponta REST API from outside
 * the browser session (e.g. the apps/mcp MCP server). A token carries NO
 * role of its own — ApiTokenStrategy re-resolves the owning User fresh on
 * every request, so the token always inherits whatever Role/Organization
 * that user currently has (demote them -> their token is demoted too).
 */
@Injectable()
export class ApiTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: CurrentUserPayload, name: string) {
    const plainToken = TOKEN_PREFIX + crypto.randomBytes(32).toString('hex');
    const prefix = plainToken.slice(0, PREFIX_LENGTH);
    const tokenHash = await bcrypt.hash(plainToken, 10);

    const created = await this.prisma.apiToken.create({
      data: {
        name,
        prefix,
        tokenHash,
        userId: user.id,
      },
    });

    return {
      id: created.id,
      name: created.name,
      createdAt: created.createdAt,
      lastUsedAt: created.lastUsedAt,
      token: plainToken, // only ever returned here, at creation time
    };
  }

  async findAll(user: CurrentUserPayload) {
    const tokens = await this.prisma.apiToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Never project tokenHash/prefix out of this service.
    return tokens.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
    }));
  }

  async revoke(id: string, user: CurrentUserPayload) {
    const token = await this.prisma.apiToken.findUnique({ where: { id } });

    if (!token) {
      throw new NotFoundException('Token não encontrado');
    }

    if (token.userId !== user.id) {
      throw new ForbiddenException('Você só pode revogar seus próprios tokens');
    }

    await this.prisma.apiToken.delete({ where: { id } });
    return { success: true };
  }
}
