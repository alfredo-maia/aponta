import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateTicketPage } from './CreateTicketPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    sub: 'u1',
    email: 'test@example.com',
    role: 'ADMIN'
  }))
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => navigateMock,
  };
});

describe('CreateTicketPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/service-desks') {
        return Promise.resolve({
          data: [
            { id: 'sd-1', name: 'Suporte N1' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    vi.mocked(api.post).mockResolvedValue({
      data: { id: 't-99', title: 'Test Ticket' },
    });
  });

  const renderPage = () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreateTicketPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should render ticket form with new DS components', () => {
    renderPage();
    expect(screen.getByLabelText(/título \(assunto\)/i)).toBeInTheDocument();
    expect(screen.getByText(/descrição detalhada/i)).toBeInTheDocument();
  });

  it('should not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    expect(await screen.findByText(/Descrição é obrigatória/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
