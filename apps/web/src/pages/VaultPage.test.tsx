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
  {
    id: 'cred-3',
    name: 'Backup Interno',
    url: null,
    description: null,
    organizationId: 'org-1',
    folderId: null,
    hasUsername: true,
    hasPassword: false,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
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

/**
 * The `EzTextInput`/select fields rendered by `FolderModal`/`CredentialModal`
 * don't wire an `id`/`htmlFor` pair, so `getByLabelText` can't associate them.
 * The DOM testing library's default text matcher only looks at an element's
 * own direct text nodes, so an exact label match is unambiguous even though
 * other elements (buttons, titles) may contain the same words. We use that to
 * walk from the `<label>` to its sibling `<input>`/`<select>`.
 */
function fieldFor(root: HTMLElement, labelText: string): HTMLInputElement | HTMLSelectElement {
  const label = within(root).getByText(labelText, { selector: 'label' });
  const field = (label.parentElement as HTMLElement).querySelector('input, select');
  if (!field) throw new Error(`Could not find an input/select for label "${labelText}"`);
  return field as HTMLInputElement | HTMLSelectElement;
}

function lastCredentialsCallParams() {
  const calls = vi.mocked(api.get).mock.calls.filter(([url]) => url === '/vault/credentials');
  const lastCall = calls[calls.length - 1];
  return (lastCall?.[1] as { params?: Record<string, unknown> } | undefined)?.params;
}

async function openActionsMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Ações' }));
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

  it('navigates to /vault/audit when ADMIN clicks "Auditoria"', async () => {
    mockDefaultGets();
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Auditoria' }));

    expect(await screen.findByText('Tela de auditoria')).toBeInTheDocument();
  });

  it('selecting a non-root folder shows its header actions and resets page/revealed state', async () => {
    mockDefaultGets();
    vi.mocked(api.post).mockImplementation(async (_url: string, body: any) => {
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
    await user.click(within(row).getByTitle('Revelar linha'));
    await waitFor(() => {
      expect(screen.getByText('fake-password-123')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('tree-node-f1'));

    await waitFor(() => {
      expect(screen.getByText('Pasta:')).toBeInTheDocument();
    });
    expect(screen.getByText('Servidores')).toBeInTheDocument();
    expect(screen.getByTitle('Editar pasta')).toBeInTheDocument();
    expect(screen.getByTitle('Remover pasta')).toBeInTheDocument();

    // selection resets the page/revealed state
    expect(screen.queryByText('fake-password-123')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(lastCredentialsCallParams()).toMatchObject({ folderId: 'f1', page: 1 });
    });
  });

  it('creates a folder via "Nova pasta" and edits a selected folder\'s name', async () => {
    mockDefaultGets();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    await openActionsMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Nova pasta' }));

    const createDialog = screen.getByRole('dialog');
    await user.type(fieldFor(createDialog, 'Nome da pasta'), 'Rede');
    await user.click(within(createDialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/vault/folders', { name: 'Rede' });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('tree-node-f1'));
    await waitFor(() => {
      expect(screen.getByTitle('Editar pasta')).toBeInTheDocument();
    });
    await user.click(screen.getByTitle('Editar pasta'));

    const editDialog = screen.getByRole('dialog');
    const nameInput = fieldFor(editDialog, 'Nome da pasta');
    expect(nameInput).toHaveValue('Servidores');
    await user.clear(nameInput);
    await user.type(nameInput, 'Servidores Prod');
    await user.click(within(editDialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/vault/folders/f1', { name: 'Servidores Prod' });
    });
  });

  it('does not delete the folder when confirm is cancelled, but does when confirmed', async () => {
    mockDefaultGets();
    vi.mocked(api.delete).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('tree-node-f1'));
    await waitFor(() => {
      expect(screen.getByTitle('Remover pasta')).toBeInTheDocument();
    });

    window.confirm = vi.fn(() => false);
    await user.click(screen.getByTitle('Remover pasta'));
    expect(window.confirm).toHaveBeenCalledWith('Remover a pasta "Servidores"?');
    expect(api.delete).not.toHaveBeenCalledWith('/vault/folders/f1');

    window.confirm = vi.fn(() => true);
    await user.click(screen.getByTitle('Remover pasta'));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/vault/folders/f1');
    });
  });

  it('creates a credential via "Nova senha" and edits one without touching blank username/password', async () => {
    mockDefaultGets();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    await openActionsMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Nova senha' }));

    const createDialog = screen.getByRole('dialog');
    await user.type(fieldFor(createDialog, 'Nome'), 'Novo Serviço');
    await user.type(fieldFor(createDialog, 'Senha'), 'fake-password-123');
    await user.click(within(createDialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/vault/credentials',
        expect.objectContaining({ name: 'Novo Serviço', password: 'fake-password-123' }),
      );
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const editBtns = screen.getAllByTitle('Editar');
    await user.click(editBtns[0]);

    const editDialog = screen.getByRole('dialog');
    expect(fieldFor(editDialog, 'Usuário (deixe em branco para não alterar)')).toHaveValue('');
    expect(fieldFor(editDialog, 'Senha (deixe em branco para não alterar)')).toHaveValue('');
    const nameInput = fieldFor(editDialog, 'Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Servidor FTP Renomeado');
    await user.click(within(editDialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled();
    });
    const patchCall = vi.mocked(api.patch).mock.calls.find(([url]) => url === '/vault/credentials/cred-1');
    expect(patchCall?.[1]).toMatchObject({ name: 'Servidor FTP Renomeado' });
    expect(patchCall?.[1]).not.toHaveProperty('username');
    expect(patchCall?.[1]).not.toHaveProperty('password');
  });

  it('does not save a new credential with a blank/whitespace-only name, nor without a password', async () => {
    mockDefaultGets();
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    await openActionsMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Nova senha' }));
    const dialog = screen.getByRole('dialog');

    // Whitespace-only name (passes the native "required" check, but fails `name.trim()`).
    await user.type(fieldFor(dialog, 'Nome'), '   ');
    await user.type(fieldFor(dialog, 'Senha'), 'fake-password-123');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Valid name, but whitespace-only password while creating (not editing).
    await user.clear(fieldFor(dialog, 'Nome'));
    await user.type(fieldFor(dialog, 'Nome'), 'Nome Válido');
    await user.clear(fieldFor(dialog, 'Senha'));
    await user.type(fieldFor(dialog, 'Senha'), '   ');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('copies the password via the reveal endpoint (intent=copy) without ever rendering it', async () => {
    mockDefaultGets();
    vi.mocked(api.post).mockResolvedValue({ data: { value: 'fake-password-123' } });
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
    const copyPasswordBtn = within(row).getByTitle('Copiar senha');
    copyPasswordBtn.click();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/vault/credentials/cred-1/reveal', { field: 'password', intent: 'copy' });
    });
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('fake-password-123');
    });
    expect(screen.queryByText('fake-password-123')).not.toBeInTheDocument();
  });

  it('shows "—" placeholders for missing username, password, and url columns', async () => {
    mockDefaultGets();
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('VPN Interna')).toBeInTheDocument();
    });

    const vpnRow = screen.getByText('VPN Interna').closest('tr') as HTMLElement; // hasUsername: false, url: null
    expect(within(vpnRow).queryByTitle('Copiar usuário')).not.toBeInTheDocument();
    expect(within(vpnRow).queryByTitle('Copiar URL')).not.toBeInTheDocument();
    expect(within(vpnRow).getAllByText('—')).toHaveLength(2);

    const backupRow = screen.getByText('Backup Interno').closest('tr') as HTMLElement; // hasPassword: false, url: null
    expect(within(backupRow).queryByTitle('Copiar senha')).not.toBeInTheDocument();
    expect(within(backupRow).getAllByText('—')).toHaveLength(2);
  });

  it('lets ADMIN copy and open the URL of a credential that has one', async () => {
    mockDefaultGets();
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
    within(row).getByTitle('Copiar URL').click();
    expect(writeTextMock).toHaveBeenCalledWith('https://ftp.example.com');

    const openLink = within(row).getByTitle('Abrir URL');
    expect(openLink).toHaveAttribute('href', 'https://ftp.example.com');
    expect(openLink).toHaveAttribute('target', '_blank');
  });

  it('hides a previously revealed row again when the lock icon is clicked a second time', async () => {
    mockDefaultGets();
    vi.mocked(api.post).mockResolvedValue({ data: { value: 'fake-password-123' } });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    const row = screen.getByText('Servidor FTP').closest('tr') as HTMLElement;
    await user.click(within(row).getByTitle('Revelar linha'));

    await waitFor(() => {
      expect(within(row).getByTitle('Ocultar')).toBeInTheDocument();
    });
    const callsAfterReveal = vi.mocked(api.post).mock.calls.length;

    await user.click(within(row).getByTitle('Ocultar'));

    await waitFor(() => {
      expect(within(row).getByTitle('Revelar linha')).toBeInTheDocument();
    });
    expect(screen.getAllByText('••••••••').length).toBeGreaterThan(0);
    expect(vi.mocked(api.post).mock.calls.length).toBe(callsAfterReveal);
  });

  it('renders pagination when there is more than one page and refetches for the clicked page', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/vault/folders') return { data: folders };
      if (url === '/vault/credentials') {
        return { data: { data: credentials, meta: { total: 25, page: 1, limit: 10, totalPages: 2 } } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    const pageTwoBtn = screen.getByRole('button', { name: '2' });
    await user.click(pageTwoBtn);

    await waitFor(() => {
      expect(lastCredentialsCallParams()).toMatchObject({ page: 2 });
    });
  });

  it('searches credentials by text and resets to page 1', async () => {
    mockDefaultGets();
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar senha...');
    const user = userEvent.setup();
    // Types character-by-character: each keystroke changes the
    // credentialsQuery key and triggers a refetch. useVaultCredentials uses
    // `placeholderData: keepPreviousData` so the panel (and this input) stays
    // mounted across those refetches instead of flashing back to the
    // top-level loading spinner and dropping keystrokes.
    await user.type(searchInput, 'ftp');

    await waitFor(() => {
      expect(lastCredentialsCallParams()).toMatchObject({ search: 'ftp', page: 1 });
    });
    expect(searchInput).toHaveValue('ftp');
  });

  it('closes folder and credential modals via "Cancelar" without calling the API', async () => {
    mockDefaultGets();
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    await openActionsMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Nova pasta' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalledWith('/vault/folders', expect.anything());

    await openActionsMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Nova senha' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalledWith('/vault/credentials', expect.anything());
  });
});
