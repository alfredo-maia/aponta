import { Controller, Get, Inject } from '@nestjs/common';
import { FEATURE_ENV_TOKEN, FEATURE_FLAGS_TOKEN, FeatureFlag, resolveFlags } from './feature-flags';

/**
 * Sem guard, como o health: devolve só booleanos de exposição de funcionalidade,
 * que a tela precisa antes do login. Nunca coloque dado de negócio numa flag.
 */
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(
    @Inject(FEATURE_FLAGS_TOKEN) private readonly flags: readonly FeatureFlag[],
    @Inject(FEATURE_ENV_TOKEN) private readonly env: Record<string, string | undefined>,
  ) {}

  @Get()
  list(): Record<string, boolean> {
    return resolveFlags(this.flags, this.env);
  }
}
