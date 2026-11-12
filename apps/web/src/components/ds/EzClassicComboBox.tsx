import { SelectHTMLAttributes, forwardRef } from 'react';
import { EzSelect } from './EzSelect';

export interface EzClassicComboBoxOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface EzClassicComboBoxProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  message?: string;
  hasError?: boolean;
  /**
   * Options of the select.
   */
  options: EzClassicComboBoxOption[];
}

/**
 * Aponta DS Classic Combo Box (inspired by @sankhyalabs/ezui)
 * EzSelect with the "classic" Sankhya visual: square corners, denser layout.
 */
export const EzClassicComboBox = forwardRef<HTMLSelectElement, EzClassicComboBoxProps>(
  ({ options, ...props }, ref) => (
    <EzSelect ref={ref} variant="classic" {...props}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </EzSelect>
  )
);

EzClassicComboBox.displayName = 'EzClassicComboBox';
