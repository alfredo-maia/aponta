import { HTMLAttributes, forwardRef, useState } from 'react';
import { Rows3, Columns2 } from 'lucide-react';
import { cn } from './utils';

/** Layout mode for form fields. */
export type EzLayoutFormConfigLayout = 'CASCADE' | 'SIDE_BY_SIDE';

export type EzLayoutFormConfigProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange'
> & {
  /**
   * Initially selected layout.
   * @default 'CASCADE'
   */
  defaultLayout?: EzLayoutFormConfigLayout;
  /**
   * Fired whenever the user picks a different layout option.
   * The caller decides where (if anywhere) to persist the value.
   */
  onChange: (layout: EzLayoutFormConfigLayout) => void;
};

type OptionDef = {
  value: EzLayoutFormConfigLayout;
  label: string;
};

const OPTIONS: OptionDef[] = [
  { value: 'CASCADE', label: 'Cascata' },
  { value: 'SIDE_BY_SIDE', label: 'Lado a lado' },
];

/** Simple visual preview of stacked (cascade) fields. */
function CascadePreview({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 w-full',
        active ? 'text-brand-600' : 'text-gray-300'
      )}
      aria-hidden="true"
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className={cn(
            'h-2 w-full rounded-sm',
            active ? 'bg-brand-200' : 'bg-gray-90'
          )}
        />
      ))}
    </div>
  );
}

/** Simple visual preview of side-by-side fields. */
function SideBySidePreview({ active }: { active: boolean }) {
  return (
    <div className="flex gap-1 w-full" aria-hidden="true">
      {[0, 1].map((col) => (
        <div
          key={col}
          className={cn(
            'h-5 flex-1 rounded-sm',
            active ? 'bg-brand-200' : 'bg-gray-90'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Aponta DS Layout Form Config
 * Visual toggle to choose how form fields are arranged: stacked one below
 * the other (`CASCADE`) or side by side, adjusting to the screen width
 * (`SIDE_BY_SIDE`). Mirrors Sankhya DS `snk-layout-form-config` modes, but
 * without the global singleton / server-side persistence: the caller
 * decides where (if anywhere) to persist the chosen layout via `onChange`.
 */
export const EzLayoutFormConfig = forwardRef<HTMLDivElement, EzLayoutFormConfigProps>(
  ({ defaultLayout = 'CASCADE', onChange, className, ...props }, ref) => {
    const [selected, setSelected] = useState<EzLayoutFormConfigLayout>(defaultLayout);

    const handleSelect = (value: EzLayoutFormConfigLayout) => {
      setSelected(value);
      onChange(value);
    };

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label="Configuração de layout do formulário"
        className={cn('flex items-stretch gap-3', className)}
        {...props}
      >
        {OPTIONS.map((option) => {
          const isActive = selected === option.value;
          const Preview = option.value === 'CASCADE' ? CascadePreview : SideBySidePreview;
          const Icon = option.value === 'CASCADE' ? Rows3 : Columns2;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-[12px] border p-3 min-w-[120px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
                isActive
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex h-10 w-full items-center justify-center px-2">
                <Preview active={isActive} />
              </div>
              <div className="flex items-center gap-1.5">
                <Icon
                  className={cn('w-4 h-4', isActive ? 'text-brand-600' : 'text-gray-400')}
                />
                <span
                  className={cn(
                    'text-[13px] font-medium',
                    isActive ? 'text-brand-700' : 'text-gray-600'
                  )}
                >
                  {option.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

EzLayoutFormConfig.displayName = 'EzLayoutFormConfig';
