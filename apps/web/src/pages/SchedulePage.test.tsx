import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { SchedulePage } from './SchedulePage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const now = new Date();
const mockAppointments = [
  {
    id: 'app-1',
    title: 'Alinhamento Semanal',
    description: 'Sprint Review',
    startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0).toISOString(),
    endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0).toISOString(),
    type: 'APPOINTMENT',
    userId: 'agent-1',
    user: { id: 'agent-1', name: 'Agente Silva', email: 'silva@aponta.com' },
    organizationId: 'org-1',
    organization: { id: 'org-1', name: 'Acme Corp' },
    ticketId: null,
    ticket: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/schedule']}>
        <Routes>
          <Route path="/schedule" element={<SchedulePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT_MASTER' | 'CLIENT') {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'user@aponta.com', role },
  });
}

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('renders the header and navigation controls', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('AGENT');
    renderPage();

    expect(screen.getByText('Agenda & Alocação')).toBeInTheDocument();
    expect(screen.getByText('Hoje')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo agendamento/i })).toBeInTheDocument();
  });

  it('renders appointments list on the current week', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockAppointments });
    loginAs('AGENT');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alinhamento Semanal')).toBeInTheDocument();
      expect(screen.getByText('Agente Silva')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Compromisso')).toBeInTheDocument();
    });
  });

  it('opens create modal when clicking "Novo Agendamento"', async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('AGENT');
    renderPage();

    const newBtn = screen.getByRole('button', { name: /novo agendamento/i });
    await user.click(newBtn);

    expect(screen.getAllByText('Novo Agendamento').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByPlaceholderText(/ex: reunião com cliente/i)).toBeInTheDocument();
  });

  it('filters appointments when changing type filter', async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('ADMIN');
    renderPage();

    const select = screen.getByLabelText(/filtrar por tipo/i);
    await user.selectOptions(select, 'ALLOCATION');

    expect(api.get).toHaveBeenCalledWith(
      '/appointments',
      expect.objectContaining({
        params: expect.objectContaining({ type: 'ALLOCATION' }),
      }),
    );
  });

  it('shows technician input filter only for ADMIN', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('ADMIN');
    renderPage();

    expect(screen.getByPlaceholderText(/filtrar id do técnico/i)).toBeInTheDocument();
  });

  it('does not show technician input filter for standard AGENT', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('AGENT');
    renderPage();

    expect(screen.queryByPlaceholderText(/filtrar id do técnico/i)).not.toBeInTheDocument();
  });
});
