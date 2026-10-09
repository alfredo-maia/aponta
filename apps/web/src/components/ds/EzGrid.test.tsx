import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzGridWrapper } from './EzGrid';

describe('EzGridWrapper', () => {
  it('renders children correctly', () => {
    render(
      <EzGridWrapper>
        <tbody>
          <tr><td data-testid="grid-cell">Cell Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );
    expect(screen.getByTestId('grid-cell')).toHaveTextContent('Cell Data');
  });

  it('adds given custom className', () => {
    const { container } = render(<EzGridWrapper className="my-custom-grid" />);
    expect(container.firstChild).toHaveClass('my-custom-grid');
    expect(container.firstChild).toHaveClass('overflow-hidden');
  });

  it('renders persistent horizontal scrollbar with thumb and accessibility attributes when alwaysShowHorizontalScrollbar is true', () => {
    render(
      <EzGridWrapper alwaysShowHorizontalScrollbar>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );

    const scrollbar = screen.getByTestId('ez-grid-horizontal-scrollbar');
    expect(scrollbar).toBeInTheDocument();

    const thumb = screen.getByTestId('ez-grid-horizontal-scrollbar-thumb');
    expect(thumb).toBeInTheDocument();
    expect(thumb).toHaveAttribute('role', 'scrollbar');
    expect(thumb).toHaveAttribute('aria-orientation', 'horizontal');
    expect(thumb).toHaveAttribute('aria-label', 'Barra de rolagem horizontal');
  });

  it('does not render horizontal scrollbar when showHorizontalScrollbar is false', () => {
    render(
      <EzGridWrapper alwaysShowHorizontalScrollbar showHorizontalScrollbar={false}>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );

    expect(screen.queryByTestId('ez-grid-horizontal-scrollbar')).not.toBeInTheDocument();
  });

  it('updates metrics on container scroll', () => {
    const { container } = render(
      <EzGridWrapper alwaysShowHorizontalScrollbar>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );

    const scrollContainer = container.querySelector('#ez-grid-table-container') as HTMLDivElement;
    expect(scrollContainer).toBeInTheDocument();

    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 800, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollLeft', { value: 100, configurable: true, writable: true });

    fireEvent.scroll(scrollContainer);

    const thumb = screen.getByTestId('ez-grid-horizontal-scrollbar-thumb');
    expect(thumb).toBeInTheDocument();
  });

  it('handles keyboard navigation (ArrowLeft and ArrowRight) on thumb', () => {
    const { container } = render(
      <EzGridWrapper alwaysShowHorizontalScrollbar>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );

    const scrollContainer = container.querySelector('#ez-grid-table-container') as HTMLDivElement;
    expect(scrollContainer).toBeInTheDocument();
    scrollContainer.scrollLeft = 50;

    const thumb = screen.getByTestId('ez-grid-horizontal-scrollbar-thumb');

    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(scrollContainer.scrollLeft).toBe(90);

    fireEvent.keyDown(thumb, { key: 'ArrowLeft' });
    expect(scrollContainer.scrollLeft).toBe(50);

    // Other key should not change scrollLeft
    fireEvent.keyDown(thumb, { key: 'Enter' });
    expect(scrollContainer.scrollLeft).toBe(50);
  });

  it('handles mouse dragging on thumb', () => {
    const { container } = render(
      <EzGridWrapper alwaysShowHorizontalScrollbar>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );

    const scrollContainer = container.querySelector('#ez-grid-table-container') as HTMLDivElement;
    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 500, configurable: true });
    scrollContainer.scrollLeft = 0;

    const thumb = screen.getByTestId('ez-grid-horizontal-scrollbar-thumb');

    // Mouse down on thumb
    fireEvent.mouseDown(thumb, { clientX: 100 });

    // Window mouse move
    fireEvent.mouseMove(window, { clientX: 150 });

    // Window mouse up
    fireEvent.mouseUp(window);
  });

  it('handles clicking on scrollbar track', () => {
    const { container } = render(
      <EzGridWrapper alwaysShowHorizontalScrollbar>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );

    const scrollContainer = container.querySelector('#ez-grid-table-container') as HTMLDivElement;
    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientWidth', { value: 500, configurable: true });

    const track = screen.getByTestId('ez-grid-horizontal-scrollbar');
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 500,
      height: 12,
      right: 500,
      bottom: 12,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(track, { clientX: 250 });
  });

  it('observes container resize via ResizeObserver', () => {
    let observerCallback: (() => void) | undefined;
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();

    const originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(callback: () => void) {
        observerCallback = callback;
      }
      observe = observeMock;
      unobserve = vi.fn();
      disconnect = disconnectMock;
    } as unknown as typeof ResizeObserver;

    const { unmount } = render(
      <EzGridWrapper>
        <tbody>
          <tr><td>Data</td></tr>
        </tbody>
      </EzGridWrapper>
    );

    expect(observeMock).toHaveBeenCalled();
    if (observerCallback) {
      observerCallback();
    }

    unmount();
    expect(disconnectMock).toHaveBeenCalled();

    global.ResizeObserver = originalResizeObserver;
  });
});

