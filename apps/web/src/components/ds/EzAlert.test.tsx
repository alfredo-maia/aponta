import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzAlert } from './EzAlert';

describe('EzAlert', () => {
  it('renders correctly with default info variant', () => {
    const { container } = render(<EzAlert>Information message</EzAlert>);
    expect(screen.getByText('Information message')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-petroleum-100');
  });

  it('renders the title if provided', () => {
    render(<EzAlert title="Alert Title">Alert description</EzAlert>);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert description')).toBeInTheDocument();
  });

  it('renders success variant with correct classes', () => {
    const { container } = render(<EzAlert variant="success">Success!</EzAlert>);
    expect(container.firstChild).toHaveClass('bg-green-100');
    expect(container.firstChild).toHaveClass('text-green-800');
  });

  it('renders error variant with correct classes', () => {
    const { container } = render(<EzAlert variant="error">Error!</EzAlert>);
    expect(container.firstChild).toHaveClass('bg-red-100');
    expect(container.firstChild).toHaveClass('text-red-800');
  });

  it('renders action element if provided', () => {
    render(<EzAlert action={<button>Do Something</button>}>Has Action</EzAlert>);
    expect(screen.getByRole('button', { name: 'Do Something' })).toBeInTheDocument();
  });

  it('renders close button and fires onClose callback when clicked', async () => {
    const onCloseMock = vi.fn();
    render(<EzAlert onClose={onCloseMock}>Closable</EzAlert>);
    const closeBtn = screen.getByRole('button', { name: 'Fechar' });
    expect(closeBtn).toBeInTheDocument();
    
    await userEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});