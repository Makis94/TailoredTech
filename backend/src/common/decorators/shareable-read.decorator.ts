import { applyDecorators, UseGuards } from '@nestjs/common';
import { Public } from './public.decorator';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';

/**
 * For GET endpoints that a share can expose: skips the mandatory global auth
 * guard (@Public) but still runs OptionalJwtAuthGuard so `request.user` is
 * populated when a valid Bearer token *is* present. Actual authorization
 * (owner / permissioned grant / valid public token) is enforced in the
 * service layer via AccessService.checkReadAccess.
 */
export function ShareableRead() {
  return applyDecorators(Public(), UseGuards(OptionalJwtAuthGuard));
}
