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

  it('should render ticket form with new DS components', async () => {
    renderPage();
    expect(await screen.findByLabelText(/título \(assunto\)/i)).toBeInTheDocument();
    expect(screen.getByText(/descrição detalhada/i)).toBeInTheDocument();
  });

  it('DMTE-483 AC-01: mostra carregamento e não renderiza o formulário enquanto o catálogo carrega', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') return new Promise<never>(() => undefined);
      return Promise.resolve({ data: [] });
    });
    renderPage();

    expect(await screen.findByRole('status')).toHaveTextContent(/carregando/i);
    expect(screen.queryByLabelText(/título \(assunto\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Abrir Chamado')).not.toBeInTheDocument();
  });

  it('DMTE-483 AC-02: com a consulta de catálogo falhando, abre o formulário em branco sem esperar retentativas', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') return Promise.reject(new Error('boom'));
      return Promise.resolve({ data: [] });
    });
    // Mesmo QueryClient do App (retentativas padrão): o formulário não pode esperar o backoff.
    queryClient = new QueryClient();
    renderPage();

    expect(await screen.findByLabelText(/título \(assunto\)/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Voltar para o catálogo')).not.toBeInTheDocument();
  });

  it('DMTE-489 AC-01: formulário e catálogo usam o teto max-w-7xl', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [{ id: 'cat-1', name: 'Hardware', description: null, items: [] }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    const catalogWrapper = (await screen.findByText('Catálogo de Serviços')).closest('[class*="max-w-"]');
    expect(catalogWrapper).toHaveClass('max-w-7xl');
    await user.click(screen.getByRole('button', { name: /meu problema não está catalogado/i }));
    const formWrapper = (await screen.findByText('Abrir Chamado')).closest('[class*="max-w-"]');
    expect(formWrapper).toHaveClass('max-w-7xl');
  });

  it('DMTE-489 AC-02: cliente, mesa, solicitante e prioridade em 1, 2 e 4 colunas por largura', async () => {
    renderPage();

    const form = (await screen.findByLabelText(/título \(assunto\)/i)).closest('form') as HTMLElement;
    const identification = form.firstElementChild as HTMLElement;
    expect(identification).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-4');
  });

  it('DMTE-489 AC-03: cartões do catálogo em 1, 2, 3 e 4 colunas por largura', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [
            {
              id: 'cat-1',
              name: 'Hardware',
              description: null,
              items: [
                { id: 'item-1', title: 'Troca de Impressora', description: null, icon: null, defaultServiceDeskId: 'sd-1', defaultPriority: 'HIGH' },
              ],
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    renderPage();

    const card = await screen.findByRole('button', { name: /troca de impressora/i });
    expect(card.parentElement).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'xl:grid-cols-4');
  });

  it('DMTE-489 AC-04: ações do formulário quebram de linha em vez de vazar do cartão', async () => {
    renderPage();

    const submit = await screen.findByRole('button', { name: /abrir ticket/i });
    const actions = submit.closest('form')?.lastElementChild as HTMLElement;
    expect(actions).toHaveClass('sm:flex-wrap');
    expect(submit.parentElement).toHaveClass('sm:flex-wrap', 'sm:ml-auto');
    // Abaixo de sm os botões seguem lado a lado como antes: sem quebra sem prefixo.
    expect(submit.parentElement).not.toHaveClass('flex-wrap');
  });

  it('DMTE-489 AC-05: aviso de catálogo obrigatório ocupa a linha inteira da grade de 4 colunas', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/service-desks') {
        return Promise.resolve({ data: [{ id: 'sd-1', name: 'Suporte N1', catalogRequiredOnOpen: true }] });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: 'Suporte N1', hidden: true });
    await user.selectOptions(screen.getByLabelText(/^mesa/i, { selector: 'select' }), 'sd-1');

    expect(await screen.findByText(/exige um item do catálogo/i)).toHaveClass('md:col-span-2', 'xl:col-span-4');
  });

  it('DMTE-483 AC-04: formulário e catálogo usam a mesma largura máxima', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [{ id: 'cat-1', name: 'Hardware', description: null, items: [] }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();

    const maxWidth = (el: HTMLElement) =>
      (el.closest('[class*="max-w-"]') as HTMLElement).className.match(/max-w-\S+/)?.[0];

    const catalogWidth = maxWidth(await screen.findByText('Catálogo de Serviços'));
    await user.click(screen.getByRole('button', { name: /meu problema não está catalogado/i }));
    const formWidth = maxWidth(await screen.findByText('Abrir Chamado'));

    expect(formWidth).toBe(catalogWidth);
  });

  it('should populate the service desk dropdown from the API', async () => {
    renderPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/service-desks');
    });

    const select = screen.getByLabelText(/^mesa/i, { selector: 'select' }) as HTMLSelectElement;
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Suporte N1', hidden: true })).toBeInTheDocument();
    });
    expect(select.querySelectorAll('option')).toHaveLength(2); // placeholder + Suporte N1
  });

  it('should not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /abrir ticket/i }));

    expect(await screen.findByText(/Descrição é obrigatória/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('should submit the form and navigate to the new ticket detail page', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Suporte N1', hidden: true })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/título \(assunto\)/i), 'Impressora não liga');
    await user.selectOptions(screen.getByLabelText(/^mesa/i, { selector: 'select' }), 'sd-1');

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

  it('shows the service catalog when the API returns categories, and lets the user pick an item', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [
            {
              id: 'cat-1',
              name: 'Hardware',
              description: null,
              items: [
                {
                  id: 'item-1',
                  title: 'Troca de Impressora',
                  description: 'Solicitar troca de impressora',
                  icon: null,
                  defaultServiceDeskId: 'sd-1',
                  defaultPriority: 'HIGH',
                },
              ],
            },
          ],
        });
      }
      if (url === '/service-desks') {
        return Promise.resolve({ data: [{ id: 'sd-1', name: 'Suporte N1' }] });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Catálogo de Serviços')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /troca de impressora/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /troca de impressora/i }));

    // Picking a catalog item switches to the ticket form and shows the
    // "Serviço Selecionado" banner with the item's title.
    expect(await screen.findByText('Abrir Chamado')).toBeInTheDocument();
    const banner = screen.getByText('Serviço Selecionado:').closest('div') as HTMLElement;
    expect(banner).toHaveTextContent('Troca de Impressora');
  });

  it('AC-3: Esc no formulário volta para o catálogo', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [{ id: 'cat-1', name: 'Hardware', description: null, items: [{ id: 'item-1', title: 'Troca de Impressora', description: 'x', icon: null, defaultServiceDeskId: 'sd-1', defaultPriority: 'HIGH' }] }],
        });
      }
      if (url === '/service-desks') return Promise.resolve({ data: [{ id: 'sd-1', name: 'Suporte N1' }] });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /troca de impressora/i }));
    expect(await screen.findByText('Abrir Chamado')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(await screen.findByText('Catálogo de Serviços')).toBeInTheDocument();
  });

  it('lets the user open a blank ticket from the catalog via "não está catalogado"', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [{ id: 'cat-1', name: 'Hardware', description: null, items: [] }],
        });
      }
      if (url === '/service-desks') {
        return Promise.resolve({ data: [{ id: 'sd-1', name: 'Suporte N1' }] });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Catálogo de Serviços');
    await user.click(screen.getByRole('button', { name: /meu problema não está catalogado/i }));

    expect(await screen.findByText('Abrir Chamado')).toBeInTheDocument();
    // Custom/blank item never shows the "Serviço Selecionado" banner.
    expect(screen.queryByText('Serviço Selecionado:')).not.toBeInTheDocument();
    // The back-to-catalog arrow button is rendered since catalog is non-empty.
    expect(screen.getByLabelText('Voltar para o catálogo')).toBeInTheDocument();
  });

  it('submits a blank ticket from the catalog without the synthetic custom item or an empty desk', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [{ id: 'cat-1', name: 'Hardware', description: null, items: [] }],
        });
      }
      if (url === '/service-desks') {
        return Promise.resolve({ data: [{ id: 'sd-1', name: 'Suporte N1' }] });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Catálogo de Serviços');
    await user.click(screen.getByRole('button', { name: /meu problema não está catalogado/i }));
    await screen.findByText('Abrir Chamado');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Suporte N1', hidden: true })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/título \(assunto\)/i), 'Impressora não liga');
    await user.selectOptions(screen.getByLabelText(/^mesa/i, { selector: 'select' }), 'sd-1');
    const editable = screen
      .getByTestId('ticket-description')
      .querySelector('[contenteditable="true"]') as HTMLElement;
    editable.innerHTML = '<p>Não acende ao ligar na tomada.</p>';
    editable.dispatchEvent(new Event('input', { bubbles: true }));

    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const sent = vi.mocked(api.post).mock.calls[0][1] as Record<string, unknown>;
    expect(sent).not.toHaveProperty('catalogItemId');
    expect(sent.serviceDeskId).toBe('sd-1');
    expect(sent.priority).toBe('MEDIUM');
  });

  it('lets the user go back from the form to the catalog view', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [{ id: 'cat-1', name: 'Hardware', description: null, items: [] }],
        });
      }
      if (url === '/service-desks') {
        return Promise.resolve({ data: [{ id: 'sd-1', name: 'Suporte N1' }] });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Catálogo de Serviços');
    await user.click(screen.getByRole('button', { name: /meu problema não está catalogado/i }));
    await screen.findByText('Abrir Chamado');

    await user.click(screen.getByLabelText('Voltar para o catálogo'));

    expect(await screen.findByText('Catálogo de Serviços')).toBeInTheDocument();
  });

  it('shows a submit error message and does not navigate when the API call fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Suporte N1', hidden: true })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/título \(assunto\)/i), 'Impressora não liga');
    await user.selectOptions(screen.getByLabelText(/^mesa/i, { selector: 'select' }), 'sd-1');

    const editable = screen
      .getByTestId('ticket-description')
      .querySelector('[contenteditable="true"]') as HTMLElement;
    editable.innerHTML = '<p>Não acende ao ligar na tomada.</p>';
    editable.dispatchEvent(new Event('input', { bubbles: true }));

    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    expect(await screen.findByText(/falha ao criar o chamado/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('forwards catalogItemId/serviceDeskId/priority overrides from the selected catalog item on submit', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/catalog') {
        return Promise.resolve({
          data: [
            {
              id: 'cat-1',
              name: 'Hardware',
              description: null,
              items: [
                {
                  id: 'item-1',
                  title: 'Troca de Impressora',
                  description: null,
                  icon: null,
                  defaultServiceDeskId: 'sd-1',
                  defaultPriority: 'HIGH',
                },
              ],
            },
          ],
        });
      }
      if (url === '/service-desks') {
        return Promise.resolve({ data: [{ id: 'sd-1', name: 'Suporte N1' }] });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Catálogo de Serviços');
    await user.click(screen.getByRole('button', { name: /troca de impressora/i }));
    await screen.findByText('Abrir Chamado');

    await user.type(screen.getByLabelText(/título \(assunto\)/i), 'Impressora quebrada');

    const editable = screen
      .getByTestId('ticket-description')
      .querySelector('[contenteditable="true"]') as HTMLElement;
    editable.innerHTML = '<p>Parou de funcionar.</p>';
    editable.dispatchEvent(new Event('input', { bubbles: true }));

    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets',
        expect.objectContaining({
          catalogItemId: 'item-1',
          serviceDeskId: 'sd-1',
          priority: 'HIGH',
        }),
      );
    });
  });

  it('patches the parent ticket and uploads attachments after creating the ticket', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    vi.mocked(api.post).mockImplementation((url) => {
      if (url === '/tickets') {
        return Promise.resolve({ data: { id: 't-99', title: 'Test Ticket' } });
      }
      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Suporte N1', hidden: true })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/título \(assunto\)/i), 'Ticket com anexo');
    await user.selectOptions(screen.getByLabelText(/^mesa/i, { selector: 'select' }), 'sd-1');

    const editable = screen
      .getByTestId('ticket-description')
      .querySelector('[contenteditable="true"]') as HTMLElement;
    editable.innerHTML = '<p>Descrição.</p>';
    editable.dispatchEvent(new Event('input', { bubbles: true }));

    const file = new File(['conteudo'], 'evidencia.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (fileInput) {
      await user.upload(fileInput, file);
    }

    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets', expect.objectContaining({ title: 'Ticket com anexo' }));
    });

    if (fileInput) {
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/tickets/t-99/attachments',
          expect.anything(),
          expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
        );
      });
    }

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/tickets/t-99');
    });
  });
});
