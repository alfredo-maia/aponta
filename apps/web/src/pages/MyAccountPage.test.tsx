import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyAccountPage } from './MyAccountPage';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

function renderMyAccountPage() {
  return render(
    <MemoryRouter>
      <MyAccountPage />
    </MemoryRouter>,
  );
}

describe('MyAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'jane@example.com', role: 'AGENT' },
    });
    vi.mocked(api.get).mockResolvedValue({
      data: { id: 'u-1', name: 'Jane Doe', email: 'jane@example.com', role: 'AGENT' },
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
});
