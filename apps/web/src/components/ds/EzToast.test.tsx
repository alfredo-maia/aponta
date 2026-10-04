import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzToast } from './EzToast';

describe('EzToast', () => {
  it('renders title and defaults to info variant', () => {
    const { container } = render(<EzToast title="Network Connected" />);
    expect(screen.getByText('Network Connected')).toBeInTheDocument();
    // Defaults to visible
    expect(container.firstChild).toHaveClass('opacity-100');
    // Info variant defaults to text-brand-600
    expect(container.querySelector('.text-brand-600')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EzToast title="Title" description="Detailed message here" />);
    expect(screen.getByText('Detailed message here')).toBeInTheDocument();
  });

  it('renders error variant with correct color', () => {
    const { container } = render(<EzToast title="Error" variant="error" />);
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
  });

  it('applies enter/leave animations via visible prop', () => {
    const { container } = render(<EzToast title="Title" visible={false} />);
    expect(container.firstChild).toHaveClass('opacity-0');
    expect(container.firstChild).toHaveClass('scale-95');
  });

  it('fires onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(<EzToast title="Alert" onClose={mockOnClose} />);
    
    // The close button has accessible text "Close"
    const closeBtn = screen.getByText('Close').closest('button');
    expect(closeBtn).not.toBeNull();
    await user.click(closeBtn as HTMLButtonElement);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('hides close button if onClose is omitted', () => {
    render(<EzToast title="Alert" />);
    expect(screen.queryByText('Close')).not.toBeInTheDocument();
  });
});
