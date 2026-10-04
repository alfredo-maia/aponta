import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzBadge } from './EzBadge';

describe('EzBadge', () => {
  it('renders children correctly', () => {
    render(<EzBadge>99+</EzBadge>);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('applies default brand colors when no colorClass is passed', () => {
    const { container } = render(<EzBadge>1</EzBadge>);
    expect(container.firstChild).toHaveClass('bg-brand-600');
    expect(container.firstChild).toHaveClass('text-gray-70');
  });

  it('allows overriding colors with colorClass', () => {
    const { container } = render(<EzBadge colorClass="bg-red-500 text-white">Error</EzBadge>);
    expect(container.firstChild).toHaveClass('bg-red-500');
    expect(container.firstChild).not.toHaveClass('bg-brand-600'); // Should be overridden or appended but we rely on rendering generic
  });
});