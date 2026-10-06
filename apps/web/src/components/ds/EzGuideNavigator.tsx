import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';
import { Check } from 'lucide-react';

export interface EzGuideNavigatorStep {
  id: string | number;
  label: string;
}

export interface EzGuideNavigatorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /**
   * Ordered list of steps to display.
   */
  steps: EzGuideNavigatorStep[];
  /**
   * Zero-based index of the current active step.
   */
  currentStep: number;
  /**
   * Called when a step (number or label) is clicked, with its index.
   */
  onStepClick?: (index: number) => void;
}

/**
 * Aponta DS Guide Navigator
 * Wizard-like step navigator: numbered steps connected by a line, current
 * step highlighted in brand-600, completed steps shown with a check mark.
 */
export const EzGuideNavigator = forwardRef<HTMLDivElement, EzGuideNavigatorProps>(
  ({ steps, currentStep, onStepClick, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="list"
        className={cn('flex items-start w-full', className)}
        {...props}
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;
          const isClickable = !!onStepClick;

          return (
            <div
              key={step.id}
              role="listitem"
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => onStepClick?.(index)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-semibold border-2 transition-colors shrink-0 outline-none',
                    isClickable && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-200',
                    !isClickable && 'cursor-default',
                    isCurrent && 'bg-brand-600 border-brand-600 text-gray-70',
                    isCompleted && !isCurrent && 'bg-brand-600 border-brand-600 text-gray-70',
                    !isCurrent && !isCompleted && 'bg-white border-gray-200 text-gray-400'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </button>
                <span
                  className={cn(
                    'text-[12px] font-medium text-center max-w-[96px] truncate',
                    isCurrent ? 'text-brand-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mb-5 rounded-full transition-colors',
                    index < currentStep ? 'bg-brand-600' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

EzGuideNavigator.displayName = 'EzGuideNavigator';
