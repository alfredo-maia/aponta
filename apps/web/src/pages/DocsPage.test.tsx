import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DocsPage } from './DocsPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/docs']}>
      <Routes>
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DocsPage', () => {
  it('renders the header and the "Visão geral" section by default', () => {
    renderPage();

    expect(screen.getByText('Central de Documentação')).toBeInTheDocument();
    expect(screen.getAllByText('Visão geral do Aponta').length).toBeGreaterThan(0);
    expect(screen.getByText(/plataforma de Service Desk/i)).toBeInTheDocument();
  });

  it('renders every documented module section (tickets, relatórios, cofre, contratos, conhecimento)', () => {
    renderPage();

    expect(screen.getAllByText('Tickets & Kanban').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Relatórios').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cofre de Senhas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contratos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Base de Conhecimento').length).toBeGreaterThan(0);
    expect(screen.getByText('MCP — Conectando Assistentes de IA')).toBeInTheDocument();
  });

  it('highlights the clicked sidebar nav item and scrolls to the matching section', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollSpy;
    renderPage();

    const contractsNavButton = screen.getAllByRole('button', { name: /contratos/i })[0];
    await user.click(contractsNavButton);

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(contractsNavButton.className).toContain('bg-primary');
  });

  it('jumps to the API section when the in-text FAQ link is clicked', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollSpy;
    renderPage();

    const apiLinks = screen.getAllByText('API & Tokens de Acesso');
    // the in-text FAQ link (an <a> inside the Dúvidas Frequentes section)
    const faqLink = apiLinks.find((el) => el.tagName === 'A');
    expect(faqLink).toBeTruthy();
    await user.click(faqLink!);

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('links to the token generation flow in Minha Conta', () => {
    renderPage();

    const link = screen.getByRole('link', { name: /configurações > minha conta/i });
    expect(link).toHaveAttribute('href', '/my-account');
  });
});
