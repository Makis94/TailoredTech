import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like the default JWT guard, but never rejects the request. If a valid
 * Bearer token is present, `request.user` is populated (useful to fast-path
 * owners and to check permissioned shares); otherwise the request proceeds
 * anonymously, e.g. to be checked against a public share token instead.
 *
 * Pair with @Public() so the global JwtAuthGuard doesn't block anonymous
 * callers, and rely on the resource-level AccessService checks to enforce
 * authorization instead.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || undefined;
  }
}
