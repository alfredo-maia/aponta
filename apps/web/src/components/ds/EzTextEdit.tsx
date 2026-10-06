import { InputHTMLAttributes, KeyboardEvent, forwardRef, useState } from 'react';
import { cn } from './utils';
import { Pencil } from 'lucide-react';

export interface EzTextEditProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  /**
   * The current text value.
   */
  value: string;
  /**
   * Called with the new value when editing is committed (Enter or blur).
   */
  onChange: (value: string) => void;
  /**
   * Optional extra callback fired alongside `onChange` when the value is saved.
   */
  onSave?: (value: string) => void;
}

/**
 * Aponta DS Text Edit (inspired by @sankhyalabs/ezui)
 * Clickable text that turns into an inline editable input; Enter or blur saves it.
 */
export const EzTextEdit = forwardRef<HTMLInputElement, EzTextEditProps>(
  ({ value, onChange, onSave, className, disabled, placeholder, ...props }, ref) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    const startEdit = () => {
      if (disabled) return;
      setDraft(value);
      setEditing(true);
    };

    const commit = () => {
      setEditing(false);
      onChange(draft);
      onSave?.(draft);
    };

    const cancel = () => {
      setDraft(value);
      setEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };

    if (editing) {
      return (
        <input
          ref={ref}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'px-2 py-1 text-[14px] text-gray-900 border border-brand-600 rounded-[8px] outline-none',
            'ring-1 ring-brand-600 bg-white',
            className
          )}
          {...props}
        />
      );
    }

    return (
      <button
        type="button"
        onClick={startEdit}
        disabled={disabled}
        className={cn(
          'group inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] text-[14px] text-gray-900 text-left transition-colors',
          'hover:bg-gray-90 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          className
        )}
      >
        <span className={cn(!value && 'text-gray-400')}>
          {value || placeholder || 'Clique para editar'}
        </span>
        {!disabled && (
          <Pencil className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  }
);

EzTextEdit.displayName = 'EzTextEdit';
