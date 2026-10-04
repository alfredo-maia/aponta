import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzButton } from './EzButton';

describe('EzButton', () => {
  it('renders the label correctly', () => {
    render(<EzButton label="Click Me" />);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('renders primary variant by default and applies brand color', () => {
    const { container } = render(<EzButton label="Defaults" />);
    // Check if it has the default primary classes (bg-brand-500)
    expect(container.firstChild).toHaveClass('bg-brand-500');
  });

  it('renders secondary variant', () => {
    const { container } = render(<EzButton label="Outline" variant="secondary" />);
    expect(container.firstChild).toHaveClass('border-gray-200');
    expect(container.firstChild).toHaveClass('text-brand-600');
  });

  it('renders disabled state correctly', () => {
    const { container } = render(<EzButton label="Disabled" disabled />);
    expect(container.firstChild).toBeDisabled();
    expect(container.firstChild).toHaveClass('disabled:bg-gray-400');
  });

  it('renders as icon-only when label is omitted but icon is passed', () => {
    const MockIcon = () => <svg data-testid="mock-icon" />;
    const { container } = render(<EzButton leftIcon={MockIcon} />);
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    // No label rendered
    expect(container.textContent).toBe('');
  });
});
