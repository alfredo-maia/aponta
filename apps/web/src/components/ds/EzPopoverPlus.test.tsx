import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzPopoverPlus } from './EzPopoverPlus';

describe('EzPopoverPlus', () => {
  it('renders the trigger always, and content only when open', () => {
    render(
      <EzPopoverPlus trigger={<button>Abrir</button>} open={false} onClose={vi.fn()}>
        Conteúdo
      </EzPopoverPlus>
    );
    expect(screen.getByText('Abrir')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('renders title and content when open is true', () => {
    render(
      <EzPopoverPlus trigger={<button>Abrir</button>} title="Detalhes" open={true} onClose={vi.fn()}>
        Conteúdo
      </EzPopoverPlus>
    );
    expect(screen.getByText('Detalhes')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <EzPopoverPlus trigger={<button>Abrir</button>} open={true} onClose={onClose}>
        Conteúdo
      </EzPopoverPlus>
    );
    await user.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies right alignment classes when align="right"', () => {
    render(
      <EzPopoverPlus trigger={<button>Abrir</button>} open={true} onClose={vi.fn()} align="right">
        Conteúdo
      </EzPopoverPlus>
    );
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveClass('right-0', 'origin-top-right');
  });
});
