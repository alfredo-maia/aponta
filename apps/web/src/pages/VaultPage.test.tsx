import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { VaultPage } from './VaultPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const folders = [{ id: 'f1', name: 'Servidores', organizationId: 'org-1', credentialCount: 1, createdAt: '', updatedAt: '' }];

const credentials = [
  {
    id: 'cred-1',
    name: 'Servidor FTP',
    url: 'https://ftp.example.com',
    description: null,
    organizationId: 'org-1',
    folderId: null,
    hasUsername: true,
    hasPassword: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cred-2',
    name: 'VPN Interna',
    url: null,
    description: null,
    organizationId: 'org-1',
    folderId: null,
    hasUsername: false,
    hasPassword: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

function mockDefaultGets() {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/vault/folders') return { data: folders };
    if (url === '/vault/credentials') {
      return { data: { data: credentials, meta: { total: 2, page: 1, limit: 10, totalPages: 1 } } };
    }
    throw new Error(`Unexpected GET ${url}`);
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vault']}>
        <Routes>
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/vault/audit" element={<div>Tela de auditoria</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT') {
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'user@aponta.com', role },
  });
}

describe('VaultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
    window.confirm = vi.fn(() => true);
  });

  it('shows a loading state while credentials are being fetched', () => {
    vi.mocked(api.get).mockReturnValue(
      new Promise(() => {
        // Never resolves, keeping the query in its loading state.
      }),
    );
    loginAs('ADMIN');
    renderPage();

    expect(screen.getByText(/carregando cofre/i)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network error'));
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar o cofre/i)).toBeInTheDocument();
    });
  });

  it('shows the empty state when there are no credentials in the selected folder', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/vault/folders') return { data: [] };
      if (url === '/vault/credentials') {
        return { data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhuma credencial liberada/i)).toBeInTheDocument();
    });
  });

  it('renders the folder tree and masks every password/username by default (acceptance criterion #1)', async () => {
    mockDefaultGets();
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    expect(screen.getByText(/Servidores \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('VPN Interna')).toBeInTheDocument();
    expect(screen.queryByText('super-secret')).not.toBeInTheDocument();
    expect(screen.getAllByText('••••••••').length).toBeGreaterThan(0);
  });

  it('allows ADMIN to delete a credential after confirming', async () => {
    mockDefaultGets();
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByTitle('Excluir');
    await user.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalledWith('Excluir senha definitivamente?');
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/vault/credentials/cred-1');
    });
  });

  it('hides destructive/management actions for a non-ADMIN role (AGENT)', async () => {
    mockDefaultGets();
    loginAs('AGENT');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    expect(screen.queryByTitle('Excluir')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ações/i })).not.toBeInTheDocument();
  });

  it('copies the username via the reveal endpoint (intent=copy) without ever rendering it', async () => {
    mockDefaultGets();
    vi.mocked(api.post).mockResolvedValue({ data: { value: 'ftpuser' } });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: writeTextMock,
      configurable: true,
    });

    const row = screen.getByText('Servidor FTP').closest('tr') as HTMLElement;
    const copyUsernameBtn = within(row).getByTitle('Copiar usuário');
    copyUsernameBtn.click();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/vault/credentials/cred-1/reveal', { field: 'username', intent: 'copy' });
    });
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('ftpuser');
    });
    expect(screen.queryByText('ftpuser')).not.toBeInTheDocument();
  });

  it('reveals a row in place when the lock icon is clicked, auditing the reveal server-side', async () => {
    mockDefaultGets();
    vi.mocked(api.post).mockImplementation(async (url: string, body: any) => {
      if (body.field === 'username') return { data: { value: 'ftpuser' } };
      return { data: { value: 'fake-password-123' } };
    });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    const row = screen.getByText('Servidor FTP').closest('tr') as HTMLElement;
    const revealBtn = within(row).getByTitle('Revelar linha');
    await user.click(revealBtn);

    await waitFor(() => {
      expect(screen.getByText('ftpuser')).toBeInTheDocument();
      expect(screen.getByText('fake-password-123')).toBeInTheDocument();
    });
    expect(api.post).toHaveBeenCalledWith('/vault/credentials/cred-1/reveal', { field: 'username', intent: 'reveal' });
    expect(api.post).toHaveBeenCalledWith('/vault/credentials/cred-1/reveal', { field: 'password', intent: 'reveal' });
  });
});
