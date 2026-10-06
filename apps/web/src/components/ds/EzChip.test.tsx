import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzChip } from './EzChip';

describe('EzChip', () => {
  it('renders the label correctly', () => {
    render(<EzChip label="React" />);
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('does not render a remove button when onRemove is not provided', () => {
    render(<EzChip label="Static" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<EzChip label="React" onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: 'Remover React' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('applies the default brand color classes', () => {
    const { container } = render(<EzChip label="React" />);
    expect(container.firstChild).toHaveClass('bg-brand-100/50');
    expect(container.firstChild).toHaveClass('text-brand-700');
  });

  it('applies a custom colorClass when provided', () => {
    const { container } = render(<EzChip label="Erro" colorClass="bg-red-100 text-red-800 border-red-200" />);
    expect(container.firstChild).toHaveClass('bg-red-100');
    expect(container.firstChild).toHaveClass('text-red-800');
  });
});
