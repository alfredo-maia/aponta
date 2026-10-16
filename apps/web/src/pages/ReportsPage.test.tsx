import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ReportsPage } from './ReportsPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const workload = [
  { agentId: 'a1', agentName: 'Alice', totalMinutes: 125 },
  { agentId: 'a2', agentName: 'Bob', totalMinutes: 60 },
];

const billing = [
  {
    organizationId: 'org-1',
    organizationName: 'Empresa A',
    billableMinutes: 120,
    nonBillableMinutes: 30,
    coveredMinutes: 60, excessMinutes: 60, totalValueCents: 12000, unknownValuationCount: 1,
  },
];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/reports/workload') return Promise.resolve({ data: workload });
    if (url === '/reports/billing') return Promise.resolve({ data: billing });
    if (url === '/contracts') return Promise.resolve({ data: [{ id: 'c1', name: 'Suporte' }] });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT_MASTER') {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'user@aponta.com', role },
  });
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    useAuthStore.setState({ token: null, user: null });
  });

  it('shows the workload tab by default with hours formatted as Xh Ym', async () => {
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.getByText('2h 5m')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
  });

  it('shows the Faturamento tab for ADMIN and switches content on click', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /faturamento base/i }));

    await waitFor(() => {
      expect(screen.getByText('Empresa A')).toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledWith('/reports/billing', { params: { contractId: undefined, startDate: undefined, endDate: undefined } });
    expect(screen.getByText('1h 0m / 1h 0m')).toBeInTheDocument();
    expect(screen.getByText(/120,00/)).toBeInTheDocument();
  });

  it('shows the Faturamento tab for CLIENT_MASTER too', async () => {
    loginAs('CLIENT_MASTER');
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /faturamento base/i })).toBeInTheDocument();
    });
  });

  it('hides the Faturamento tab entirely for AGENT', async () => {
    loginAs('AGENT');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.queryByRole('tab', { name: /faturamento base/i })).not.toBeInTheDocument();
    // AGENT must never trigger the billing request at all
    expect(vi.mocked(api.get).mock.calls.some(([url]) => url === '/reports/billing')).toBe(false);
  });

  it('shows an empty state when there is no workload data', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/reports/workload') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhum apontamento registrado/i)).toBeInTheDocument();
    });
  });
});
