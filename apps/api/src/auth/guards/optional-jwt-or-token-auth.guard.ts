import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtOrTokenAuthGuard, but never rejects the request for a
 * missing/invalid credential — it just leaves `request.user` undefined.
 * Lets public FAQ articles stay reachable anonymously while an MCP
 * token or a browser session still gets the broader, role-aware result
 * when presented.
 */
@Injectable()
export class OptionalJwtOrTokenAuthGuard extends AuthGuard(['jwt', 'bearer']) {
  override handleRequest<TUser = unknown>(
    _err: unknown,
    user: unknown,
  ): TUser {
    return (user ?? undefined) as TUser;
  }

  override canActivate(context: ExecutionContext) {
    return super.canActivate(context) as Promise<boolean> | boolean;
  }
}
