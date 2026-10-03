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

  it('shows the CLIENT-specific menu (Meus Chamados / Abrir Chamado) without internal modules', () => {
    loginAs('CLIENT');
    renderSidebar();

    expect(screen.getByText('Meus Chamados')).toBeInTheDocument();
    expect(screen.getByText('Abrir Chamado')).toBeInTheDocument();
    expect(screen.getByText('Ajuda (FAQ)')).toBeInTheDocument();
    expect(screen.getByText('Documentação')).toBeInTheDocument();
    expect(screen.queryByText('Cofre de Senhas')).not.toBeInTheDocument();
    expect(screen.queryByText(/contratos/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Empresas')).not.toBeInTheDocument();
  });

  it('shows the full ADMIN menu including Empresas and Departamentos', () => {
    loginAs('ADMIN');
    renderSidebar();

    expect(screen.getByText('Caixa de Entrada')).toBeInTheDocument();
    expect(screen.getByText('Novo Chamado')).toBeInTheDocument();
    expect(screen.getByText('Cofre de Senhas')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText('Departamentos')).toBeInTheDocument();
    expect(screen.getByText('Empresas')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
    expect(screen.getByText('Documentação')).toBeInTheDocument();
  });

  it('shows the AGENT_MASTER menu (vault/contracts/reports, no Empresas/Departamentos)', () => {
    loginAs('AGENT_MASTER');
    renderSidebar();

    expect(screen.getByText('Cofre de Senhas')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
    expect(screen.queryByText('Empresas')).not.toBeInTheDocument();
    expect(screen.queryByText('Departamentos')).not.toBeInTheDocument();
  });

  it('shows the AGENT menu with "Carga de Trabalho" label instead of "Relatórios"', () => {
    loginAs('AGENT');
    renderSidebar();

    expect(screen.getByText('Cofre de Senhas')).toBeInTheDocument();
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText('Carga de Trabalho')).toBeInTheDocument();
    expect(screen.queryByText('Relatórios')).not.toBeInTheDocument();
  });

  it('shows the CLIENT_MASTER menu with "Meus Contratos" label and no Cofre de Senhas', () => {
    loginAs('CLIENT_MASTER');
    renderSidebar();

    expect(screen.getByText('Meus Contratos')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
    expect(screen.queryByText('Cofre de Senhas')).not.toBeInTheDocument();
  });

  it('falls back to the base menu (+ Documentação) when there is no logged-in user', () => {
    renderSidebar();

    expect(screen.getByText('Caixa de Entrada')).toBeInTheDocument();
    expect(screen.getByText('Novo Chamado')).toBeInTheDocument();
    expect(screen.getByText('Documentação')).toBeInTheDocument();
    expect(screen.queryByText('Cofre de Senhas')).not.toBeInTheDocument();
  });

  it('marks the current route link as active', () => {
    loginAs('ADMIN');
    renderSidebar('/reports');

    const reportsLink = screen.getByText('Relatórios').closest('a');
    expect(reportsLink?.className).toContain('bg-primary');
  });
});
