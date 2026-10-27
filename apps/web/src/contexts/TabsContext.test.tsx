import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { TabsProvider, useTabs, useOpenInTab } from './TabsContext';

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

function TabsProbe() {
  const { tabs, closeTab } = useTabs();
  return (
    <ul>
      {tabs.map((tab) => (
        <li key={tab.id} data-testid={`tab-${tab.path}`}>
          {tab.title}
          {tab.closable && (
            <button type="button" onClick={() => closeTab(tab.path)} aria-label={`Fechar ${tab.title}`}>
              x
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <TabsProvider>
        <LocationProbe />
        <TabsProbe />
        <OpenButton path="/tickets/t1" title="#AP-0001 - Impressora" />
        <OpenButton path="/tickets/t2" title="#AP-0002 - VPN" />
        <Routes>
          <Route path="*" element={<div>page</div>} />
        </Routes>
      </TabsProvider>
    </MemoryRouter>,
  );
}

describe('TabsContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('always has a fixed, non-closable "Tickets" tab for the root path', () => {
    renderApp();
    expect(screen.getByTestId('tab-/')).toHaveTextContent('Tickets');
    expect(screen.queryByLabelText('Fechar Tickets')).not.toBeInTheDocument();
  });

  it('opening a path creates a new tab and navigates to it', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('Open #AP-0001 - Impressora'));

    expect(screen.getByTestId('tab-/tickets/t1')).toHaveTextContent(
      '#AP-0001 - Impressora',
    );
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/tickets/t1');
  });

  it('reopening an already-open path activates it instead of duplicating the tab', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('Open #AP-0001 - Impressora'));
    await user.click(screen.getByText('Open #AP-0002 - VPN'));
    await user.click(screen.getByText('Open #AP-0001 - Impressora'));

    expect(screen.getAllByTestId('tab-/tickets/t1')).toHaveLength(1);
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/tickets/t1');
  });

  it('closing the active tab activates the previous neighbor', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('Open #AP-0001 - Impressora'));
    await user.click(screen.getByText('Open #AP-0002 - VPN'));
    // Active tab is now /tickets/t2; close it.
    await user.click(screen.getByLabelText('Fechar #AP-0002 - VPN'));

    expect(screen.queryByTestId('tab-/tickets/t2')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/tickets/t1');
  });

  it('closing a non-active tab does not change the current location', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('Open #AP-0001 - Impressora'));
    await user.click(screen.getByText('Open #AP-0002 - VPN'));
    // Active tab is /tickets/t2; close the OTHER one.
    await user.click(screen.getByLabelText('Fechar #AP-0001 - Impressora'));

    expect(screen.queryByTestId('tab-/tickets/t1')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/tickets/t2');
  });

  it('persists open tabs in sessionStorage and restores them on remount (survives refresh)', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp();

    await user.click(screen.getByText('Open #AP-0001 - Impressora'));
    unmount();

    renderApp(['/tickets/t1']);
    expect(screen.getByTestId('tab-/tickets/t1')).toHaveTextContent(
      '#AP-0001 - Impressora',
    );
  });
});
