export interface FeatureFlag {
  key: string;
  description: string;
  owner: string;
  defaultValue: boolean;
  removeBy: string;
}

export const FEATURE_FLAGS: readonly FeatureFlag[] = [];

export function resolveFlags(
  flags: readonly FeatureFlag[],
  env: Record<string, string | undefined>,
): Record<string, boolean> {
  return {};
}

export function flagProblems(flags: readonly FeatureFlag[], today: Date): string[] {
  return [];
}
