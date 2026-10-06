import { cn } from './utils';
import { EzChip } from './EzChip';
import { EzButton } from './EzButton';
import { Plus } from 'lucide-react';

export interface EzFilterItem {
  id: string;
  label: string;
  value: string;
}

export interface EzFilterProps {
  filters: EzFilterItem[];
  onRemove: (id: string) => void;
  onAdd?: () => void;
  className?: string;
}

export function EzFilter({ filters, onRemove, onAdd, className }: EzFilterProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((filter) => (
        <EzChip
          key={filter.id}
          label={`${filter.label}: ${filter.value}`}
          onRemove={() => onRemove(filter.id)}
        />
      ))}
      {onAdd && (
        <EzButton variant="tertiary" size="small" leftIcon={Plus} label="Adicionar filtro" onClick={onAdd} />
      )}
    </div>
  );
}
