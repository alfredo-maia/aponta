import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { TabsProvider, useOpenInTab } from '../../contexts/TabsContext';
import { TabBar } from './TabBar';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function OpenButton({ path, title }: { path: string; title: string }) {
  const openInTab = useOpenInTab();
  return (
    <button type="button" onClick={() => openInTab(path, title)}>
      Open {title}
    </button>
  );
}

function renderBar(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <TabsProvider>
        <TabBar />
        <LocationProbe />
        <OpenButton path="/tickets/t1" title="#AP-0001 - Impressora" />
        <Routes>
          <Route path="*" element={<div>page</div>} />
        </Routes>
      </TabsProvider>
    </MemoryRouter>,
  );
}

describe('TabBar', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders the fixed Tickets tab without a close button', () => {
    renderBar();
    expect(screen.getByRole('tab', { name: 'Tickets' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fechar aba' })).not.toBeInTheDocument();
  });

  it('marks the tab matching the current location as active', () => {
    renderBar();
    expect(screen.getByRole('tab', { name: 'Tickets' })).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking a tab navigates to its path', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByText('Open #AP-0001 - Impressora'));
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/tickets/t1');

    await user.click(screen.getByRole('tab', { name: 'Tickets' }));
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/');
  });

  it('closes a closable tab via its close button without navigating the still-active tab', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByText('Open #AP-0001 - Impressora'));
    await user.click(screen.getByRole('tab', { name: 'Tickets' }));

    expect(screen.getByRole('tab', { name: /AP-0001/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar aba' }));
    expect(screen.queryByRole('tab', { name: /AP-0001/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/');
  });

  it('RODADA 2: the close button\'s accessible name never collides with another button named after the tab title (e.g. the Busca avançada toggle)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TabsProvider>
          <button type="button">Busca avançada</button>
          <TabBar />
          <OpenButton path="/tickets/search" title="Busca avançada" />
          <LocationProbe />
          <Routes>
            <Route path="*" element={<div>page</div>} />
          </Routes>
        </TabsProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Open Busca avançada'));

    // Playwright's getByRole name matching is a case-insensitive SUBSTRING
    // match (unlike RTL's exact match), so the original bug —
    // `aria-label="Fechar Busca avançada"` — made
    // `getByRole('button', { name: 'Busca avançada' })` resolve to two
    // elements in the real e2e suite (dashboard.spec.ts) even though an
    // RTL query on the same markup stayed unambiguous. Assert on the
    // aria-label content directly so this test catches the regression
    // regardless of which query engine is matching names.
    const tab = screen.getByRole('tab', { name: /Busca avançada/i });
    const closeButton = within(tab).getByRole('button');
    expect(closeButton.getAttribute('aria-label')).not.toMatch(/Busca avançada/i);
    expect(closeButton).toHaveAccessibleName('Fechar aba');
    expect(closeButton).toHaveAccessibleDescription('Busca avançada');
  });
});
