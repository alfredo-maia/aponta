import { X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTabs } from '../../contexts/TabsContext';
import { cn } from '../ds/utils';

/**
 * Workspace tab strip (TiFlux parity): shows every internally-opened tab
 * (the fixed "Tickets" home tab plus any ticket/Busca avançada tabs opened
 * via `useOpenInTab`). Only reflects react-router navigation — it never
 * mounts more than the currently-active route's page (see SPEC R5).
 */
export function TabBar() {
  const { tabs, closeTab } = useTabs();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      role="tablist"
      aria-label="Abas abertas"
      className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 pt-2"
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => navigate(tab.path)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                navigate(tab.path);
              }
            }}
            className={cn(
              'flex max-w-[220px] shrink-0 cursor-pointer items-center gap-2 rounded-t-[8px] border border-b-0 px-3 py-1.5 text-[13px] font-medium transition-colors',
              isActive
                ? 'border-gray-200 bg-gray-80 text-gray-900'
                : 'border-transparent text-gray-500 hover:bg-gray-90',
            )}
          >
            <span className="truncate">{tab.title}</span>
            {tab.closable && (
              <button
                type="button"
                aria-label={`Fechar ${tab.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.path);
                }}
                className="shrink-0 rounded-sm p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TabBar;
