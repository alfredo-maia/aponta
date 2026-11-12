import { Inject, Injectable } from '@nestjs/common';
import { FEATURE_ENV_TOKEN, FEATURE_FLAGS_TOKEN, FeatureFlag, resolveFlags } from './feature-flags';

/** Lê as flags no momento da chamada: valor padrão da flag ou o `FEATURE_<CHAVE>` do ambiente. */
@Injectable()
export class FeatureFlagsService {
  constructor(
    @Inject(FEATURE_FLAGS_TOKEN) private readonly flags: readonly FeatureFlag[],
    @Inject(FEATURE_ENV_TOKEN) private readonly env: Record<string, string | undefined>,
  ) {}

  /** Flag que não existe fica desligada. */
  isEnabled(key: string): boolean {
    return resolveFlags(this.flags, this.env)[key] === true;
  }
}
