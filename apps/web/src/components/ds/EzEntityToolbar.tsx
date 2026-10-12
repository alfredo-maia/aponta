import { useRef, useState, useEffect, forwardRef, HTMLAttributes } from 'react';
import {
  Filter,
  LayoutGrid,
  FileText,
  ChevronDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Copy,
  RefreshCw,
  Zap,
  Paperclip,
  Settings,
  SlidersHorizontal,
  Columns2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from './utils';

export interface EzEntityToolbarAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface EzEntityToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current mode: 'GRID' (modo grade) or 'FORM' (modo formulário). */
  viewMode: 'GRID' | 'FORM';
  /** Fired when the user switches between grid and form mode. */
  onToggleViewMode: (mode: 'GRID' | 'FORM') => void;
  /** Whether the filter panel is open. */
  isFilterOpen?: boolean;
  /** Fired when the user clicks the filter panel toggle button. */
  onToggleFilter?: () => void;
  /** Fired when the user clicks "Incluir" (+). */
  onInsert?: () => void;
  /** Fired when the user clicks "Anterior" (<). */
  onPrevious?: () => void;
  /** Whether previous navigation is available. */
  hasPrevious?: boolean;
  /** Fired when the user clicks "Próximo" (>). */
  onNext?: () => void;
  /** Whether next navigation is available. */
  hasNext?: boolean;
  /** Fired when the user clicks "Excluir" (lixeira). */
  onDelete?: () => void;
  /** Fired when the user clicks "Duplicar". */
  onClone?: () => void;
  /** Number of currently selected records. If 0, Delete and Clone are disabled. */
  selectedCount?: number;
  /** Fired when the user clicks "Recarregar". */
  onRefresh?: () => void;
  /** Fired when the user picks "Configurar Grade..." from the mode dropdown. */
  onOpenGridConfig?: () => void;
  /** Fired when the user picks "Configurar Formulário..." from the mode dropdown. */
  onOpenFormConfig?: () => void;
  /** Fired when the user clicks the screen configurator button on the right. */
  onOpenScreenConfig?: () => void;
  /** Fired when the user clicks "Anexos". */
  onOpenAttachments?: () => void;
  /** Count of attachments to show as badge. */
  attachmentCount?: number;
  /** Custom aria-label for insert button. @default 'Incluir' */
  insertAriaLabel?: string;
  /** Custom tooltip for insert button. @default 'Incluir (Novo registro)' */
  insertTooltip?: string;
  /** Custom actions shown inside the "Ações" menu. */
  actions?: EzEntityToolbarAction[];
  /** Record count label shown on the far right (e.g. "1 - 10 de 25"). */
  recordCountText?: string;
}

/**
 * Aponta DS Entity Toolbar (Sankhya ERP standard toolbar parity).
 * Layout:
 * - Left: Filtros, Modo Grade/Formulário (com dropdown de configuração), Incluir, Anterior, Próximo, Excluir, Duplicar, Recarregar.
 * - Right: Ações, Anexos, Configuração da tela, Quantidade de registros.
 */
