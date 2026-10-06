import { forwardRef } from 'react';
import { cn } from './utils';
import { Minus, Plus } from 'lucide-react';

export interface EzNumberInputProps {
  /**
   * Current numeric value.
   */
  value: number;
  /**
   * Called with the next numeric value whenever it changes (typing or +/- buttons).
   */
  onChange: (value: number) => void;
  /**
   * Minimum allowed value.
   */
  min?: number;
  /**
   * Maximum allowed value.
   */
  max?: number;
  /**
   * Increment/decrement step.
   * @default 1
   */
  step?: number;
  /**
   * The text label displayed above the input.
   */
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Aponta DS Number Input
 * Numeric input with +/- increment/decrement buttons.
 */
export const EzNumberInput = forwardRef<HTMLInputElement, EzNumberInputProps>(
  ({ value, onChange, min, max, step = 1, label, disabled, id, className }, ref) => {
    const clamp = (next: number) => {
      let result = next;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      return result;
    };

    const canDecrement = !disabled && (min === undefined || value - step >= min);
    const canIncrement = !disabled && (max === undefined || value + step <= max);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || raw === '-') {
        onChange(0);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) {
        onChange(clamp(parsed));
      }
    };

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn('text-[14px] font-medium leading-none mb-0.5 select-none', disabled ? 'text-gray-400' : 'text-gray-900')}
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center w-fit h-[42px] border rounded-[12px] bg-white overflow-hidden',
            'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
            disabled ? 'bg-gray-80 border-gray-100 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <button
            type="button"
            disabled={!canDecrement}
            onClick={() => onChange(clamp(value - step))}
            aria-label="Diminuir"
            className="flex items-center justify-center w-[42px] h-full text-gray-500 hover:bg-gray-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Minus className="w-4 h-4" />
          </button>

          <input
            ref={ref}
            id={id}
            type="number"
            inputMode="numeric"
            disabled={disabled}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleInputChange}
            className="w-16 h-full text-center bg-transparent border-none outline-none text-[14px] text-gray-900 disabled:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            type="button"
            disabled={!canIncrement}
            onClick={() => onChange(clamp(value + step))}
            aria-label="Aumentar"
            className="flex items-center justify-center w-[42px] h-full text-gray-500 hover:bg-gray-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);

EzNumberInput.displayName = 'EzNumberInput';
