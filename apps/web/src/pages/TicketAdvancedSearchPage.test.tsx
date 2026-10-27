import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { TicketAdvancedSearchPage } from './TicketAdvancedSearchPage';

vi.mock('../lib/api', () => ({
  api: { get: vi.fn() },
}));

const serviceDesks = [{ id: 'sd-1', name: 'Suporte N1' }];
const organizations = [{ id: 'org-1', name: 'Acme' }];
const agents = [{ id: 'agent-1', name: 'Agente Silva' }];
const stages = [{ id: 'stage-1', name: 'Triagem', position: 0, isInitial: true, transitionToIds: [] }];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/service-desks') return Promise.resolve({ data: serviceDesks });
    if (url === '/organizations') return Promise.resolve({ data: organizations });
    if (url === '/users/agents') return Promise.resolve({ data: agents });
    if (url === '/service-desks/sd-1/stages') return Promise.resolve({ data: stages });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname + location.search}</div>;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tickets/search']}>
        <Routes>
          <Route path="/tickets/search" element={<TicketAdvancedSearchPage />} />
          <Route path="/" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TicketAdvancedSearchPage (D4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: 'tok', user: { sub: 'u1', email: 'agent@x.com', role: 'AGENT', organizationId: null } });
    mockApiGet();
  });

  it('renders every D4 field for AGENT/ADMIN', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Busca avançada' })).toBeInTheDocument();
    expect(screen.getByLabelText(/número/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^cliente$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/solicitante/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/atendente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mesa de serviço/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estágio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^prioridade$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
  });

  it('hides Cliente, Solicitante and Atendente for CLIENT (RBAC §2.5)', () => {
    useAuthStore.setState({ token: 'tok', user: { sub: 'u2', email: 'client@x.com', role: 'CLIENT', organizationId: null } });
    renderPage();

    expect(screen.queryByLabelText(/^cliente$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/solicitante/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/atendente/i)).not.toBeInTheDocument();
  });

  it('RODADA 2: hides Atendente (but keeps Solicitante) for CLIENT_MASTER, since GET /users/agents returns 403 for this role', () => {
    useAuthStore.setState({
      token: 'tok',
      user: { sub: 'u3', email: 'master@x.com', role: 'CLIENT_MASTER', organizationId: 'org-1' },
    });
    renderPage();

    expect(screen.queryByLabelText(/^cliente$/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/solicitante/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/atendente/i)).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/users/agents');
  });

  it('RODADA 2: "Status" has Abertos/Fechados shortcuts that map to notClosed/closedOnly, not a literal status (D4)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText(/^status$/i), 'Abertos');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => {
      const probe = screen.getByTestId('location-probe');
      expect(probe.textContent).toContain('notClosed=true');
      expect(probe.textContent).not.toContain('status=');
    });
  });

  it('RODADA 2: "Fechados" shortcut maps to closedOnly', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText(/^status$/i), 'Fechados');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => {
      const probe = screen.getByTestId('location-probe');
      expect(probe.textContent).toContain('closedOnly=true');
      expect(probe.textContent).not.toContain('status=');
    });
  });

  it('keeps Estágio disabled until a Mesa is chosen', async () => {
    renderPage();

    expect(screen.getByLabelText(/estágio/i)).toBeDisabled();

    const user = userEvent.setup();
    await screen.findByRole('option', { name: 'Suporte N1' });
    await user.selectOptions(screen.getByLabelText(/mesa de serviço/i), 'sd-1');

    await waitFor(() => expect(screen.getByLabelText(/estágio/i)).not.toBeDisabled());
  });

  it('"Buscar" navigates to "/" with the chosen filters in the query string', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/número/i), '0007');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => {
      const probe = screen.getByTestId('location-probe');
      expect(probe).toHaveTextContent('/');
      expect(probe.textContent).toContain('number=0007');
    });
  });

  it('"Limpar" resets every field back to empty', async () => {
    const user = userEvent.setup();
    renderPage();

    const numberInput = screen.getByLabelText(/número/i);
    await user.type(numberInput, '0007');
    expect(numberInput).toHaveValue('0007');

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(numberInput).toHaveValue('');
  });
});
