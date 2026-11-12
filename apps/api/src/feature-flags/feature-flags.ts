/**
 * Feature flags controlam quem vê uma funcionalidade; não são etapa do pipeline.
 * Cada flag tem responsável, valor padrão e data de remoção. O teste desta pasta
 * falha quando uma flag registrada passa da data: flag morta sai do código.
 * Valor por ambiente: variável FEATURE_<CHAVE_EM_MAIUSCULAS> = true | false.
 */
export interface FeatureFlag {
  /** kebab-case, estável; vira FEATURE_<KEY> no ambiente. */
  key: string;
  description: string;
  /** Quem decide ligar, desligar e remover. */
  owner: string;
  defaultValue: boolean;
  /** AAAA-MM-DD: até quando a flag pode existir. */
  removeBy: string;
}

export const FEATURE_FLAGS: readonly FeatureFlag[] = [
  {
    key: 'fechamento-automatico-cronometro',
    description: 'Fechamento automático do cronômetro (limite da agenda, pausa de 2 dias, janela fechada) e o e-mail de aviso',
    owner: 'alfredo',
    defaultValue: true,
    removeBy: '2026-12-12',
  },
];

export const FEATURE_FLAGS_TOKEN = 'FEATURE_FLAGS';
export const FEATURE_ENV_TOKEN = 'FEATURE_ENV';

const envName = (key: string) => 'FEATURE_' + key.toUpperCase().replace(/-/g, '_');

export function resolveFlags(
  flags: readonly FeatureFlag[],
  env: Record<string, string | undefined>,
): Record<string, boolean> {
  const resolved: Record<string, boolean> = {};
  for (const flag of flags) {
    const value = env[envName(flag.key)];
    resolved[flag.key] = value === 'true' ? true : value === 'false' ? false : flag.defaultValue;
  }
  return resolved;
}

export function flagProblems(flags: readonly FeatureFlag[], today: Date): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const day = today.toISOString().slice(0, 10);
  for (const flag of flags) {
    if (seen.has(flag.key)) {
      problems.push(`${flag.key}: chave duplicada`);
      continue;
    }
    seen.add(flag.key);
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(flag.key)) {
      problems.push(`${flag.key}: chave fora do padrão kebab-case`);
    } else if (!flag.owner || !flag.description) {
      problems.push(`${flag.key}: sem responsável ou descrição`);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(flag.removeBy) || Number.isNaN(Date.parse(flag.removeBy))) {
      problems.push(`${flag.key}: data de remoção inválida (${flag.removeBy})`);
    } else if (flag.removeBy < day) {
      problems.push(`${flag.key}: passou da data de remoção (${flag.removeBy})`);
    }
  }
  return problems;
}
