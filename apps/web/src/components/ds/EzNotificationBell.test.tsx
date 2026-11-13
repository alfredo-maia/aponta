import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzNotificationBell, EzNotificationItem } from './EzNotificationBell';

const ITEMS: EzNotificationItem[] = [
  { id: 'n-1', title: 'Cronômetro encerrado automaticamente: ticket T-1001', body: 'O cronômetro de Ana foi encerrado porque o tempo atingiu a agenda.', readAt: null, createdAt: '2026-11-13T10:00:00.000Z' },
  { id: 'n-2', title: 'Apontamento liberado: ticket T-1002', body: 'O apontamento foi liberado.', readAt: '2026-11-13T11:00:00.000Z', createdAt: '2026-11-13T09:00:00.000Z' },
];

function renderBell(over: Partial<React.ComponentProps<typeof EzNotificationBell>> = {}) {
  const props = { items: ITEMS, unreadCount: 1, onItemClick: vi.fn(), onMarkAllRead: vi.fn(), onOpen: vi.fn(), ...over };
  render(<EzNotificationBell {...props} />);
  return props;
}

describe('EzNotificationBell (DMTE-462 T6)', () => {
  it('AC-34: o contador mostra o número das não lidas, "9+" acima de 9 e some quando não há nenhuma', () => {
    const { unmount } = render(<EzNotificationBell items={[]} unreadCount={3} onItemClick={vi.fn()} onMarkAllRead={vi.fn()} />);
    expect(screen.getByTestId('notification-count')).toHaveTextContent('3');
    unmount();
    const nove = render(<EzNotificationBell items={[]} unreadCount={9} onItemClick={vi.fn()} onMarkAllRead={vi.fn()} />);
    expect(screen.getByTestId('notification-count')).toHaveTextContent('9');
    nove.unmount();
    const muitas = render(<EzNotificationBell items={[]} unreadCount={12} onItemClick={vi.fn()} onMarkAllRead={vi.fn()} />);
    expect(screen.getByTestId('notification-count')).toHaveTextContent('9+');
    muitas.unmount();
    render(<EzNotificationBell items={[]} unreadCount={0} onItemClick={vi.fn()} onMarkAllRead={vi.fn()} />);
    expect(screen.queryByTestId('notification-count')).not.toBeInTheDocument();
  });

  it('AC-34: o botão do sino tem nome acessível com a quantidade de não lidas', () => {
    renderBell({ unreadCount: 2 });
    expect(screen.getByRole('button', { name: /Notificações.*2 não lidas/i })).toBeInTheDocument();
  });

  it('AC-34: o painel começa fechado, abre ao clicar no sino e avisa quem abriu', async () => {
    const props = renderBell();
    expect(screen.queryByText(/ticket T-1001/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    expect(screen.getByText(/ticket T-1001/)).toBeInTheDocument();
    expect(props.onOpen).toHaveBeenCalled();
  });

  it('AC-34: lista título e texto, destacando só as não lidas', async () => {
    renderBell();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    const naoLida = screen.getByText(/ticket T-1001/).closest('[data-notification-id]') as HTMLElement;
    const lida = screen.getByText(/ticket T-1002/).closest('[data-notification-id]') as HTMLElement;
    expect(within(naoLida).getByText(/atingiu a agenda/)).toBeInTheDocument();
    expect(naoLida).toHaveAttribute('data-unread', 'true');
    expect(lida).not.toHaveAttribute('data-unread');
  });

  it('AC-34: clicar numa notificação chama onItemClick com ela', async () => {
    const props = renderBell();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    await userEvent.click(screen.getByText(/ticket T-1002/));
    expect(props.onItemClick).toHaveBeenCalledWith(ITEMS[1]);
  });

  it('AC-34: "Marcar todas como lidas" chama onMarkAllRead e fica desativado sem não lidas', async () => {
    const props = renderBell();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));
    expect(props.onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('AC-34: sem não lidas, "Marcar todas como lidas" fica desativado', async () => {
    renderBell({ unreadCount: 0, items: [ITEMS[1]] });
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    expect(screen.getByRole('button', { name: 'Marcar todas como lidas' })).toBeDisabled();
  });

  it('AC-34: não oferece excluir', async () => {
    renderBell();
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    expect(screen.queryByRole('button', { name: /excluir|apagar|remover|limpar/i })).not.toBeInTheDocument();
  });

  it('AC-34: estado vazio, carregando e erro de carga têm mensagens próprias', async () => {
    const vazio = render(<EzNotificationBell items={[]} unreadCount={0} onItemClick={vi.fn()} onMarkAllRead={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    expect(screen.getByText('Nenhuma notificação.')).toBeInTheDocument();
    vazio.unmount();
    const carregando = render(<EzNotificationBell items={[]} unreadCount={0} loading onItemClick={vi.fn()} onMarkAllRead={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    expect(screen.getByText(/Carregando/)).toBeInTheDocument();
    carregando.unmount();
    render(<EzNotificationBell items={[]} unreadCount={0} error onItemClick={vi.fn()} onMarkAllRead={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Erro ao carregar as notificações.');
  });
});
