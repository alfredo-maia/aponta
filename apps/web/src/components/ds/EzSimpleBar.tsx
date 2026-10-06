import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';
import { ArrowLeft, ChevronRight } from 'lucide-react';

/**
 * Item de navegação exibido no breadcrumb do {@link EzSimpleBar}.
 * Mirrors Sankhya DS `IBreadcrumbItem`.
 */
export type EzSimpleBarBreadcrumbItem = {
  /** Identificador único do item. */
  id: string | number;
  /** Texto exibido para o item. */
  label: string;
};

/**
 * Props do Aponta DS Simple Bar.
 * Mirrors Sankhya DS `snk-simple-bar` (apenas comportamento visual/UX —
 * sem nenhuma dependência de SnkApplication/DataUnit).
 */
export type EzSimpleBarProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** Título principal exibido no header. */
  title: ReactNode;
  /** Subtítulo opcional exibido abaixo do título. */
  subtitle?: ReactNode;
  /** Itens de navegação por breadcrumb, exibidos acima do título. */
  breadcrumbItems?: EzSimpleBarBreadcrumbItem[];
  /** Disparado quando um item do breadcrumb é clicado. */
  onBreadcrumbItemClick?: (item: EzSimpleBarBreadcrumbItem) => void;
  /** Quando definido, exibe o botão de voltar e é chamado ao clicar nele. */
  onBack?: () => void;
  /** Conteúdo customizado alinhado à direita do header (ex: botões de filtro). Alternativa a `children`. */
  actions?: ReactNode;
  /** Quando `true`, fixa o header no topo durante a rolagem da tela. @default false */
  sticky?: boolean;
};

/**
 * Aponta DS Simple Bar
 * Cabeçalho (header) visual padronizado, utilizado para exibir o título da
 * tela, navegação por breadcrumb, botão de voltar e um slot para conteúdo
 * dinâmico alinhado à direita. Não possui botões de ação ou lógica de CRUD —
 * para esses casos, prefira `EzTaskbar`.
 * Mirrors Sankhya DS `snk-simple-bar`.
 */
export const EzSimpleBar = forwardRef<HTMLDivElement, EzSimpleBarProps>(
  (
    {
      title,
      subtitle,
      breadcrumbItems,
      onBreadcrumbItemClick,
      onBack,
      actions,
      sticky = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const rightSlot = actions ?? children;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col w-full bg-white border-b border-gray-200 px-6 py-4 gap-2',
          sticky && 'sticky top-0 z-10',
          className
        )}
        {...props}
      >
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center text-[13px]">
            <ol className="flex items-center space-x-1.5">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <li key={item.id} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 mx-1 shrink-0" />
                    )}
                    {onBreadcrumbItemClick && !isLast ? (
                      <button
                        type="button"
                        onClick={() => onBreadcrumbItemClick(item)}
                        className="text-gray-500 hover:text-brand-600 font-medium transition-colors"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span
                        aria-current={isLast ? 'page' : undefined}
                        className={cn(
                          'font-medium',
                          isLast ? 'text-brand-600' : 'text-gray-500'
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div className="flex items-center justify-between min-h-[40px] gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Voltar"
                title="Voltar"
                className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-80 rounded-md transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex flex-col min-w-0">
              <h1 className="text-[18px] font-semibold text-gray-900 leading-tight m-0 truncate">
                {title}
              </h1>
              {subtitle && (
                <span className="text-[13px] text-gray-500 truncate">{subtitle}</span>
              )}
            </div>
          </div>

          {rightSlot && (
            <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>
          )}
        </div>
      </div>
    );
  }
);

EzSimpleBar.displayName = 'EzSimpleBar';
