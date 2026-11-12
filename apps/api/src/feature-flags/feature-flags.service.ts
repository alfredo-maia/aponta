import { Inject, Injectable } from '@nestjs/common';
import { FEATURE_ENV_TOKEN, FEATURE_FLAGS_TOKEN, FeatureFlag } from './feature-flags';

/** Stub neutro (sem o comportamento), substituído na implementação. */
@Injectable()
export class FeatureFlagsService {
  constructor(
    @Inject(FEATURE_FLAGS_TOKEN) readonly flags: readonly FeatureFlag[],
    @Inject(FEATURE_ENV_TOKEN) readonly env: Record<string, string | undefined>,
  ) {}

  isEnabled(_key: string): boolean {
    return false;
  }
}
