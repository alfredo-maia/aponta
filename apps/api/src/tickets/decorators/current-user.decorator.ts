import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Small deviation from the brief's file list: no @CurrentUser decorator
 * existed in apps/api/src/auth/decorators/, and that directory is off
 * limits for this task. This mirrors the shape JwtStrategy.validate()
 * attaches to `request.user` (see apps/api/src/auth/jwt.strategy.ts).
 */
export interface CurrentUserPayload {
  id: string;
  // Optional: JwtStrategy always attaches an email, but TicketsService only
  // ever needs `id`/`role` to make its access-control decisions, so tests
  // are not forced to fabricate an email for every fixture user.
  email?: string;
  role: Role;
  organizationId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
