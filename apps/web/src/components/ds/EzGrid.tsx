import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

// O componente grid nativo da Sankhya é uma engine inteira (suporta paginação, colunas dinâmicas, etc).
// No Aponta, substituiremos o uso desse trambolho (de 1.4mb) por @tanstack/react-table injetando as classes desta casca.
// Este componente apenas encapsula visualmente o wrapper da tabela.
export type EzGridProps = HTMLAttributes<HTMLDivElement>;

/**
 * Aponta DS Grid (Table Wrapper)
 * Container for the Tanstack React Table to match the DS table aesthetics.
 */
export const EzGridWrapper = forwardRef<HTMLDivElement, EzGridProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn('w-full bg-white rounded-[12px] border border-gray-200 overflow-hidden', className)} 
        {...props}
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            {/* 
              Estilos aplicados em filhas genéricas (thead/tbody/tr)
              para quando usarmos o Tanstack Table dentro deste container
            */}
            {children}
          </table>
        </div>
      </div>
    );
  }
);
EzGridWrapper.displayName = 'EzGridWrapper';
