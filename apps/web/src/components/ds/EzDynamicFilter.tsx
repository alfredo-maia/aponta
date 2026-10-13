import { Plus, Trash2 } from 'lucide-react';
import { cn } from './utils';

export type EzDynamicFilterOperator =
  | 'contains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'gt'
  | 'lt'
  | 'empty'
  | 'notEmpty';

export interface EzDynamicFilterField {
  id: string;
  label: string;
  /** 'number' enables numeric comparison operators; 'select' shows a fixed option list. */
  type?: 'text' | 'number' | 'select';
  options?: { label: string; value: string }[];
  /** Extracts the comparable value from a row. */
  getValue: (row: any) => string | number | null | undefined;
}

export interface EzDynamicFilterRule {
  id: string;
  fieldId: string;
  operator: EzDynamicFilterOperator;
  value: string;
}

const OPERATOR_LABELS: Record<EzDynamicFilterOperator, string> = {
  contains: 'Contém',
  equals: 'Igual a',
  notEquals: 'Diferente de',
  startsWith: 'Começa com',
  gt: 'Maior que',
  lt: 'Menor que',
  empty: 'Vazio',
  notEmpty: 'Não vazio',
};

function operatorsFor(field?: EzDynamicFilterField): EzDynamicFilterOperator[] {
  if (field?.type === 'number') return ['equals', 'notEquals', 'gt', 'lt', 'empty', 'notEmpty'];
  if (field?.type === 'select') return ['equals', 'notEquals', 'empty', 'notEmpty'];
  return ['contains', 'equals', 'notEquals', 'startsWith', 'empty', 'notEmpty'];
}

const normalize = (v: unknown) =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/** Returns true when a row satisfies every rule (rules with no value are ignored, except empty/notEmpty). */
export function applyDynamicFilters<T>(
  rows: T[],
  rules: EzDynamicFilterRule[],
  fields: EzDynamicFilterField[]
): T[] {
  const active = rules.filter(
    (r) => r.operator === 'empty' || r.operator === 'notEmpty' || r.value.trim() !== ''
  );
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every((rule) => {
      const field = fields.find((f) => f.id === rule.fieldId);
      if (!field) return true;
      const raw = field.getValue(row);
      const isEmpty = raw === null || raw === undefined || String(raw).trim() === '';
      switch (rule.operator) {
        case 'empty':
          return isEmpty;
        case 'notEmpty':
          return !isEmpty;
        case 'equals':
          return field.type === 'number'
            ? Number(raw) === Number(rule.value)
            : normalize(raw) === normalize(rule.value);
        case 'notEquals':
          return field.type === 'number'
            ? Number(raw) !== Number(rule.value)
            : normalize(raw) !== normalize(rule.value);
        case 'startsWith':
          return normalize(raw).startsWith(normalize(rule.value));
        case 'gt':
          return Number(raw) > Number(rule.value);
        case 'lt':
          return Number(raw) < Number(rule.value);
        case 'contains':
        default:
          return normalize(raw).includes(normalize(rule.value));
      }
    })
  );
}

export interface EzDynamicFilterProps {
  fields: EzDynamicFilterField[];
  rules: EzDynamicFilterRule[];
  onChange: (rules: EzDynamicFilterRule[]) => void;
}

const controlClass =
  'w-full h-7 px-2 text-[12px] border border-gray-300 rounded-[5px] bg-white focus:outline-none focus:border-brand-500';

/**
 * Dynamic filter builder (Sankhya "Filtros" parity): every field of the grid can be filtered
 * with an operator and a value; rules are combined with AND.
 */
export function EzDynamicFilter({ fields, rules, onChange }: EzDynamicFilterProps) {
  const update = (id: string, patch: Partial<EzDynamicFilterRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRule = () => {
    const first = fields[0];
    if (!first) return;
    onChange([
      ...rules,
      {
        id: `rule-${Date.now()}-${rules.length}`,
        fieldId: first.id,
        operator: operatorsFor(first)[0],
        value: '',
      },
    ]);
  };

  return (
    <div data-testid="ez-dynamic-filter" className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Filtros por campo
        </span>
        <button
          type="button"
          data-testid="ez-dynamic-filter-add"
          onClick={addRule}
          className="text-[11px] font-medium text-brand-600 hover:text-brand-700 flex items-center gap-0.5 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Adicionar
        </button>
      </div>

      {rules.length === 0 && (
        <p className="text-[12px] text-gray-400">
          Nenhum filtro. Clique em Adicionar para filtrar por qualquer coluna.
        </p>
      )}

      {rules.map((rule) => {
        const field = fields.find((f) => f.id === rule.fieldId);
        const ops = operatorsFor(field);
        const needsValue = rule.operator !== 'empty' && rule.operator !== 'notEmpty';
        return (
          <div
            key={rule.id}
            data-testid="ez-dynamic-filter-rule"
            className="space-y-1 rounded-[6px] border border-gray-200 p-2 bg-gray-50/60"
          >
            <div className="flex items-center gap-1">
              <select
                aria-label="Campo"
                value={rule.fieldId}
                onChange={(e) => {
                  const nextField = fields.find((f) => f.id === e.target.value);
                  const nextOps = operatorsFor(nextField);
                  update(rule.id, {
                    fieldId: e.target.value,
                    operator: nextOps.includes(rule.operator) ? rule.operator : nextOps[0],
                    value: '',
                  });
                }}
                className={cn(controlClass, 'cursor-pointer')}
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Remover filtro"
                title="Remover filtro"
                onClick={() => onChange(rules.filter((r) => r.id !== rule.id))}
                className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <select
              aria-label="Operador"
              value={rule.operator}
              onChange={(e) => update(rule.id, { operator: e.target.value as EzDynamicFilterOperator })}
              className={cn(controlClass, 'cursor-pointer')}
            >
              {ops.map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </option>
              ))}
            </select>
            {needsValue &&
              (field?.type === 'select' && field.options ? (
                <select
                  aria-label="Valor"
                  value={rule.value}
                  onChange={(e) => update(rule.id, { value: e.target.value })}
                  className={cn(controlClass, 'cursor-pointer')}
                >
                  <option value="">Selecione…</option>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label="Valor"
                  type={field?.type === 'number' ? 'number' : 'text'}
                  value={rule.value}
                  onChange={(e) => update(rule.id, { value: e.target.value })}
                  placeholder="Valor…"
                  className={controlClass}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
