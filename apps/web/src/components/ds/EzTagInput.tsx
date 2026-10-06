import { InputHTMLAttributes, KeyboardEvent, forwardRef, useState } from 'react';
import { cn } from './utils';
import { X } from 'lucide-react';

export interface EzTagInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  /**
   * The current list of tags.
   */
  tags: string[];
  /**
   * Called with the full updated tag list whenever a tag is added or removed.
   */
  onChange: (tags: string[]) => void;
  /**
   * Placeholder shown in the text field when there are no tags yet.
   */
  placeholder?: string;
  /**
   * Optional label displayed above the field.
   */
  label?: string;
}

/**
 * Aponta DS Tag Input (inspired by @sankhyalabs/ezui)
 * A text field that turns typed text into removable tags (Enter to add, X to remove).
 */
export const EzTagInput = forwardRef<HTMLInputElement, EzTagInputProps>(
  (
    {
      tags,
      onChange,
      placeholder = 'Adicionar e pressionar Enter...',
      label,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = useState('');

    const addTag = () => {
      const value = draft.trim();
      if (!value) return;
      if (!tags.includes(value)) {
        onChange([...tags, value]);
      }
      setDraft('');
    };

    const removeTag = (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    };

    return (
      <div className={cn('flex flex-col w-full gap-1.5', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-[14px] font-medium leading-none mb-0.5 select-none',
              disabled ? 'text-gray-400' : 'text-gray-900'
            )}
          >
            {label}
          </label>
        )}

        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5 w-full min-h-[42px] px-2 py-1.5 border rounded-[12px] bg-white transition-colors',
            'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
            'border-gray-200 hover:border-gray-300',
            disabled && 'bg-gray-80 border-gray-100 cursor-not-allowed'
          )}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-[24px] bg-brand-100/50 border border-brand-200 text-brand-700 text-[12px] font-medium px-2 py-1"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remover ${tag}`}
                  className="rounded-full hover:bg-brand-200/60 p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          <input
            ref={ref}
            id={id}
            type="text"
            disabled={disabled}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400 py-1"
            {...props}
          />
        </div>
      </div>
    );
  }
);

EzTagInput.displayName = 'EzTagInput';
