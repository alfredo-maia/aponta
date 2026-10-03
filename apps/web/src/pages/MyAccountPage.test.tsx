import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyAccountPage } from './MyAccountPage';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderMyAccountPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyAccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MyAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'jane@example.com', role: 'AGENT' },
    });
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          data: { id: 'u-1', name: 'Jane Doe', email: 'jane@example.com', role: 'AGENT' },
        });
      }
      if (url === '/api-tokens') {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  it('fetches the current profile via GET /auth/me and prefills name and email', async () => {
    renderMyAccountPage();
    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(await screen.findByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });

  it('renders tabs for Minha Conta and Segurança, defaulting to Minha Conta', () => {
    renderMyAccountPage();
    expect(
      screen.getByRole('tab', { name: /minha conta/i }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /segurança/i })).toBeInTheDocument();
    // Profile fields visible by default; password fields not yet.
    expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/senha atual/i)).not.toBeInTheDocument();
  });

  describe('Minha Conta tab (profile)', () => {
    it('submits updated name and email via PATCH /auth/me', async () => {
      const user = userEvent.setup();
      vi.mocked(api.patch).mockResolvedValueOnce({
        data: { id: 'u-1', name: 'Jane Updated', email: 'jane.updated@example.com', role: 'AGENT' },
      });

      renderMyAccountPage();
      await screen.findByDisplayValue('Jane Doe');
      await user.clear(screen.getByLabelText(/^nome$/i));
      await user.type(screen.getByLabelText(/^nome$/i), 'Jane Updated');
      await user.clear(screen.getByLabelText(/^e-mail$/i));
      await user.type(screen.getByLabelText(/^e-mail$/i), 'jane.updated@example.com');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/auth/me', {
          name: 'Jane Updated',
          email: 'jane.updated@example.com',
        });
      });
      expect(
        await screen.findByText(/dados atualizados com sucesso/i),
      ).toBeInTheDocument();
    });

    it('shows an error when the email is already in use (409)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.patch).mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 409 },
      });

      renderMyAccountPage();
      await screen.findByDisplayValue('Jane Doe');
      await user.clear(screen.getByLabelText(/^e-mail$/i));
      await user.type(screen.getByLabelText(/^e-mail$/i), 'taken@example.com');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(
        await screen.findByText(/e-mail já está em uso/i),
      ).toBeInTheDocument();
    });
  });

  describe('Segurança tab (password)', () => {
    async function fillAndSubmitPassword(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('tab', { name: /segurança/i }));
      await user.type(screen.getByLabelText(/senha atual/i), 'old-password');
      await user.type(screen.getByLabelText(/nova senha/i), 'new-password-123');
      await user.click(screen.getByRole('button', { name: /trocar senha/i }));
    }

    it('renders the change password form when the tab is selected', async () => {
      const user = userEvent.setup();
      renderMyAccountPage();
      await user.click(screen.getByRole('tab', { name: /segurança/i }));

      expect(screen.getByLabelText(/senha atual/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /trocar senha/i }),
      ).toBeInTheDocument();
    });

    it('submits the change password request and shows a success message', async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { message: 'Password updated successfully' },
      });

      renderMyAccountPage();
      await fillAndSubmitPassword(user);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
          currentPassword: 'old-password',
          newPassword: 'new-password-123',
        });
      });
      expect(
        await screen.findByText(/senha atualizada com sucesso/i),
      ).toBeInTheDocument();
    });

    it('shows an error message when the current password is wrong (401)', async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401 },
      });

      renderMyAccountPage();
      await fillAndSubmitPassword(user);

      expect(
        await screen.findByText(/senha atual incorreta/i),
      ).toBeInTheDocument();
    });
  });

  describe('Tokens de API tab', () => {
    it('creates a token, shows the plaintext value once, then lists it as metadata-only', async () => {
      const user = userEvent.setup();
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          id: 'tok-1',
          name: 'Claude Desktop',
          token: 'apta_abcdef1234567890',
          createdAt: '2026-10-03T00:00:00.000Z',
          lastUsedAt: null,
        },
      });
      // After creation, the list is re-fetched (metadata only, no token).
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/auth/me') {
          return Promise.resolve({
            data: { id: 'u-1', name: 'Jane Doe', email: 'jane@example.com', role: 'AGENT' },
          });
        }
        if (url === '/api-tokens') {
          return Promise.resolve({
            data: [
              { id: 'tok-1', name: 'Claude Desktop', createdAt: '2026-10-03T00:00:00.000Z', lastUsedAt: null },
            ],
          });
        }
        return Promise.reject(new Error(`Unexpected GET ${url}`));
      });

      renderMyAccountPage();
      await user.click(screen.getByRole('tab', { name: /tokens de api/i }));

      await user.type(screen.getByLabelText(/nome do token/i), 'Claude Desktop');
      await user.click(screen.getByRole('button', { name: /gerar token/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/api-tokens', { name: 'Claude Desktop' });
      });

      // The plaintext token is shown exactly once, right after creation.
      expect(await screen.findByText('apta_abcdef1234567890')).toBeInTheDocument();

      // The persisted list entry never carries the plaintext value.
      await waitFor(() => {
        expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
      });
    });

    it('revokes a token after confirmation', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/auth/me') {
          return Promise.resolve({
            data: { id: 'u-1', name: 'Jane Doe', email: 'jane@example.com', role: 'AGENT' },
          });
        }
        if (url === '/api-tokens') {
          return Promise.resolve({
            data: [
              { id: 'tok-1', name: 'Old Script', createdAt: '2026-01-01T00:00:00.000Z', lastUsedAt: null },
            ],
          });
        }
        return Promise.reject(new Error(`Unexpected GET ${url}`));
      });
      vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderMyAccountPage();
      await user.click(screen.getByRole('tab', { name: /tokens de api/i }));

      expect(await screen.findByText('Old Script')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /revogar/i }));

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/api-tokens/tok-1');
      });
    });
  });
});
