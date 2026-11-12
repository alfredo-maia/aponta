import {
  Children,
  Fragment,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { cn } from './utils';

export interface EzSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  message?: string;
  hasError?: boolean;
  /**
   * `default` follows EzComboBox (rounded, 42px); `classic` follows
   * EzClassicComboBox (square corners, denser); `compact` is the 32px control
   * (44px touch target below `sm`) for toolbars, grids and filters.
   * @default 'default'
   */
  variant?: 'default' | 'classic' | 'compact';
}

interface Option {
  value: string;
  label: string;
  disabled: boolean;
}

/** Flattens `<option>` children, including the ones inside fragments and `<optgroup>`. */
function readOptions(children: ReactNode, found: Option[] = []): Option[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode; value?: unknown; disabled?: boolean }>;
    if (element.type === Fragment || element.type === 'optgroup') {
      readOptions(element.props.children, found);
    } else if (element.type === 'option') {
      const label = Children.toArray(element.props.children).join('');
      found.push({ value: String(element.props.value ?? label), label, disabled: Boolean(element.props.disabled) });
    }
  });
  return found;
}

const NATIVE_VALUE_SETTER = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;

/**
 * Aponta DS Select: single choice with its own listbox (the browser's native
 * list can't be styled). Palette `brand-*`/`gray-*` only.
 *
 * A visually hidden native `<select>` stays in the DOM as the form control:
 * it receives `id`, `name`, `ref`, `data-testid`, `value`/`defaultValue` and
 * fires `onChange`, so forms and `userEvent.selectOptions` keep working.
 */
export const EzSelect = forwardRef<HTMLSelectElement, EzSelectProps>(
  (
    { label, message, hasError, variant = 'default', className, disabled, required, id, children, value, defaultValue, onChange, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const listId = `${fieldId}-listbox`;
    const classic = variant === 'classic';
    const compact = variant === 'compact';
    const dense = classic || compact;

    const nativeRef = useRef<HTMLSelectElement>(null);
    const anchorRef = useRef<HTMLDivElement>(null);
    const controlRef = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => nativeRef.current as HTMLSelectElement);

    const options = readOptions(children);
    const [uncontrolled, setUncontrolled] = useState(String(defaultValue ?? options[0]?.value ?? ''));
    const current = value !== undefined ? String(value) : uncontrolled;
    const selected = options.find((o) => o.value === current);

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    useEffect(() => {
      if (!open) return;
      const closeOnOutsideClick = (event: MouseEvent) => {
        if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', closeOnOutsideClick);
      return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [open]);

    const openList = () => {
      const index = options.findIndex((o) => o.value === current && !o.disabled);
      setActive(index >= 0 ? index : options.findIndex((o) => !o.disabled));
      setOpen(true);
    };

    const choose = (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      NATIVE_VALUE_SETTER?.call(nativeRef.current, option.value);
      nativeRef.current?.dispatchEvent(new Event('change', { bubbles: true }));
      setOpen(false);
      controlRef.current?.focus();
    };

    const step = (direction: 1 | -1) => {
      for (let i = active + direction; i >= 0 && i < options.length; i += direction) {
        if (!options[i].disabled) return setActive(i);
      }
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
      const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
          event.preventDefault();
          if (!open) openList();
          else step(event.key === 'ArrowDown' ? 1 : -1);
          break;
        case 'Home':
        case 'End':
          if (!open) break;
          event.preventDefault();
          setActive(event.key === 'Home' ? enabled[0] : enabled[enabled.length - 1]);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (open) choose(active);
          else openList();
          break;
        case 'Escape':
          if (!open) break;
          event.stopPropagation();
          setOpen(false);
          break;
        case 'Tab':
          setOpen(false);
          break;
      }
    };

    const accessibleName = label ?? props['aria-label'];

    return (
      <div className={cn('flex flex-col w-full', dense ? 'gap-1' : 'gap-1.5', className)}>
        {label && (
          <div className="flex items-center mb-0.5">
            <label
              htmlFor={fieldId}
              className={cn(
                'font-medium leading-none select-none',
                dense ? 'text-[13px]' : 'text-[14px]',
                disabled ? 'text-gray-400' : 'text-gray-900',
                hasError && 'text-red-700',
              )}
            >
              {label}
            </label>
            {required && (
              <span aria-hidden="true" className="ml-1 text-red-600">
                *
              </span>
            )}
          </div>
        )}

        <div ref={anchorRef} className="relative">
          <div
            className={cn(
              'relative flex items-center w-full overflow-hidden transition-colors border bg-white',
              classic ? 'rounded-none h-[34px]' : compact ? 'rounded-[8px] h-11 sm:h-[32px]' : 'rounded-[12px] h-[42px]',
              'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
              hasError
                ? 'border-red-600 ring-red-600'
                : classic
                  ? 'border-gray-300 hover:border-gray-400'
                  : 'border-gray-200 hover:border-gray-300',
              disabled && 'bg-gray-80 border-gray-200 cursor-not-allowed',
            )}
          >
            <select
              ref={nativeRef}
              id={fieldId}
              aria-hidden="true"
              tabIndex={-1}
              className="sr-only"
              disabled={disabled}
              required={required}
              {...(value !== undefined ? { value } : { defaultValue })}
              onChange={(event) => {
                setUncontrolled(event.target.value);
                onChange?.(event);
              }}
              {...props}
            >
              {children}
            </select>
            <button
              ref={controlRef}
              type="button"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={open ? `${listId}-${active}` : undefined}
              aria-invalid={hasError || undefined}
              aria-label={accessibleName}
              disabled={disabled}
              onClick={() => (open ? setOpen(false) : openList())}
              onKeyDown={onKeyDown}
              className={cn(
                'flex h-full w-full items-center justify-between gap-2 bg-transparent text-left text-gray-900 outline-none',
                dense ? 'pl-2 pr-2 text-[13px]' : 'pl-4 pr-3 text-[14px]',
                disabled && 'text-gray-400 cursor-not-allowed',
              )}
            >
              <span className="truncate">{selected?.label}</span>
              <ChevronDown className={cn('shrink-0 text-gray-500', dense ? 'w-3.5 h-3.5' : 'w-4 h-4')} aria-hidden="true" />
            </button>
          </div>

          {open && (
            <ul
              id={listId}
              role="listbox"
              aria-label={accessibleName}
              className={cn(
                'absolute left-0 top-full z-30 mt-1 max-h-60 w-max min-w-full max-w-[24rem] overflow-auto border border-gray-200 bg-white py-1 shadow-popover',
                classic ? 'rounded-none' : compact ? 'rounded-[8px]' : 'rounded-[12px]',
              )}
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.value === current}
                  aria-disabled={option.disabled || undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => !option.disabled && setActive(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    'flex items-center justify-between gap-2 px-3 py-1.5 text-[13px]',
                    option.disabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-900',
                    index === active && !option.disabled && 'bg-brand-50',
                    option.value === current && 'font-medium text-brand-700',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === current && <Check className="w-4 h-4 shrink-0 text-brand-600" aria-hidden="true" />}
                </li>
              ))}
            </ul>
          )}
        </div>

        {message && (
          <div
            className={cn(
              'flex items-center gap-1.5 font-medium leading-none mt-0.5',
              dense ? 'text-[11px]' : 'text-[12px]',
              hasError ? 'text-red-700' : 'text-gray-500',
              disabled && 'text-gray-400',
            )}
          >
            {hasError && <AlertCircle className={dense ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  },
);

EzSelect.displayName = 'EzSelect';
