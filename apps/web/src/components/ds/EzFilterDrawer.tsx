import { ReactNode } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { cn } from './utils';

export interface EzFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Aponta DS Filter Drawer / Panel (Sankhya ERP Painel de Filtros lateral).
 * Displays a collapsible filter panel on the left side of the entity grid.
 */
export function EzFilterDrawer({
  isOpen,
  onClose,
  onClear,
  title = 'Painel de Filtros',
  children,
  className,
}: EzFilterDrawerProps) {
  if (!isOpen) return null;

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
        {children}
      </div>
    </aside>
  );
}
