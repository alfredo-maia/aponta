import { forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { cn } from './utils';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface EzTextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * The text label displayed above the input.
   */
  label?: string;
  /**
   * Optional helper or error message displayed below the input.
   */
  message?: string;
  /**
   * Indicates an error state (changes border and message color to red).
   */
  hasError?: boolean;
  /**
   * The size of the input.
   * @default 'medium'
   */
  size?: 'slim' | 'medium';
  /**
   * Optional icon to display on the left side inside the input.
   */
  leftIcon?: ReactNode;
  /**
   * Optional icon to display on the right side inside the input (e.g., search or clear icon).
   * Note: if `type="password"`, a toggle visibility icon is shown by default.
   */
  rightIcon?: ReactNode;
}

/**
 * Aponta DS Text Input (inspired by @sankhyalabs/ezui)
 * React native implementation with Tailwind CSS.
 */
export const EzTextInput = forwardRef<HTMLInputElement, EzTextInputProps>(
  (
    {
      label,
      message,
      hasError = false,
      size = 'medium',
      leftIcon,
      rightIcon,
      className,
      disabled,
      type = 'text',
      required,
      id,
      ...props
    },
    ref
  ) => {
    const isPassword = type === 'password';
    const [passwordVisible, setPasswordVisible] = useState(false);

    const actualType = isPassword && passwordVisible ? 'text' : type;
    const isSlim = size === 'slim';

    // The container classes mimicking Sankhya's --text-input states
    const wrapperClasses = cn(
      'relative flex items-center w-full overflow-hidden transition-colors border',
      'rounded-[12px] bg-white group',
      // Focus within handles the active border outline
      'focus-within:border-ocean-600 focus-within:ring-1 focus-within:ring-ocean-600',
      // Base vs Error border
      hasError ? 'border-red-600 ring-red-600' : 'border-gray-200 hover:border-gray-300',
      // Disabled state
      disabled && 'bg-gray-80 border-gray-100 cursor-not-allowed',
      // Sizing
      isSlim ? 'h-[32px]' : 'h-[42px]'
    );

    return (
      <div className={cn('flex flex-col w-full gap-1.5', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-[14px] font-medium leading-none mb-0.5 select-none',
              disabled ? 'text-gray-400' : 'text-gray-900',
              hasError && 'text-red-700'
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-600">*</span>}
          </label>
        )}

        <div className={wrapperClasses}>
          {leftIcon && (
            <div
              className={cn(
                'flex items-center justify-center shrink-0 pl-3 pr-2 text-gray-500',
                disabled && 'text-gray-300'
              )}
            >
              <span className="w-5 h-5 flex items-center justify-center">{leftIcon}</span>
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={actualType}
            disabled={disabled}
            required={required}
            className={cn(
              'flex-1 w-full bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400 h-full',
              // Padding adjustments based on icons presence
              !leftIcon && 'pl-4',
              !(rightIcon || isPassword) && 'pr-4',
              disabled && 'text-gray-400 placeholder:text-gray-300 cursor-not-allowed'
            )}
            {...props}
          />

          {(rightIcon || isPassword) && (
            <div
              className={cn(
                'flex items-center justify-center shrink-0 pr-3 pl-2 text-gray-500',
                disabled && 'text-gray-300'
              )}
            >
              {isPassword ? (
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={disabled}
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-200 hover:text-gray-700 transition-colors"
                  aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {passwordVisible ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <span className="w-5 h-5 flex items-center justify-center">{rightIcon}</span>
              )}
            </div>
          )}
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-[12px] font-medium leading-none mt-0.5',
              hasError ? 'text-red-700' : 'text-gray-500',
              disabled && 'text-gray-400'
            )}
          >
            {hasError && <AlertCircle className="w-3.5 h-3.5" />}
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  }
);

EzTextInput.displayName = 'EzTextInput';
