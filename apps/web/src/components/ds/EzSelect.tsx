import { SelectHTMLAttributes, forwardRef } from 'react';

export interface EzSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  message?: string;
  hasError?: boolean;
}

/** Stub neutro (DMTE-490 T2): a implementação entra depois do RED. */
export const EzSelect = forwardRef<HTMLSelectElement, EzSelectProps>(() => <div />);
EzSelect.displayName = 'EzSelect';
