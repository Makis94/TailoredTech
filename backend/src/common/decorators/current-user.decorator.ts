import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Pulls the authenticated user off the request (set by JwtStrategy).
 * Use `@CurrentUser() user: AuthenticatedUser` on routes guarded by JwtAuthGuard.
 * Use `@CurrentUser({ optional: true })` on routes guarded by OptionalJwtAuthGuard,
 * where the caller may be anonymous (e.g. viewing via a public share link).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
