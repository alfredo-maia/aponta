import { ChangeEvent } from 'react';
import { cn } from './utils';
import { Filter, SlidersHorizontal } from 'lucide-react';

export interface EzFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  onOpenAdvanced?: () => void;
  placeholder?: string;
  className?: string;
}

export function EzFilterInput({ value, onChange, onOpenAdvanced, placeholder = 'Buscar...', className }: EzFilterInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);

  return (
    <div
      className={cn(
        'flex h-[32px] w-full items-center gap-1.5 rounded-none border border-gray-300 bg-white px-2',
        'focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600',
        className
      )}
    >
      <Filter className="h-4 w-4 shrink-0 text-gray-500" />
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full flex-1 border-none bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
      />
      {onOpenAdvanced && (
        <button onClick={onOpenAdvanced} aria-label="Filtros avançados" className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-90 hover:text-brand-600">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
