import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Check } from 'lucide-react';
import { EzTag } from './EzTag';

describe('EzTag', () => {
  it('renders the label properly', () => {
    render(<EzTag label="New" />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders the default ocean variant', () => {
    const { container } = render(<EzTag label="Ocean" />);
    expect(container.firstChild).toHaveClass('bg-brand-100/50');
  });

  it('renders different variants correctly (e.g. red)', () => {
    const { container } = render(<EzTag label="Error" variant="red" />);
    expect(container.firstChild).toHaveClass('bg-red-100');
  });

  it('renders left and right icons when provided', () => {
    render(
      <EzTag 
        label="Done" 
        leftIcon={<Check data-testid="left-icon" />} 
        rightIcon={<span data-testid="right-icon">X</span>} 
      />
    );
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });
});
