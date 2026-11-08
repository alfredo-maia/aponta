import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';
import { useAuthStore } from '../../stores/authStore';

describe('AppLayout', () => {
  function renderLayout() {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'alfredo@dmtecnologia.com.br', role: 'ADMIN' },
    });
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div data-testid="page-content">Content</div>} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the DS background tone (bg-gray-80) on the shell, not the old bg-background token', () => {
    const { container } = renderLayout();
    expect(container.firstChild).toHaveClass('bg-gray-80');
    expect(container.firstChild).not.toHaveClass('bg-background');
  });

  it('renders a white header with the DS border color, not the old bg-background token', () => {
    renderLayout();
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-white');
    expect(header).toHaveClass('border-gray-200');
    expect(header).not.toHaveClass('bg-background');
  });

  it('renders the Sidebar, UserMenu trigger and the routed page content', () => {
    renderLayout();
    expect(screen.getByText('Aponta')).toBeInTheDocument(); // Sidebar brand
    expect(screen.getByText('alfredo@dmtecnologia.com.br')).toBeInTheDocument(); // UserMenu
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  describe('AC-17: menu retrátil no celular', () => {
    it('has an "Abrir menu" button in the header, closed by default', () => {
      renderLayout();
      const toggle = screen.queryByRole('button', { name: 'Abrir menu' });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument();
    });

    it('opens the navigation as a named dialog and flips aria-expanded', async () => {
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

      const dialog = screen.queryByRole('dialog', { name: 'Menu principal' });
      expect(dialog).toBeInTheDocument();
      expect(within(dialog as HTMLElement).queryByRole('button', { name: 'Tickets' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('does not offer the collapse toggle inside the drawer', async () => {
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      const dialog = screen.getByRole('dialog', { name: 'Menu principal' });
      expect(within(dialog).queryByRole('button', { name: 'Esconder' })).not.toBeInTheDocument();
    });

    it('closes with Escape', async () => {
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes when the backdrop is tapped', async () => {
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      await user.click(screen.getByTestId('menu-backdrop'));
      expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument();
    });

    it('moves focus into the dialog when it opens', async () => {
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      const dialog = screen.getByRole('dialog', { name: 'Menu principal' });
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it('returns focus to the "Abrir menu" button after closing with Escape', async () => {
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      await user.keyboard('{Escape}');
      expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
    });

    it('has a visible "Fechar menu" button inside the dialog that closes it', async () => {
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      const dialog = screen.getByRole('dialog', { name: 'Menu principal' });
      expect(within(dialog).queryByRole('button', { name: 'Fechar menu' })).toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Fechar menu' }));
      expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument();
    });

    it('makes the page behind the menu inert while it is open, and not when closed', async () => {
      const user = userEvent.setup();
      renderLayout();
      expect(screen.getByTestId('app-content')).not.toHaveAttribute('inert');

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(screen.queryByTestId('app-content')).toHaveAttribute('inert');
      expect(screen.queryByTestId('desktop-sidebar')).toHaveAttribute('inert');

      await user.keyboard('{Escape}');
      expect(screen.getByTestId('app-content')).not.toHaveAttribute('inert');
    });

    it('locks the page scroll while the menu is open and releases it on close', async () => {
      const user = userEvent.setup();
      renderLayout();
      expect(document.body.style.overflow).toBe('');
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(document.body.style.overflow).toBe('hidden');
      await user.keyboard('{Escape}');
      expect(document.body.style.overflow).toBe('');
    });

    describe('when the viewport grows to the desktop width', () => {
      const original = window.matchMedia;
      afterEach(() => {
        window.matchMedia = original;
      });

      it('closes the drawer, so the fixed sidebar and the drawer never coexist', async () => {
        const listeners: Array<(event: { matches: boolean }) => void> = [];
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          addEventListener: (_type: string, cb: (event: { matches: boolean }) => void) => listeners.push(cb),
          removeEventListener: () => undefined,
        })) as unknown as typeof window.matchMedia;

        const user = userEvent.setup();
        renderLayout();
        await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
        expect(screen.queryByRole('dialog', { name: 'Menu principal' })).toBeInTheDocument();

        listeners.forEach((cb) => cb({ matches: true }));
        await waitFor(() =>
          expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument(),
        );
      });
    });

    it('closes after choosing a destination, and shows that page', async () => {
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      const dialog = screen.getByRole('dialog', { name: 'Menu principal' });
      await user.click(within(dialog).getByRole('button', { name: 'Dashboard' }));
      expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });
});
