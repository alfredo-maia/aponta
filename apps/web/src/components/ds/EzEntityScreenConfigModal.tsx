import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, Eye, EyeOff, Search, Settings } from 'lucide-react';
import { EzTabs } from './EzTabs';
import { EzLayoutFormConfig, EzLayoutFormConfigLayout } from './EzLayoutFormConfig';
import { cn } from './utils';

export interface ScreenConfigColumnItem {
  id: string;
  label: string;
  isVisible: boolean;
}

export interface EzEntityScreenConfigModalProps {
  columns: ScreenConfigColumnItem[];
  onToggleColumn: (colId: string) => void;
  density: 'compact' | 'comfortable';
  onDensityChange: (density: 'compact' | 'comfortable') => void;
  formLayout: EzLayoutFormConfigLayout;
  onFormLayoutChange: (layout: EzLayoutFormConfigLayout) => void;
  onRestoreDefaults: () => void;
  onClose: () => void;
  initialTab?: 'grid' | 'form';
}

export function EzEntityScreenConfigModal({
  columns,
  onToggleColumn,
  density,
  onDensityChange,
  formLayout,
  onFormLayoutChange,
  onRestoreDefaults,
  onClose,
  initialTab = 'grid',
}: EzEntityScreenConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'form'>(initialTab);
  const [search, setSearch] = useState('');

  const filteredColumns = columns.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <div
      data-testid="ez-entity-screen-config-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Configuração da tela por usuário"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
    >
      <div className="flex flex-col bg-white rounded-[12px] shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50/70">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-600" />
            <h2 className="text-[14px] font-semibold text-gray-900">
              Personalização da Tela (Usuário)
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="p-1 rounded-[6px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="px-5 pt-3 border-b border-gray-100">
          <EzTabs
            tabs={[
              { id: 'grid', label: 'Modo Grade (Colunas & Densidade)' },
              { id: 'form', label: 'Modo Formulário (Layout)' },
            ]}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as 'grid' | 'form')}
          />
        </div>

        {/* Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {activeTab === 'grid' ? (
            <div className="space-y-4">
              {/* Density Options */}
              <div className="flex items-center justify-between p-3 rounded-[8px] bg-gray-50 border border-gray-200">
                <div>
                  <span className="text-[13px] font-medium text-gray-800 block">Densidade das Linhas</span>
                  <span className="text-[11px] text-gray-500">Compacto (~25px, padrão Sankhya) ou Confortável (~40px)</span>
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-[6px] p-0.5">
                  <button
                    type="button"
                    data-testid="ez-config-density-compact"
                    onClick={() => onDensityChange('compact')}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium rounded-[4px] transition-colors cursor-pointer',
                      density === 'compact'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    Compacto
                  </button>
                  <button
                    type="button"
                    data-testid="ez-config-density-comfortable"
                    onClick={() => onDensityChange('comfortable')}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium rounded-[4px] transition-colors cursor-pointer',
                      density === 'comfortable'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    Confortável
                  </button>
                </div>
              </div>

              {/* Column Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar colunas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-[6px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
                />
              </div>

              {/* Columns Checklist */}
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Visibilidade das Colunas ({columns.filter((c) => c.isVisible).length} de {columns.length} visíveis)
                </span>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {filteredColumns.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-[6px] hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors cursor-pointer select-none text-[12px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={c.isVisible}
                          data-testid={`ez-screen-config-toggle-${c.id}`}
                          onChange={() => onToggleColumn(c.id)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-200 cursor-pointer"
                        />
                        <span className={cn('text-gray-800 font-medium', !c.isVisible && 'text-gray-400 line-through')}>
                          {c.label}
                        </span>
                      </div>
                      {c.isVisible ? (
                        <Eye className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      )}
                    </label>
                  ))}
                  {filteredColumns.length === 0 && (
                    <div className="py-4 text-center text-[12px] text-gray-400">
                      Nenhuma coluna encontrada
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-[13px] font-medium text-gray-800 block">Distribuição dos Campos no Formulário</span>
                <span className="text-[11px] text-gray-500 block mb-3">
                  Escolha como os campos serão dispostos ao abrir o registro em Modo Formulário:
                </span>
                <EzLayoutFormConfig
                  defaultLayout={formLayout}
                  onChange={onFormLayoutChange}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50/80">
          <button
            type="button"
            data-testid="ez-screen-config-restore-defaults"
            onClick={onRestoreDefaults}
            className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>
          <button
            type="button"
            data-testid="ez-screen-config-close"
            onClick={onClose}
            className="px-4 py-1.5 text-[12px] font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-[6px] shadow-sm transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
