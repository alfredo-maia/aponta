import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const PREFIX_LENGTH = 12;

/**
 * Validates personal API tokens (apta_...) minted via /api-tokens.
 * Mirrors JwtStrategy's contract: resolves the owning User FRESH from the
 * DB on every request and returns the exact same payload shape, so every
 * downstream Guard/TenantHelper treats a token request identically to a
 * logged-in browser session with the user's CURRENT role/organization.
 */
@Injectable()
export class ApiTokenStrategy extends PassportStrategy(Strategy, 'bearer') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async validate(token: string) {
    if (!token.startsWith('apta_')) {
      throw new UnauthorizedException('Token inválido');
    }

    const prefix = token.slice(0, PREFIX_LENGTH);
    const candidate = await this.prisma.apiToken.findFirst({ where: { prefix } });

    if (!candidate) {
      throw new UnauthorizedException('Token inválido ou revogado');
    }

    const matches = await bcrypt.compare(token, candidate.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Token inválido ou revogado');
    }

    // Fire-and-forget audit update — never block/fail the request on this.
    this.prisma.apiToken
      .update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    const user = await this.usersService.findById(candidate.userId);
    if (!user) {
      throw new UnauthorizedException('Usuário do token não existe mais');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}
