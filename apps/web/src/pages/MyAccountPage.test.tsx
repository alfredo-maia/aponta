import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyAccountPage } from './MyAccountPage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

function renderMyAccountPage() {
  return render(
    <MemoryRouter>
      <MyAccountPage />
    </MemoryRouter>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/senha atual/i), 'old-password');
  await user.type(screen.getByLabelText(/nova senha/i), 'new-password-123');
  await user.click(screen.getByRole('button', { name: /trocar senha/i }));
}

describe('MyAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the change password form', () => {
    renderMyAccountPage();
    expect(screen.getByLabelText(/senha atual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /trocar senha/i }),
    ).toBeInTheDocument();
  });

  it('should submit the change password request and show a success message', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { message: 'Password updated successfully' },
    });

    renderMyAccountPage();
    await fillAndSubmit(user);

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

  it('should show an error message when the current password is wrong (401)', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    renderMyAccountPage();
    await fillAndSubmit(user);

    expect(
      await screen.findByText(/senha atual incorreta/i),
    ).toBeInTheDocument();
  });
});
