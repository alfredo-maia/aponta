import { render, screen } from '@testing-library/react';
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
    expect(screen.queryByRole('button', { name: /fechar tickets/i })).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /fechar #AP-0001 - Impressora/i }));
    expect(screen.queryByRole('tab', { name: /AP-0001/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/');
  });
});
