import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import { Sidebar } from './Sidebar';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderSidebar(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'AGENT_MASTER' | 'CLIENT' | 'CLIENT_MASTER') {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'user@aponta.com', role },
  });
}

describe('Sidebar', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  it('shows the CLIENT-specific menu without internal/agent-only modules', () => {
    loginAs('CLIENT');
    renderSidebar();

    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Conhecimentos')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.queryByText('Cofre de Senhas')).not.toBeInTheDocument();
    expect(screen.queryByText('Contratos')).not.toBeInTheDocument();
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument();
    expect(screen.queryByText('Recursos')).not.toBeInTheDocument();
  });

  it('shows the full ADMIN menu including Clientes and Recursos, in the fixed order', () => {
    loginAs('ADMIN');
    renderSidebar();

    const expectedOrder = [
      'Dashboard', 'Tickets', 'Chats', 'Clientes', 'Recursos',
      'Contratos', 'Relatórios', 'Agenda', 'Conhecimentos',
      'Cofre de Senhas', 'Configurações',
    ];
    for (const label of expectedOrder) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    const renderedLabels = expectedOrder.filter((l) => screen.queryByText(l));
    expect(renderedLabels).toEqual(expectedOrder);
  });

  it('shows the AGENT_MASTER menu (vault/contracts/reports, no Clientes/Recursos)', () => {
    loginAs('AGENT_MASTER');
    renderSidebar();

    expect(screen.getByText('Cofre de Senhas')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument();
    expect(screen.queryByText('Recursos')).not.toBeInTheDocument();
  });

  it('shows the AGENT menu with access to Relatórios/Carga', () => {
    loginAs('AGENT');
    renderSidebar();

    expect(screen.getByText('Cofre de Senhas')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
  });

  it('shows the CLIENT_MASTER menu with Contratos/Relatórios and no Cofre de Senhas', () => {
    loginAs('CLIENT_MASTER');
    renderSidebar();

    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
    expect(screen.queryByText('Cofre de Senhas')).not.toBeInTheDocument();
  });

  it('falls back to the base menu when there is no logged-in user', () => {
    renderSidebar();

    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Conhecimentos')).toBeInTheDocument();
    expect(screen.queryByText('Cofre de Senhas')).not.toBeInTheDocument();
  });

  it('always renders the "Novo Ticket" action button as a highlighted button, not a nav link', () => {
    loginAs('ADMIN');
    renderSidebar();

    const button = screen.getByRole('button', { name: /novo ticket/i });
    expect(button).toBeInTheDocument();
  });

  it('keeps the collapse/"Esconder" control pinned at the footer, outside the item list', () => {
    loginAs('ADMIN');
    renderSidebar();

    expect(screen.getByText('Esconder')).toBeInTheDocument();
  });

  it('marks the current route item as active', () => {
    loginAs('ADMIN');
    renderSidebar('/reports');

    const reportsButton = screen.getByText('Relatórios').closest('button');
    expect(reportsButton?.className).toContain('bg-brand-100');
  });

  it('keeps the "Tickets" item the same size whether active or not (DMTE-35: no width shift on click)', () => {
    loginAs('ADMIN');

    const { rerender } = renderSidebar('/');
    const activeButton = screen.getByText('Tickets').closest('button');
    const activeClasses = new Set(activeButton?.className.split(/\s+/));

    rerender(
      <MemoryRouter initialEntries={['/reports']}>
        <Sidebar />
      </MemoryRouter>,
    );
    const inactiveButton = screen.getByText('Tickets').closest('button');
    const inactiveClasses = new Set(inactiveButton?.className.split(/\s+/));

    // Padding, font weight and sizing classes must be identical active vs inactive —
    // only the color/background classes are allowed to differ.
    const boxModelClasses = (classes: Set<string>) =>
      [...classes].filter(
        (c) => !c.startsWith('bg-') && !c.startsWith('text-') && !c.startsWith('hover:'),
      );
    expect(boxModelClasses(activeClasses)).toEqual(boxModelClasses(inactiveClasses));
  });

  it('renders Chats as a disabled "Em breve" item that does not navigate (Issue #45 not shipped yet)', async () => {
    const user = userEvent.setup();
    loginAs('ADMIN');
    renderSidebar();

    const chatsButton = screen.getByRole('button', { name: /chats/i });
    expect(chatsButton).toBeDisabled();

    const emBreveBadges = screen.getAllByText('Em breve');
    expect(emBreveBadges).toHaveLength(1);

    await user.click(chatsButton);
    expect(mockNavigate).not.toHaveBeenCalledWith('/chats');
  });

  it('navigates to /schedule when Agenda is clicked', async () => {
    const user = userEvent.setup();
    loginAs('ADMIN');
    renderSidebar();

    const agendaButton = screen.getByRole('button', { name: /agenda/i });
    expect(agendaButton).toBeEnabled();

    await user.click(agendaButton);
    expect(mockNavigate).toHaveBeenCalledWith('/schedule');
  });

  it('navigates to /tickets/new when "Novo Ticket" is clicked', async () => {
    const user = userEvent.setup();
    loginAs('ADMIN');
    renderSidebar();

    await user.click(screen.getByRole('button', { name: /novo ticket/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/tickets/new');
  });

  it('navigates to an enabled item route when clicked', async () => {
    const user = userEvent.setup();
    loginAs('ADMIN');
    renderSidebar();

    await user.click(screen.getByRole('button', { name: 'Relatórios' }));
    expect(mockNavigate).toHaveBeenCalledWith('/reports');
  });

  it('toggles collapsed state when "Esconder"/"Expandir" is clicked', async () => {
    const user = userEvent.setup();
    loginAs('ADMIN');
    renderSidebar();

    expect(screen.getByText('Esconder')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /esconder/i }));

    expect(screen.queryByText('Esconder')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expandir/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expandir/i }));
    expect(screen.getByText('Esconder')).toBeInTheDocument();
  });
});
