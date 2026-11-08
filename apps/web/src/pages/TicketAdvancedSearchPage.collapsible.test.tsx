import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { TicketAdvancedSearchPage } from './TicketAdvancedSearchPage';

vi.mock('../lib/api', () => ({
  api: { get: vi.fn() },
}));

describe('TicketAdvancedSearchPage: filtros adicionais recolhidos (AC-12, caracterização)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: 'tok', user: { sub: 'u1', email: 'agent@x.com', role: 'AGENT', organizationId: null } });
    vi.mocked(api.get).mockResolvedValue({ data: [] });
  });

  it('a checkbox marked before collapsing is still checked after reopening (the state lives in the form)', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <TicketAdvancedSearchPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const toggle = screen.getByRole('button', { name: 'Filtros adicionais' });
    await user.click(toggle);
    await user.click(screen.getByRole('checkbox', { name: 'Vencidos' }));
    await user.click(toggle);
    expect(screen.queryByRole('checkbox', { name: 'Vencidos' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole('checkbox', { name: 'Vencidos' })).toBeChecked();
  });
});
