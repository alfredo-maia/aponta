import { ReactNode } from 'react';
import { cn } from './utils';

export interface EzFormViewField {
  label: string;
  value: ReactNode;
}

export interface EzFormViewProps {
  fields: EzFormViewField[];
  className?: string;
}

export function EzFormView({ fields, className }: EzFormViewProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      {fields.map((field, index) => (
        <div key={index} className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium uppercase text-gray-500">{field.label}</span>
          <span className="text-[13px] text-gray-900">{field.value}</span>
        </div>
      ))}
    </div>
  );
}
