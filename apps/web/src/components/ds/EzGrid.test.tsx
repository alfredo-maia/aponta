import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});

