import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { TicketAttachments } from './TicketAttachments';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const attachments = [
  {
    id: 'att-1',
    filename: 'f1.pdf',
    originalName: 'relatorio.pdf',
    mimeType: 'application/pdf',
    fileUrl: 'https://files/relatorio.pdf',
    createdAt: '2026-01-01T00:00:00.000Z',
    uploaderId: 'u-1',
  },
  {
    id: 'att-2',
    filename: 'f2.png',
    originalName: 'print.png',
    mimeType: 'image/png',
    fileUrl: 'https://files/print.png',
    createdAt: '2026-01-02T00:00:00.000Z',
    uploaderId: 'other-user',
  },
];

function renderComponent(ticketId = 't1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketAttachments ticketId={ticketId} />
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT', sub = 'u-1') {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub, email: 'user@aponta.com', role },
  });
}

describe('TicketAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('shows a loading state while fetching attachments', () => {
    vi.mocked(api.get).mockReturnValue(
      new Promise(() => {
        // Never resolves, keeping the query in its loading state.
      }),
    );
    loginAs('ADMIN');
    renderComponent();

    expect(screen.getByRole('status')).toHaveTextContent(/carregando anexos/i);
  });

  it('shows the empty state when there are no attachments', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('ADMIN');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/nenhum anexo neste chamado ainda/i)).toBeInTheDocument();
    });
  });

  it('lists attachments and shows "Remover" for an ADMIN on any attachment', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: attachments });
    loginAs('ADMIN');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('relatorio.pdf')).toBeInTheDocument();
    });

    expect(screen.getByText('print.png')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /remover/i })).toHaveLength(2);
  });

  it('only shows "Remover" on the own upload for a CLIENT (not uploaded by others)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: attachments });
    loginAs('CLIENT', 'u-1');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('relatorio.pdf')).toBeInTheDocument();
    });

    // u-1 uploaded att-1, so only one "Remover" button shows
    expect(screen.getAllByRole('button', { name: /remover/i })).toHaveLength(1);
  });

  it('uploads the selected file via POST and resets the input', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({ data: attachments[0] });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/nenhum anexo neste chamado ainda/i)).toBeInTheDocument();
    });

    const file = new File(['conteudo'], 'teste.txt', { type: 'text/plain' });
    const input = document.getElementById('attachment-file') as HTMLInputElement;
    await user.upload(input, file);

    expect(screen.getByText('teste.txt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /anexar arquivo/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets/t1/attachments',
        expect.anything(),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    });
  });

  it('shows an error message when the upload fails', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockRejectedValue(new Error('too big'));
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/nenhum anexo neste chamado ainda/i)).toBeInTheDocument();
    });

    const file = new File(['x'], 'big.bin', { type: 'application/octet-stream' });
    const input = document.getElementById('attachment-file') as HTMLInputElement;
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: /anexar arquivo/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/falha ao enviar o anexo/i);
    });
  });

  it('deletes an attachment when "Remover" is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: attachments });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('relatorio.pdf')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: /remover/i })[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/tickets/t1/attachments/att-1');
    });
  });
});
