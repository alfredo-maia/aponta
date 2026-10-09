import {
  HTMLAttributes,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from './utils';

// O componente grid nativo da Sankhya é uma engine inteira (suporta paginação, colunas dinâmicas, etc).
// No Aponta, substituiremos o uso desse trambolho (de 1.4mb) por @tanstack/react-table injetando as classes desta casca.
// Este componente apenas encapsula visualmente o wrapper da tabela e a scrollbar horizontal fixa.
export type EzGridProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Se verdadeiro, habilita a barra de rolagem horizontal persistente estilo AG Grid
   * sempre visível quando o conteúdo da tabela transbordar horizontalmente.
   * @default true
   */
  showHorizontalScrollbar?: boolean;
  /**
   * Força a barra de rolagem horizontal a ser sempre renderizada mesmo sem detecção
   * de overflow (útil para Storybook e testes em ambientes jsdom).
   * @default false
   */
  alwaysShowHorizontalScrollbar?: boolean;
};

/**
 * Aponta DS Grid (Table Wrapper)
 * Container for the Tanstack React Table to match the DS table aesthetics,
 * com barra de rolagem horizontal customizada persistente em paridade com o Sankhya/AG Grid.
 */
export const EzGridWrapper = forwardRef<HTMLDivElement, EzGridProps>(
  (
    {
      className,
      children,
      showHorizontalScrollbar = true,
      alwaysShowHorizontalScrollbar = false,
      ...props
    },
    ref
  ) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [scrollMetrics, setScrollMetrics] = useState({
      scrollLeft: 0,
      scrollWidth: 0,
      clientWidth: 0,
    });

    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragStartScrollLeftRef = useRef(0);

    const updateMetrics = useCallback(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setHasOverflow(scrollWidth > clientWidth);
      setScrollMetrics({ scrollLeft, scrollWidth, clientWidth });
    }, []);

    useLayoutEffect(() => {
      updateMetrics();
      const el = scrollContainerRef.current;
      if (!el) return undefined;

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => {
          updateMetrics();
        });
        observer.observe(el);
        if (el.firstElementChild) {
          observer.observe(el.firstElementChild);
        }
        return () => observer.disconnect();
      }
      return undefined;
    }, [updateMetrics, children]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
      setScrollMetrics({ scrollLeft, scrollWidth, clientWidth });
    };

    const isScrollbarVisible =
      showHorizontalScrollbar && (hasOverflow || alwaysShowHorizontalScrollbar);
    const { scrollLeft, scrollWidth, clientWidth } = scrollMetrics;
    const trackWidth = trackRef.current?.clientWidth || clientWidth || 1;
    const effectiveScrollWidth = scrollWidth > 0 ? scrollWidth : trackWidth * 1.5;
    const maxScroll = Math.max(0, effectiveScrollWidth - clientWidth);

    // Largura proporcional do thumb com largura mínima de 32px
    const calculatedThumbWidth =
      effectiveScrollWidth > 0 ? (clientWidth / effectiveScrollWidth) * trackWidth : 32;
    const thumbWidth = Math.max(32, Math.min(trackWidth, calculatedThumbWidth || 32));

    const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
    const thumbLeft = maxScroll > 0 ? (scrollLeft / maxScroll) * maxThumbLeft : 0;

    const handleThumbMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartScrollLeftRef.current = scrollContainerRef.current?.scrollLeft ?? 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current || !scrollContainerRef.current) return;
        const deltaX = moveEvent.clientX - dragStartXRef.current;
        const currentTrackWidth =
          trackRef.current?.clientWidth || scrollContainerRef.current.clientWidth || 1;
        const currentMaxThumbLeft = Math.max(1, currentTrackWidth - thumbWidth);
        const currentScrollableDistance =
          scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;

        if (currentScrollableDistance > 0 && currentMaxThumbLeft > 0) {
          const scrollDelta = (deltaX / currentMaxThumbLeft) * currentScrollableDistance;
          scrollContainerRef.current.scrollLeft = dragStartScrollLeftRef.current + scrollDelta;
        }
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!scrollContainerRef.current || !trackRef.current) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      const clickX = e.clientX - trackRect.left;
      const targetThumbLeft = clickX - thumbWidth / 2;
      const currentMaxThumbLeft = Math.max(1, trackRect.width - thumbWidth);
      const currentScrollableDistance =
        scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;

      if (currentScrollableDistance > 0 && currentMaxThumbLeft > 0) {
        const ratio = Math.max(0, Math.min(1, targetThumbLeft / currentMaxThumbLeft));
        scrollContainerRef.current.scrollLeft = ratio * currentScrollableDistance;
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!scrollContainerRef.current) return;
      const step = 40;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollContainerRef.current.scrollLeft = Math.max(0, scrollContainerRef.current.scrollLeft - step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollContainerRef.current.scrollLeft += step;
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'w-full bg-white rounded-[12px] border border-gray-200 overflow-hidden flex flex-col',
          className
        )}
        {...props}
      >
        <div
          ref={scrollContainerRef}
          id="ez-grid-table-container"
          onScroll={handleScroll}
          className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <table className="w-full text-left border-collapse min-w-[600px]">
            {/* 
              Estilos aplicados em filhas genéricas (thead/tbody/tr)
              para quando usarmos o Tanstack Table dentro deste container
            */}
            {children}
          </table>
        </div>
        {isScrollbarVisible && (
          <div
            ref={trackRef}
            data-testid="ez-grid-horizontal-scrollbar"
            onClick={handleTrackClick}
            className="w-full h-3 bg-gray-100 border-t border-gray-200 relative select-none cursor-pointer overflow-hidden"
          >
            <div
              data-testid="ez-grid-horizontal-scrollbar-thumb"
              role="scrollbar"
              aria-orientation="horizontal"
              aria-controls="ez-grid-table-container"
              aria-label="Barra de rolagem horizontal"
              aria-valuenow={
                maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * 100) : 0
              }
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
              onMouseDown={handleThumbMouseDown}
              onKeyDown={handleKeyDown}
              style={{
                width: `${thumbWidth}px`,
                transform: `translateX(${thumbLeft}px)`,
              }}
              className="absolute top-[2px] h-[8px] bg-gray-300 hover:bg-gray-400 active:bg-gray-500 rounded-full cursor-grab active:cursor-grabbing transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}
      </div>
    );
  }
);
EzGridWrapper.displayName = 'EzGridWrapper';
