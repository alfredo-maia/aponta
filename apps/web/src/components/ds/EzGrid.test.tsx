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
});