export const EzEntityToolbar = forwardRef<HTMLDivElement, EzEntityToolbarProps>(
  (
    {
      viewMode,
      onToggleViewMode,
      isFilterOpen = false,
      onToggleFilter,
      onInsert,
      insertAriaLabel,
      insertTooltip,
      onPrevious,
      hasPrevious = false,
      onNext,
      hasNext = false,
      onDelete,
      onClone,
      selectedCount = 0,
      onRefresh,
      onOpenGridConfig,
      onOpenFormConfig,
      onOpenScreenConfig,
      onOpenAttachments,
      attachmentCount,
      actions = [],
      recordCountText,
      className,
      ...props
    },
    ref
  ) => {
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

    const modeMenuRef = useRef<HTMLDivElement>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);

    // Close popovers on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
          setIsModeMenuOpen(false);
        }
        if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
          setIsActionsMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasSelection = selectedCount > 0;

    return (
      <div
        ref={ref}
        data-testid="ez-entity-toolbar"
        className={cn(
          'flex items-center justify-between gap-3 px-3 py-1.5 bg-white border-b border-gray-200 select-none min-h-[44px]',
          className
        )}
        {...props}
      >
        {/* ================= LEFT GROUP ================= */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* 1. Painel de Filtros */}
          {onToggleFilter && (
            <button
              type="button"
              data-testid="ez-toolbar-filter-panel-button"
              aria-label="Painel de filtros"
              title="Painel de filtros"
              onClick={onToggleFilter}
              className={cn(
                'inline-flex items-center justify-center h-[32px] px-2.5 rounded-[6px] text-[12px] font-medium transition-colors border cursor-pointer',
                isFilterOpen
                  ? 'bg-brand-50 text-brand-700 border-brand-200 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Filtros
            </button>
          )}

          <span className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* 2. Alternador Modo Grade / Formulário com seta de configuração */}
          <div className="relative inline-flex items-center rounded-[6px] border border-gray-200 bg-white" ref={modeMenuRef}>
            <button
              type="button"
              data-testid="ez-toolbar-mode-toggle-button"
              aria-label={viewMode === 'GRID' ? 'Alternar para Modo Formulário' : 'Alternar para Modo Grade'}
              title={viewMode === 'GRID' ? 'Ver formulário do registro' : 'Ver grade de registros'}
              onClick={() => onToggleViewMode(viewMode === 'GRID' ? 'FORM' : 'GRID')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 h-[30px] rounded-l-[5px] text-[12px] font-medium transition-colors cursor-pointer',
                viewMode === 'GRID'
                  ? 'text-brand-700 bg-brand-50/50 hover:bg-brand-50'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {viewMode === 'GRID' ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 text-brand-600" />
                  <span>Grade</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                  <span>Formulário</span>
                </>
              )}
            </button>

            {/* Seta para baixo para abrir o menu de configurações do modo */}
            <button
              type="button"
              data-testid="ez-toolbar-mode-menu-button"
              aria-label="Opções do modo de visualização"
              title="Opções do modo de visualização"
              aria-expanded={isModeMenuOpen}
              onClick={() => setIsModeMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center w-6 h-[30px] border-l border-gray-200 rounded-r-[5px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Menu Dropdown de Modo */}
            {isModeMenuOpen && (
              <div
                data-testid="ez-toolbar-mode-dropdown"
                role="menu"
                className="absolute left-0 top-full mt-1 w-52 rounded-[8px] bg-white border border-gray-200 shadow-lg py-1 z-50 text-[12px]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleViewMode('GRID');
                    setIsModeMenuOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors cursor-pointer',
                    viewMode === 'GRID' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-gray-500" />
                  Modo Grade
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleViewMode('FORM');
                    setIsModeMenuOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors cursor-pointer',
                    viewMode === 'FORM' ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  Modo Formulário
                </button>

                {(onOpenGridConfig || onOpenFormConfig) && (
                  <div className="border-t border-gray-100 my-1" />
                )}

                {onOpenGridConfig && (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="ez-toolbar-open-grid-config"
                    onClick={() => {
                      onOpenGridConfig();
                      setIsModeMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                    Configurar Grade...
                  </button>
                )}

                {onOpenFormConfig && (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="ez-toolbar-open-form-config"
                    onClick={() => {
                      onOpenFormConfig();
                      setIsModeMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <Columns2 className="w-3.5 h-3.5 text-gray-500" />
                    Configurar Formulário...
                  </button>
                )}
              </div>
            )}
          </div>

          <span className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* 3. Botão Incluir (+) */}
          {onInsert && (
            <button
              type="button"
              data-testid="ez-toolbar-insert-button"
              aria-label={insertAriaLabel ?? 'Incluir'}
              title={insertTooltip ?? 'Incluir (Novo registro)'}
              onClick={onInsert}
              className="inline-flex items-center justify-center h-[32px] w-[32px] rounded-[6px] text-gray-600 hover:text-brand-600 hover:bg-brand-50 border border-gray-200 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {/* 4. Botões de Navegação Anterior / Próximo */}
          <div className="inline-flex items-center rounded-[6px] border border-gray-200 bg-white">
            <button
              type="button"
              data-testid="ez-toolbar-previous-button"
              aria-label="Registro anterior"
              title="Registro anterior"
              disabled={!hasPrevious}
              onClick={onPrevious}
              className={cn(
                'inline-flex items-center justify-center h-[30px] w-[30px] rounded-l-[5px] text-gray-600 hover:bg-gray-50 transition-colors',
                !hasPrevious && 'opacity-40 cursor-not-allowed hover:bg-white'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-px h-4 bg-gray-200" />
            <button
              type="button"
              data-testid="ez-toolbar-next-button"
              aria-label="Próximo registro"
              title="Próximo registro"
              disabled={!hasNext}
              onClick={onNext}
              className={cn(
                'inline-flex items-center justify-center h-[30px] w-[30px] rounded-r-[5px] text-gray-600 hover:bg-gray-50 transition-colors',
                !hasNext && 'opacity-40 cursor-not-allowed hover:bg-white'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 5. Botão Deletar (ativo apenas com linhas selecionadas) */}
          {onDelete && (
            <button
              type="button"
              data-testid="ez-toolbar-delete-button"
              aria-label="Excluir"
              title={hasSelection ? `Excluir ${selectedCount} selecionado(s)` : 'Selecione registros para excluir'}
              disabled={!hasSelection}
              onClick={onDelete}
              className={cn(
                'inline-flex items-center justify-center h-[32px] w-[32px] rounded-[6px] border transition-colors',
                hasSelection
                  ? 'border-red-200 text-red-600 hover:bg-red-50 cursor-pointer'
                  : 'border-gray-200 text-gray-300 opacity-50 cursor-not-allowed'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 6. Botão Duplicar (ativo apenas com linha selecionada) */}
          {onClone && (
            <button
              type="button"
              data-testid="ez-toolbar-clone-button"
              aria-label="Duplicar"
              title={hasSelection ? 'Duplicar registro selecionado' : 'Selecione um registro para duplicar'}
              disabled={!hasSelection}
              onClick={onClone}
              className={cn(
                'inline-flex items-center justify-center h-[32px] w-[32px] rounded-[6px] border transition-colors',
                hasSelection
                  ? 'border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'border-gray-200 text-gray-300 opacity-50 cursor-not-allowed'
              )}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 7. Botão Recarregar */}
          {onRefresh && (
            <button
              type="button"
              data-testid="ez-toolbar-refresh-button"
              aria-label="Recarregar"
              title="Recarregar dados"
              onClick={onRefresh}
              className="inline-flex items-center justify-center h-[32px] w-[32px] rounded-[6px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ================= RIGHT GROUP ================= */}
        <div className="flex items-center gap-1.5">
          {/* 8. Botão Ações (menu dropdown) */}
          <div className="relative inline-block" ref={actionsMenuRef}>
            <button
              type="button"
              data-testid="ez-toolbar-actions-button"
              aria-label="Ações"
              title="Ações do registro"
              aria-expanded={isActionsMenuOpen}
              onClick={() => setIsActionsMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 h-[32px] px-2.5 rounded-[6px] text-[12px] font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Ações</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isActionsMenuOpen && (
              <div
                data-testid="ez-toolbar-actions-dropdown"
                role="menu"
                className="absolute right-0 top-full mt-1 w-52 rounded-[8px] bg-white border border-gray-200 shadow-lg py-1 z-50 text-[12px]"
              >
                {actions.length > 0 ? (
                  actions.map((act, idx) => {
                    const ActIcon = act.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          act.onClick();
                          setIsActionsMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        {ActIcon && <ActIcon className="w-3.5 h-3.5 text-gray-500" />}
                        {act.label}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-gray-400 italic text-[11px]">
                    Nenhuma ação disponível
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 9. Botão Anexos */}
          {onOpenAttachments && (
            <button
              type="button"
              data-testid="ez-toolbar-attachments-button"
              aria-label="Anexos"
              title="Anexos do registro"
              onClick={onOpenAttachments}
              className="relative inline-flex items-center justify-center h-[32px] w-[32px] rounded-[6px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 transition-colors cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5" />
              {typeof attachmentCount === 'number' && attachmentCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-brand-600 text-white">
                  {attachmentCount}
                </span>
              )}
            </button>
          )}

          {/* 10. Botão Configuração da Tela */}
          {onOpenScreenConfig && (
            <button
              type="button"
              data-testid="ez-toolbar-screen-config-button"
              aria-label="Configuração da tela"
              title="Personalizar colunas e layout da tela (por usuário)"
              onClick={onOpenScreenConfig}
              className="inline-flex items-center justify-center h-[32px] w-[32px] rounded-[6px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 11. Quantidade de Registros */}
          {recordCountText && (
            <div
              data-testid="ez-toolbar-record-count"
              className="text-[12px] font-medium text-gray-500 pl-1.5 border-l border-gray-200 whitespace-nowrap"
            >
              {recordCountText}
            </div>
          )}
        </div>
      </div>
    );
  }
);

EzEntityToolbar.displayName = 'EzEntityToolbar';
