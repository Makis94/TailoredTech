import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication at all (e.g. register/login,
 * or public-share-token routes). See JwtAuthGuard, which checks this flag.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
