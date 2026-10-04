import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EzModal } from './EzModal';

describe('EzModal', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  it('renders nothing when isOpen is false', () => {
    const mockClose = vi.fn();
    render(<EzModal isOpen={false} onClose={mockClose}>Content</EzModal>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders title, content, and footer when open', () => {
    const mockClose = vi.fn();
    render(
      <EzModal isOpen={true} onClose={mockClose} title="My Title" footer={<button>Save</button>}>
        Modal Content
      </EzModal>
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('locks body scroll when open', () => {
    const mockClose = vi.fn();
    render(<EzModal isOpen={true} onClose={mockClose}>Content</EzModal>);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('calls onClose when clicking the close (X) button', async () => {
    const mockClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen={true} onClose={mockClose} title="Title">Content</EzModal>);
    
    const closeButton = screen.getByLabelText('Fechar');
    await user.click(closeButton);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing Escape', async () => {
    const mockClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen={true} onClose={mockClose}>Content</EzModal>);
    
    await user.keyboard('{Escape}');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop layer', async () => {
    const mockClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen={true} onClose={mockClose}>Content</EzModal>);
    
    // In EzModal, the backdrop is the first div before the dialog. It doesn't have a specific role or text,
    // but the dialog itself covers part of it. Wait, the backdrop is the previous sibling.
    // We can select it by clicking outside the modal content, usually wrapper.
    // For test robustness let's just trigger a click on the element that has bg-gray-900/60
    // But testing library recommends better selectors. Let's just click the backdrop directly via firing MouseEvent
    // Actually, in test we can just query the div with the specific class or we can use DOM navigation.
    const backdrop = document.querySelector('.bg-gray-900\\/60');
    expect(backdrop).not.toBeNull();
    
    if (backdrop) {
      await user.click(backdrop);
      expect(mockClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onClose when clicking backdrop if preventOutsideClose is true', async () => {
    const mockClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen={true} onClose={mockClose} preventOutsideClose>Content</EzModal>);
    
    const backdrop = document.querySelector('.bg-gray-900\\/60');
    if (backdrop) {
      await user.click(backdrop);
      expect(mockClose).not.toHaveBeenCalled();
    }
  });
});
