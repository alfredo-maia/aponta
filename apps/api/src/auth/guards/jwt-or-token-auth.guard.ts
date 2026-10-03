import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Accepts EITHER a browser session JWT or a personal API token (apta_...)
 * minted via /api-tokens. Passport tries 'jwt' first, then 'bearer', and
 * both strategies resolve to the identical { id, email, role,
 * organizationId } shape — so every RolesGuard/TenantHelper downstream
 * needs no changes to support MCP/API-token callers.
 */
@Injectable()
export class JwtOrTokenAuthGuard extends AuthGuard(['jwt', 'bearer']) {}
