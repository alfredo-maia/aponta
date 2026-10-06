import { HTMLAttributes, forwardRef, useState } from 'react';
import { cn } from './utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface EzCalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * The currently selected date.
   */
  value?: Date;
  /**
   * Called when the visible month changes (navigation) and when a date is selected,
   * with the new reference/selected Date.
   */
  onChange?: (date: Date) => void;
  /**
   * Called when a day cell is clicked/selected.
   */
  onSelectDate?: (date: Date) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(reference: Date): (Date | null)[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDayOfMonth.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

/**
 * Aponta DS Calendar (inspired by @sankhyalabs/ezui)
 * Simple monthly calendar grid with previous/next month navigation.
 */
export const EzCalendar = forwardRef<HTMLDivElement, EzCalendarProps>(
  ({ value, onChange, onSelectDate, className, ...props }, ref) => {
    const [visibleMonth, setVisibleMonth] = useState<Date>(
      () => new Date((value ?? new Date()).getFullYear(), (value ?? new Date()).getMonth(), 1)
    );

    const today = new Date();
    const cells = buildMonthGrid(visibleMonth);

    const goToPreviousMonth = () => {
      const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
      setVisibleMonth(next);
      onChange?.(next);
    };

    const goToNextMonth = () => {
      const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
      setVisibleMonth(next);
      onChange?.(next);
    };

    const handleSelectDate = (date: Date) => {
      onSelectDate?.(date);
      onChange?.(date);
    };

    return (
      <div
        ref={ref}
        className={cn('w-full max-w-[320px] rounded-[12px] border border-gray-200 bg-white p-3', className)}
        {...props}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={goToPreviousMonth}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-80 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[14px] font-semibold text-gray-900 select-none">
            {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </span>

          <button
            type="button"
            aria-label="Próximo mês"
            onClick={goToNextMonth}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-80 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={`${day}-${idx}`}
              className="flex items-center justify-center h-7 text-[11px] font-medium text-gray-400 select-none"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, idx) => {
            if (!date) return <div key={idx} className="h-8 w-8" />;

            const isSelected = value ? isSameDay(date, value) : false;
            const isToday = isSameDay(date, today);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDate(date)}
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-full text-[13px] font-medium transition-colors select-none',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
                  isSelected
                    ? 'bg-brand-600 text-gray-70'
                    : isToday
                    ? 'border border-brand-600 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-80'
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

EzCalendar.displayName = 'EzCalendar';
