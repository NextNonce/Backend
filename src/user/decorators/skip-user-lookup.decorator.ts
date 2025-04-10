// src/user/decorators/skip-user-lookup.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const SKIP_USER_LOOKUP_KEY = 'skipUserLookup';
export const SkipUserLookup = () => SetMetadata(SKIP_USER_LOOKUP_KEY, true);
