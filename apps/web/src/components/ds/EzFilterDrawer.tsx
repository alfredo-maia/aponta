import { ReactNode, useState } from 'react';
import { X, Filter, RotateCcw, Bookmark, Plus, Trash2, Check } from 'lucide-react';
import { cn } from './utils';

export interface SavedFilterItem {
  id: string;
  name: string;
  criteria: Record<string, any>;
}

export interface EzFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Saved filters list for user (Sankhya parity) */
  savedFilters?: SavedFilterItem[];
  /** Callback when user selects a saved filter to apply */
  onApplySavedFilter?: (filter: SavedFilterItem) => void;
  /** Callback when user saves current filter state */
  onSaveCurrentFilter?: (name: string) => void;
  /** Callback when user deletes a saved filter */
  onDeleteSavedFilter?: (filterId: string) => void;
  /** ID of active saved filter, if any */
  activeSavedFilterId?: string | null;
}

/**
 * Aponta DS Filter Drawer / Panel (Sankhya ERP Painel de Filtros lateral).
 * Displays a collapsible filter panel on the left side of the entity grid
 * with dynamic criteria and user-saved filters.
 */
export function EzFilterDrawer({
  isOpen,
  onClose,
  onClear,
  title = 'Painel de Filtros',
  children,
  className,
  savedFilters = [],
  onApplySavedFilter,
  onSaveCurrentFilter,
  onDeleteSavedFilter,
  activeSavedFilterId,
}: EzFilterDrawerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!filterNameInput.trim()) return;
    onSaveCurrentFilter?.(filterNameInput.trim());
    setFilterNameInput('');
    setIsSaving(false);
  };

  return (
    <aside
      data-testid="ez-filter-drawer"
      aria-label="Painel de filtros"
      className={cn(
        'w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full animate-in slide-in-from-left duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-brand-600" />
          <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onClear && (
            <button
              type="button"
              data-testid="ez-filter-drawer-clear"
              aria-label="Limpar filtros"
              title="Limpar filtros"
              onClick={onClear}
              className="p-1 rounded-[4px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            data-testid="ez-filter-drawer-close"
            aria-label="Fechar painel de filtros"
            onClick={onClose}
            className="p-1 rounded-[4px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Saved Filters Section (Sankhya parity) */}
        {(onSaveCurrentFilter || savedFilters.length > 0) && (
          <div className="space-y-2 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-brand-600" />
                Meus Filtros
              </span>
              {onSaveCurrentFilter && !isSaving && (
                <button
                  type="button"
                  data-testid="ez-filter-drawer-save-btn"
                  onClick={() => setIsSaving(true)}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Salvar
                </button>
              )}
            </div>

            {isSaving && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Nome do filtro..."
                  value={filterNameInput}
                  onChange={(e) => setFilterNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setIsSaving(false);
                  }}
                  autoFocus
                  className="flex-1 h-7 px-2 text-[12px] border border-gray-300 rounded-[5px] focus:outline-none focus:border-brand-500"
                  data-testid="ez-filter-drawer-name-input"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  title="Confirmar salvamento"
                  data-testid="ez-filter-drawer-confirm-save"
                  className="h-7 w-7 inline-flex items-center justify-center bg-brand-600 text-white rounded-[5px] hover:bg-brand-700 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSaving(false)}
                  title="Cancelar"
                  className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-[5px] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {savedFilters.length > 0 && (
              <div className="space-y-1 pt-1" data-testid="ez-filter-drawer-saved-list">
                {savedFilters.map((sf) => (
                  <div
                    key={sf.id}
                    className={cn(
                      'group flex items-center justify-between px-2 py-1 rounded-[5px] text-[12px] transition-colors',
                      activeSavedFilterId === sf.id
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onApplySavedFilter?.(sf)}
                      className="flex-1 text-left truncate cursor-pointer"
                    >
                      {sf.name}
                    </button>
                    {onDeleteSavedFilter && (
                      <button
                        type="button"
                        aria-label={`Excluir filtro ${sf.name}`}
                        title="Excluir filtro"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSavedFilter(sf.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-600 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {children}
      </div>
    </aside>
  );
}
