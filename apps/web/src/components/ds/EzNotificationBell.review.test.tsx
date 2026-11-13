import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzNotificationBell } from './EzNotificationBell';

const ITEMS = [
  { id: 'n-1', title: 'Cronômetro encerrado automaticamente: ticket T-1001', body: 'Texto.', readAt: null, createdAt: '2026-11-13T10:00:00.000Z' },
];

function renderBell() {
  const onOpen = vi.fn();
  const onItemClick = vi.fn();
  render(<EzNotificationBell items={ITEMS} unreadCount={1} onOpen={onOpen} onItemClick={onItemClick} onMarkAllRead={vi.fn()} />);
  return { onOpen, onItemClick };
}

describe('achados do code-review do T6 no sino (DMTE-462)', () => {
  it('AC-34: clicar numa notificação leva ao destino e fecha o painel', async () => {
    const { onItemClick } = renderBell();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    await userEvent.click(screen.getByText(/ticket T-1001/));
    expect(onItemClick).toHaveBeenCalledWith(ITEMS[0]);
    expect(screen.queryByText(/ticket T-1001/)).not.toBeInTheDocument();
  });

  it('AC-34: Esc fecha o painel', async () => {
    renderBell();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    expect(screen.getByText(/ticket T-1001/)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText(/ticket T-1001/)).not.toBeInTheDocument();
  });

  it('AC-34: a lista só é pedida ao abrir o painel, não ao fechar', async () => {
    const { onOpen } = renderBell();
    const sino = screen.getByRole('button', { name: /Notificações/ });
    await userEvent.click(sino);
    expect(onOpen).toHaveBeenCalledTimes(1);
    await userEvent.click(sino);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('AC-34: o sino anuncia se o painel está aberto', async () => {
    renderBell();
    const sino = screen.getByRole('button', { name: /Notificações/ });
    expect(sino).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(sino);
    expect(sino).toHaveAttribute('aria-expanded', 'true');
  });
});
