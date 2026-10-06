import { HTMLAttributes, forwardRef, useId, useMemo, useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { cn } from './utils';
import { EzCheck } from './EzCheck';
import { EzComboBox } from './EzComboBox';
import { EzButton } from './EzButton';

/** One entry in `availableFields`: every field the form could possibly show. */
export type EzSimpleFormConfigField = {
  /** Unique field identifier (matches `EzSimpleFormConfigValue.name`). */
  name: string;
  /** Human-readable label shown to the user. */
  label: string;
};

/** Current per-field configuration: visibility + which tab/group it belongs to. */
export type EzSimpleFormConfigValue = {
  /** Field identifier, matches an entry in `availableFields`. */
  name: string;
  /** Tab/group name the field is assigned to. */
  tab: string;
  /** Whether the field is shown on the form. */
  visible: boolean;
};

const DEFAULT_TAB = 'Geral';

export type EzSimpleFormConfigProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  /** All fields that could possibly appear on the form. */
  availableFields: EzSimpleFormConfigField[];
  /** Current configuration (visibility + tab) for every field. */
  value: EzSimpleFormConfigValue[];
  /**
   * Tabs/groups available to assign fields to.
   * @default ['Geral']
   */
  tabs?: string[];
  /** Fired with the full updated config whenever visibility or tab changes. */
  onChange: (config: EzSimpleFormConfigValue[]) => void;
  /** Fired when the user confirms the configuration. Hidden if omitted. */
  onSave?: () => void;
  /** Fired when the user discards changes. Hidden if omitted. */
  onCancel?: () => void;
};

/**
 * Aponta DS Simple Form Config
 * Visual panel/modal to configure a simplified form: which fields are
 * visible and which tab/group each one belongs to. Mirrors the
 * `formConfig.fields` shape used by `SnkSimpleCrud` (`{ name, tab }[]`),
 * but without the Sankhya DS dependency on `SnkApplication` / `DataUnit` /
 * server-side `configName` persistence — the caller owns the config state
 * and decides where (if anywhere) to persist it via `onChange`/`onSave`.
 */
export const EzSimpleFormConfig = forwardRef<HTMLDivElement, EzSimpleFormConfigProps>(
  (
    {
      availableFields,
      value,
      tabs,
      onChange,
      onSave,
      onCancel,
      className,
      ...props
    },
    ref
  ) => {
    const baseId = useId();
    const [newTabName, setNewTabName] = useState('');
    const [extraTabs, setExtraTabs] = useState<string[]>([]);

    const allTabs = useMemo(() => {
      const baseTabs = tabs && tabs.length > 0 ? tabs : [DEFAULT_TAB];
      const merged = [...baseTabs, ...extraTabs, ...value.map((v) => v.tab)];
      return Array.from(new Set(merged));
    }, [tabs, extraTabs, value]);

    const getEntry = (name: string): EzSimpleFormConfigValue =>
      value.find((v) => v.name === name) ?? { name, tab: allTabs[0], visible: false };

    const emitChange = (name: string, patch: Partial<Omit<EzSimpleFormConfigValue, 'name'>>) => {
      const exists = value.some((v) => v.name === name);
      const next = exists
        ? value.map((v) => (v.name === name ? { ...v, ...patch } : v))
        : [...value, { ...getEntry(name), ...patch }];
      onChange(next);
    };

    const handleToggleVisible = (name: string, visible: boolean) => {
      emitChange(name, { visible });
    };

    const handleChangeTab = (name: string, tab: string) => {
      emitChange(name, { tab });
    };

    const handleAddTab = () => {
      const trimmed = newTabName.trim();
      if (!trimmed || allTabs.includes(trimmed)) return;
      setExtraTabs((prev) => [...prev, trimmed]);
      setNewTabName('');
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-4 w-full rounded-[12px] border border-gray-200 bg-white p-4',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-brand-600" />
          <span className="text-[14px] font-semibold text-gray-900">
            Configuração do formulário
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {availableFields.map((field) => {
            const entry = getEntry(field.name);
            const checkId = `${baseId}-check-${field.name}`;
            const tabSelectId = `${baseId}-tab-${field.name}`;
            return (
              <div
                key={field.name}
                data-testid={`ez-simple-form-config-field-${field.name}`}
                className="flex items-center justify-between gap-3 rounded-[8px] border border-gray-100 px-3 py-2"
              >
                <EzCheck
                  id={checkId}
                  label={field.label}
                  checked={entry.visible}
                  onChange={(e) => handleToggleVisible(field.name, e.target.checked)}
                />

                <EzComboBox
                  id={tabSelectId}
                  aria-label={`Aba de ${field.label}`}
                  value={entry.tab}
                  onChange={(e) => handleChangeTab(field.name, e.target.value)}
                  className="w-auto max-w-[180px]"
                >
                  {allTabs.map((tab) => (
                    <option key={tab} value={tab}>
                      {tab}
                    </option>
                  ))}
                </EzComboBox>
              </div>
            );
          })}
        </div>

        <div className="flex items-end gap-2 border-t border-gray-100 pt-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor={`${baseId}-new-tab`} className="text-[13px] font-medium text-gray-900">
              Nova aba
            </label>
            <input
              id={`${baseId}-new-tab`}
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="Nome da nova aba"
              className={cn(
                'h-[36px] w-full rounded-[8px] border border-gray-200 px-3 text-[14px] text-gray-900',
                'outline-none focus-visible:border-brand-600 focus-visible:ring-1 focus-visible:ring-brand-600'
              )}
            />
          </div>
          <EzButton
            variant="secondary"
            size="small"
            leftIcon={Plus}
            label="Adicionar aba"
            onClick={handleAddTab}
            disabled={!newTabName.trim()}
          />
        </div>

        {(onSave || onCancel) && (
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            {onCancel && (
              <EzButton variant="secondary" size="small" label="Cancelar" onClick={onCancel} />
            )}
            {onSave && <EzButton variant="primary" size="small" label="Salvar" onClick={onSave} />}
          </div>
        )}
      </div>
    );
  }
);

EzSimpleFormConfig.displayName = 'EzSimpleFormConfig';
