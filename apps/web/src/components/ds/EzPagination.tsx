import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface EzPaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  /**
   * Only emit events, does not control state. Allows parent to control URL params.
   */
}

/**
 * Aponta DS Pagination
 */
export const EzPagination = forwardRef<HTMLDivElement, EzPaginationProps>(
  ({ currentPage, totalPages, onChange, className, ...props }, ref) => {
    // Generate page numbers for a sliding window around the current page
    const getPageNumbers = () => {
      const delta = 1;
      const range: number[] = [];
      const rangeWithDots: (number | string)[] = [];
      let l: number | undefined;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
          range.push(i);
        }
      }

      for (const i of range) {
        if (l !== undefined) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (i - l !== 1) {
            rangeWithDots.push('...');
          }
        }
        rangeWithDots.push(i);
        l = i;
      }

      return rangeWithDots;
    };

    if (totalPages <= 1) return null;

    return (
      <div ref={ref} className={cn('flex items-center gap-1', className)} {...props}>
        <button
          onClick={() => onChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-[8px] text-gray-500 hover:bg-gray-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Página Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`dot-${index}`} className="px-3 py-2 text-gray-500">
                ...
              </span>
            );
          }
          
          const isCurrent = page === currentPage;
          
          return (
            <button
              key={`page-${page}`}
              onClick={() => onChange(page as number)}
              className={cn(
                'min-w-[32px] h-[32px] px-2 rounded-[8px] text-[14px] font-medium transition-colors flex items-center justify-center',
                isCurrent 
                  ? 'bg-ocean-100 text-ocean-700 pointer-events-none' 
                  : 'text-gray-700 hover:bg-gray-90'
              )}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-[8px] text-gray-500 hover:bg-gray-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Próxima Página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }
);

EzPagination.displayName = 'EzPagination';
