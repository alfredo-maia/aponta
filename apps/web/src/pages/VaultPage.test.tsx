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
    delete: vi.fn(),
  },
}));

const credentials = [
  {
    id: 'cred-1',
    name: 'Servidor FTP',
    username: 'ftpuser',
    password: 'super-secret',
    organizationId: 'org-1',
    organization: { name: 'Empresa A' },
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cred-2',
    name: 'VPN Interna',
    password: 'another-secret',
    organizationId: 'org-1',
    organization: { name: 'Empresa A' },
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/vault']}>
        <Routes>
          <Route path="/vault" element={<VaultPage />} />
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

  it('shows the empty state when there are no credentials', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhuma credencial liberada/i)).toBeInTheDocument();
    });
  });

  it('groups credentials by organization and masks the password', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: credentials });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('2 pastas/senhas')).toBeInTheDocument();
    expect(screen.queryByText('super-secret')).not.toBeInTheDocument();
    expect(screen.getAllByText('********')).toHaveLength(2);
  });

  it('allows ADMIN to delete a credential after confirming', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: credentials });
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
      expect(api.delete).toHaveBeenCalledWith('/vault/cred-1');
    });
  });

  it('hides the delete button for a non-ADMIN role (AGENT)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: credentials });
    loginAs('AGENT');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    expect(screen.queryByTitle('Excluir')).not.toBeInTheDocument();
  });

  it('copies the username to the clipboard when the copy button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: credentials });
    loginAs('ADMIN');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Servidor FTP')).toBeInTheDocument();
    });

    // Define the spy AFTER rendering: @testing-library/user-event's setup()
    // installs its own navigator.clipboard stub, which would otherwise
    // shadow a spy created beforehand. Native .click() avoids depending on
    // userEvent's clipboard handling, which we aren't testing here.
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: writeTextMock,
      configurable: true,
    });

    const firstCard = screen.getByText('Servidor FTP').closest('li') as HTMLElement;
    const copyButtons = within(firstCard).getAllByRole('button');
    copyButtons[0].click();

    expect(writeTextMock).toHaveBeenCalledWith('ftpuser');
  });
});
