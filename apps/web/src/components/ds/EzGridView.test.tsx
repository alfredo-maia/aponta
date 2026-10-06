import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzGridView } from './EzGridView';

describe('EzGridView', () => {
  it('renders children', () => {
    render(
      <EzGridView>
        <div>Item 1</div>
      </EzGridView>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('applies default 3-column responsive classes', () => {
    const { container } = render(<EzGridView data-testid="grid" />);
    expect(container.firstChild).toHaveClass('lg:grid-cols-3');
    expect(container.firstChild).toHaveClass('md:grid-cols-2');
  });

  it('omits lg columns when columns=2', () => {
    const { container } = render(<EzGridView columns={2} />);
    expect(container.firstChild).toHaveClass('md:grid-cols-2');
    expect(container.firstChild).not.toHaveClass('lg:grid-cols-3');
  });
});
