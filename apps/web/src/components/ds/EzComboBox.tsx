import { SelectHTMLAttributes, forwardRef } from 'react';
import { EzSelect } from './EzSelect';

export interface EzComboBoxProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  message?: string;
  hasError?: boolean;
}

/**
 * Aponta DS Combo Box (Select): `<option>` children API on top of EzSelect.
 */
export const EzComboBox = forwardRef<HTMLSelectElement, EzComboBoxProps>((props, ref) => (
  <EzSelect ref={ref} {...props} />
));

EzComboBox.displayName = 'EzComboBox';
