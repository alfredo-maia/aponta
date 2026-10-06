import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzPopup } from './EzPopup';

describe('EzPopup', () => {
  it('renders the trigger always, and content only when open', () => {
    render(
      <EzPopup trigger={<button>Abrir</button>} open={false} onClose={vi.fn()}>
        Conteúdo flutuante
      </EzPopup>
    );
    expect(screen.getByText('Abrir')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo flutuante')).not.toBeInTheDocument();
  });

  it('renders content when open is true', () => {
    render(
      <EzPopup trigger={<button>Abrir</button>} open={true} onClose={vi.fn()}>
        Conteúdo flutuante
      </EzPopup>
    );
    expect(screen.getByText('Conteúdo flutuante')).toBeInTheDocument();
  });

  it('calls onClose when clicking outside the popup', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <div data-testid="outside">
        <EzPopup trigger={<button>Abrir</button>} open={true} onClose={onClose}>
          Conteúdo flutuante
        </EzPopup>
      </div>
    );
    await user.click(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies the position classes for "right"', () => {
    render(
      <EzPopup trigger={<button>Abrir</button>} open={true} onClose={vi.fn()} position="right">
        Conteúdo flutuante
      </EzPopup>
    );
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('left-full', 'ml-2');
  });
});
