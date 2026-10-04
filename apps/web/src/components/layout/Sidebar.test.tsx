import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import { Sidebar } from './Sidebar';

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
});
