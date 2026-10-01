import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but never rejects the request for a missing/invalid
 * token — it just leaves `request.user` undefined. Used on endpoints that
 * must stay reachable anonymously (public FAQ articles) while still
 * honoring a valid token when present (so an authenticated CLIENT/AGENT
 * gets the broader, role-aware result instead of always the anonymous
 * "public only" view).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(
    _err: unknown,
    user: unknown,
  ): TUser {
    // Deliberately swallow the error/missing-user case instead of
    // rethrowing — that's the entire point of "optional".
    return (user ?? undefined) as TUser;
  }

  override canActivate(context: ExecutionContext) {
    return super.canActivate(context) as Promise<boolean> | boolean;
  }
}
