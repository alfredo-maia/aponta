import { render, screen, waitFor } from '@testing-library/react';
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
    patch: vi.fn(),
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

  it('should populate the service desk dropdown from the API', async () => {
    renderPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/service-desks');
    });

    const select = screen.getByLabelText(/mesa de serviço/i) as HTMLSelectElement;
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Suporte N1' })).toBeInTheDocument();
    });
    expect(select.querySelectorAll('option')).toHaveLength(2); // placeholder + Suporte N1
  });

  it('should not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    expect(await screen.findByText(/Descrição é obrigatória/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('should submit the form and navigate to the new ticket detail page', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Suporte N1' })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/título \(assunto\)/i), 'Impressora não liga');
    await user.selectOptions(screen.getByLabelText(/mesa de serviço/i), 'sd-1');

    // EzRichText (Tiptap) is not a plain <textarea>/<input> and its
    // contenteditable surface can't be driven by userEvent.type() under
    // jsdom (no layout engine -> no getClientRects). Set the underlying
    // react-hook-form value directly via its onChange the same way the
    // editor itself would, by firing the native 'input' DOM event Tiptap
    // listens to is overkill here — instead we assert the *payload* the
    // mutation sends, so we drive description through fireEvent on the
    // hidden textarea fallback isn't available either. Cover description
    // validation + rich text rendering separately (see
    // EzRichText.test.tsx and the full E2E in tickets.spec.ts); here we
    // only need description to be non-empty for the submit path to reach
    // api.post, so we type the minimum into the contenteditable node
    // directly without relying on focus/selection.
    const editable = screen
      .getByTestId('ticket-description')
      .querySelector('[contenteditable="true"]') as HTMLElement;
    editable.innerHTML = '<p>Não acende ao ligar na tomada.</p>';
    editable.dispatchEvent(new Event('input', { bubbles: true }));

    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets',
        expect.objectContaining({
          title: 'Impressora não liga',
          serviceDeskId: 'sd-1',
        })
      );
    });
    // The DTO contract bug (Issue #49 follow-up): only whitelisted fields
    // may be sent, never organizationId/requesterId/followersIds/etc.
    const sentPayload = vi.mocked(api.post).mock.calls[0][1] as Record<string, unknown>;
    expect(sentPayload).not.toHaveProperty('organizationId');
    expect(sentPayload).not.toHaveProperty('requesterId');
    expect(sentPayload).not.toHaveProperty('followersIds');
    expect(sentPayload).not.toHaveProperty('attachments');

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/tickets/t-99');
    });
  });
});
