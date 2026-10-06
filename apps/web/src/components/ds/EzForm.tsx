import { forwardRef, FormHTMLAttributes } from 'react';
import { cn } from './utils';

export type EzFormProps = FormHTMLAttributes<HTMLFormElement>;

export const EzForm = forwardRef<HTMLFormElement, EzFormProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={cn('flex flex-col gap-4 rounded-[24px] border border-gray-200 bg-white p-6', className)}
        {...props}
      >
        {children}
      </form>
    );
  }
);

EzForm.displayName = 'EzForm';
