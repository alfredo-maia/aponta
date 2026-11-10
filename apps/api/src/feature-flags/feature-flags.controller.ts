import { FeatureFlag } from './feature-flags';

export class FeatureFlagsController {
  constructor(
    private readonly flags: readonly FeatureFlag[],
    private readonly env: Record<string, string | undefined>,
  ) {}

  list(): Record<string, boolean> {
    return {};
  }
}
