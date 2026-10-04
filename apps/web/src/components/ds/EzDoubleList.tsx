import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from './utils';
import { EzList, EzListItem } from './EzList';
import { EzButton } from './EzButton';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export interface EzDoubleListItem {
  id: string | number;
  label: ReactNode;
  description?: ReactNode;
}

export interface EzDoubleListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  available: EzDoubleListItem[];
  selected: EzDoubleListItem[];
  onAdd: (item: EzDoubleListItem) => void;
  onRemove: (item: EzDoubleListItem) => void;
  availableLabel?: string;
  selectedLabel?: string;
}

export const EzDoubleList = forwardRef<HTMLDivElement, EzDoubleListProps>(
  (
    {
      available,
      selected,
      onAdd,
      onRemove,
      availableLabel = 'Disponíveis',
      selectedLabel = 'Selecionados',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('flex flex-col sm:flex-row w-full gap-4 items-stretch', className)} {...props}>
        {/* Available List */}
        <div className="flex flex-col flex-1 border border-gray-200 rounded-[12px] bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-[14px] font-semibold text-gray-900">
            {availableLabel} <span className="text-gray-500 font-normal ml-1">({available.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-60 p-2">
            {available.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Nenhum item disponível</div>
            ) : (
              <EzList flush>
                {available.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 mb-1">
                    <div className="flex-1">
                      <EzListItem
                        description={item.description}
                        className="rounded-[8px] py-2 border border-gray-100 mb-0"
                      >
                        {item.label}
                      </EzListItem>
                    </div>
                    <EzButton
                      variant="secondary"
                      size="small"
                      onClick={() => onAdd(item)}
                      title="Adicionar"
                      className="shrink-0 rounded-full w-8 h-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4 hidden sm:block" />
                      <ChevronRight className="w-4 h-4 sm:hidden rotate-90" />
                    </EzButton>
                  </div>
                ))}
              </EzList>
            )}
          </div>
        </div>

        {/* Selected List */}
        <div className="flex flex-col flex-1 border border-brand-200 rounded-[12px] bg-white overflow-hidden ring-1 ring-brand-100">
          <div className="px-4 py-3 border-b border-brand-100 bg-brand-50 text-[14px] font-semibold text-brand-900">
            {selectedLabel} <span className="text-brand-600 font-normal ml-1">({selected.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-60 p-2">
            {selected.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Nenhum item selecionado</div>
            ) : (
              <EzList flush>
                {selected.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 mb-1">
                    <EzButton
                      variant="secondary"
                      size="small"
                      onClick={() => onRemove(item)}
                      title="Remover"
                      className="shrink-0 rounded-full w-8 h-8 p-0 border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                    >
                      <ChevronLeft className="w-4 h-4 hidden sm:block" />
                      <ChevronLeft className="w-4 h-4 sm:hidden -rotate-90" />
                    </EzButton>
                    <div className="flex-1">
                      <EzListItem
                        description={item.description}
                        className="rounded-[8px] py-2 border border-brand-100 bg-brand-50/30 mb-0"
                      >
                        {item.label}
                      </EzListItem>
                    </div>
                  </div>
                ))}
              </EzList>
            )}
          </div>
        </div>
      </div>
    );
  }
);
EzDoubleList.displayName = 'EzDoubleList';