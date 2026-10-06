import { HTMLAttributes, forwardRef, useState } from 'react';
import { cn } from './utils';
import { EzChip } from './EzChip';
import { EzPopover } from './EzPopover';
import { EzModal } from './EzModal';
import { EzButton } from './EzButton';
import { Eraser, Pin, PinOff, SlidersHorizontal, Trash2 } from 'lucide-react';

/**
 * Generic, server-agnostic filter definition rendered by `EzFilterBar`.
 * Mirrors the shape used by Sankhya's `snk-filter-item`, without any
 * coupling to `SnkApplication` / `DataUnit`.
 */
export type FilterDef = {
  /** Unique identifier of the filter. */
  id: string;
  /** Human readable label shown on the chip and inside the modal. */
  label: string;
  /** Group used to cluster filters inside the "Filtros" modal. */
  category: string;
  /** Current value of the filter (free-form; rendered as text on the chip). */
  value?: string;
  /** Whether the filter is currently shown as a chip on the bar. */
  active: boolean;
  /** Whether the filter is pinned (kept first / protected from bulk clearing). */
  pinned?: boolean;
};

export type EzFilterBarProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** Full list of filters known to the screen (active and inactive). */
  filters: FilterDef[];
  /** Called with the single updated filter whenever it changes via the quick-edit popover. */
  onFilterChange: (filter: FilterDef) => void;
  /** Called with the full filters list when the user clicks "Aplicar" in the management modal. */
  onApplyAll: (filters: FilterDef[]) => void;
  /** Optional title rendered before the chips. */
  title?: string;
};

/**
 * Aponta DS Filter Bar
 * Visual behavior mirror of Sankhya's `snk-filter-bar`: a horizontally
 * scrollable row of chips for active filters, a quick-edit popover per chip
 * (clear / pin / remove) and a "Filtros" button opening a full management
 * modal with every filter grouped by category plus bulk apply.
 *
 * Fully generic: no `SnkApplication` / `DataUnit` dependency — the screen
 * owns the `filters` state and reacts to `onFilterChange` / `onApplyAll`.
 */
export const EzFilterBar = forwardRef<HTMLDivElement, EzFilterBarProps>(
  ({ filters, onFilterChange, onApplyAll, title, className, ...props }, ref) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState<FilterDef[]>(filters);

    const activeFilters = filters.filter((f) => f.active);

    const categories = Array.from(new Set(filters.map((f) => f.category)));

    const openModal = () => {
      setDraftFilters(filters);
      setIsModalOpen(true);
    };

    const toggleDraftActive = (id: string) => {
      setDraftFilters((prev) =>
        prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
      );
    };

    const handleApply = () => {
      onApplyAll(draftFilters);
      setIsModalOpen(false);
    };

    const handleClear = (filter: FilterDef) => {
      onFilterChange({ ...filter, value: '' });
    };

    const handleTogglePin = (filter: FilterDef) => {
      onFilterChange({ ...filter, pinned: !filter.pinned });
    };

    const handleRemove = (filter: FilterDef) => {
      onFilterChange({ ...filter, active: false });
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2 w-full', className)}
        {...props}
      >
        {title && (
          <span className="shrink-0 text-[14px] font-semibold text-gray-900 max-w-[250px] truncate">
            {title}
          </span>
        )}

        <div className="flex items-center gap-2 overflow-x-auto flex-1 py-1" role="list" aria-label="Filtros ativos">
          {activeFilters.map((filter) => (
            <EzPopover
              key={filter.id}
              align="left"
              trigger={
                <EzChip
                  label={`${filter.label}: ${filter.value || ''}`}
                  colorClass={cn(
                    'bg-brand-100/50 text-brand-700 border-brand-200',
                    filter.pinned && 'border-brand-500'
                  )}
                />
              }
              content={
                <div className="flex flex-col gap-2 min-w-[180px]">
                  <span className="text-[13px] font-semibold text-gray-900">{filter.label}</span>
                  <button
                    type="button"
                    onClick={() => handleClear(filter)}
                    className="flex items-center gap-2 text-[13px] text-gray-700 hover:text-brand-700 transition-colors"
                  >
                    <Eraser className="w-4 h-4" />
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePin(filter)}
                    className="flex items-center gap-2 text-[13px] text-gray-700 hover:text-brand-700 transition-colors"
                  >
                    {filter.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    {filter.pinned ? 'Desafixar' : 'Fixar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(filter)}
                    className="flex items-center gap-2 text-[13px] text-red-600 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover
                  </button>
                </div>
              }
            />
          ))}
        </div>

        <EzButton
          variant="secondary"
          size="small"
          label="Filtros"
          leftIcon={SlidersHorizontal}
          onClick={openModal}
          className="shrink-0"
        />

        <EzModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Filtros"
          maxWidth="lg"
          footer={
            <>
              <EzButton variant="tertiary" size="small" label="Cancelar" onClick={() => setIsModalOpen(false)} />
              <EzButton variant="primary" size="small" label="Aplicar" onClick={handleApply} />
            </>
          }
        >
          <div className="flex flex-col gap-6">
            {categories.map((category) => (
              <div key={category} className="flex flex-col gap-3">
                <span className="text-[14px] font-semibold text-gray-900">{category}</span>
                <div className="flex flex-col gap-2">
                  {draftFilters
                    .filter((f) => f.category === category)
                    .map((filter) => (
                      <label
                        key={filter.id}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          aria-label={filter.label}
                          checked={filter.active}
                          onChange={() => toggleDraftActive(filter.id)}
                          className={cn(
                            'w-4 h-4 rounded border-gray-300 text-brand-600',
                            'focus-visible:ring-2 focus-visible:ring-brand-200 focus:outline-none'
                          )}
                        />
                        <span className="text-[13px] text-gray-700">{filter.label}</span>
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </EzModal>
      </div>
    );
  }
);

EzFilterBar.displayName = 'EzFilterBar';
