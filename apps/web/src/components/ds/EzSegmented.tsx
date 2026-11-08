import { cn } from './utils';

export interface EzSegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface EzSegmentedProps<T extends string> {
  options: EzSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nome acessível do grupo (ex.: "Visualização"). */
  'aria-label': string;
  className?: string;
}

/**
 * Aponta DS Segmented control: alterna entre visões do mesmo conteúdo (ex.: Lista/Kanban).
 * Botões com `aria-pressed` dentro de um grupo nomeado. Não usa semântica de aba
 * (`tab`/`aria-selected`) porque não há painéis; por isso não reaproveita o `EzTabs`.
 */
export function EzSegmented<T extends string>({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: EzSegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex h-[var(--control-height-md)] shrink-0 items-center rounded-control border border-gray-200 bg-gray-90 p-1 text-[13px]',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-full cursor-pointer rounded-[6px] border px-3 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500',
              selected
                ? 'border-gray-200 bg-white text-brand-600 shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-900',
              option.disabled && 'cursor-not-allowed opacity-50 hover:text-gray-500',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default EzSegmented;
