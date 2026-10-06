import { HTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export interface EzChartDataPoint {
  /**
   * Label displayed for this data point.
   */
  label: string;
  /**
   * Numeric value represented proportionally by the bar size.
   */
  value: number;
}

export interface EzChartProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The data points to render as bars.
   */
  data: EzChartDataPoint[];
  /**
   * Orientation of the bars.
   * @default 'bar'
   */
  variant?: 'bar' | 'horizontal-bar';
  /**
   * Color class applied to each bar's background.
   * @default 'bg-brand-600'
   */
  barColorClass?: string;
}

/**
 * Aponta DS Chart (inspired by @sankhyalabs/ezui)
 * Minimal bar chart built only with divs sized proportionally — no external chart library.
 */
export const EzChart = forwardRef<HTMLDivElement, EzChartProps>(
  ({ data, variant = 'bar', barColorClass = 'bg-brand-600', className, ...props }, ref) => {
    const maxValue = Math.max(1, ...data.map((d) => d.value));

    if (variant === 'horizontal-bar') {
      return (
        <div
          ref={ref}
          role="img"
          aria-label="Gráfico de barras horizontais"
          className={cn('flex w-full flex-col gap-3 p-2', className)}
          {...props}
        >
          {data.map((point) => {
            const widthPct = Math.max(0, Math.min(100, (point.value / maxValue) * 100));
            return (
              <div key={point.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-[12px] font-medium text-gray-700">
                  {point.label}
                </span>
                <div className="flex-1 h-5 rounded-[6px] bg-gray-90 overflow-hidden">
                  <div
                    data-testid={`ez-chart-bar-${point.label}`}
                    className={cn('h-full rounded-[6px] transition-all', barColorClass)}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-[12px] font-semibold text-gray-900">
                  {point.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="img"
        aria-label="Gráfico de barras verticais"
        className={cn('flex w-full items-end gap-3 p-2 h-[160px]', className)}
        {...props}
      >
        {data.map((point) => {
          const heightPct = Math.max(0, Math.min(100, (point.value / maxValue) * 100));
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[12px] font-semibold text-gray-900">{point.value}</span>
              <div className="w-full flex-1 flex items-end rounded-[6px] bg-gray-90 overflow-hidden">
                <div
                  data-testid={`ez-chart-bar-${point.label}`}
                  className={cn('w-full rounded-[6px] transition-all', barColorClass)}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="truncate max-w-full text-[12px] font-medium text-gray-700">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
);

EzChart.displayName = 'EzChart';
