import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { CreateTicketPage } from './CreateTicketPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const serviceDesks = [
  { id: 'sd-1', name: 'Suporte N1' },
  { id: 'sd-2', name: 'Infraestrutura' },
];

const createdTicket = {
  id: 't-99',
  protocol: 'AP-000099',
  title: 'New printer request',
  description: 'Need a new printer on floor 3.',
  status: 'OPEN',
  priority: 'MEDIUM',
  requesterId: 'u-1',
  agentId: null,
  serviceDeskId: 'sd-1',
  responseDeadline: null,
  resolveDeadline: null,
  createdAt: '2026-09-29T10:00:00.000Z',
  updatedAt: '2026-09-29T10:00:00.000Z',
};

function mockApi() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/service-desks') {
      return Promise.resolve({ data: serviceDesks });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  vi.mocked(api.post).mockImplementation((url: string) => {
    if (url === '/tickets') {
      return Promise.resolve({ data: createdTicket });
    }
    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tickets/new']}>
        <Routes>
          <Route path="/tickets/new" element={<CreateTicketPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CreateTicketPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('should render ticket form', () => {
    renderPage();
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
  });

  it('should populate the service desk dropdown from the API', async () => {
    renderPage();

    expect(
      await screen.findByRole('option', { name: 'Suporte N1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Infraestrutura' }),
    ).toBeInTheDocument();
  });

  it('should submit the form and navigate to the new ticket detail page', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: 'Suporte N1' });

    await user.type(screen.getByLabelText(/título/i), 'New printer request');
    await user.type(
      screen.getByLabelText(/descrição/i),
      'Need a new printer on floor 3.',
    );
    await user.selectOptions(screen.getByLabelText(/departamento/i), 'sd-1');
    await user.selectOptions(screen.getByLabelText(/prioridade/i), 'MEDIUM');

    await user.click(screen.getByRole('button', { name: /submeter solicitação/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets', {
        title: 'New printer request',
        description: 'Need a new printer on floor 3.',
        serviceDeskId: 'sd-1',
        priority: 'MEDIUM',
      });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/tickets/t-99');
    });
  });

  it('should not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: 'Suporte N1' });

    await user.click(screen.getByRole('button', { name: /submeter solicitação/i }));

    expect(await screen.findByText(/título é obrigatório/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
