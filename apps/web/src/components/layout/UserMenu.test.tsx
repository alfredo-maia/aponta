import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '../../stores/authStore';

describe('UserMenu', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'alfredo@dmtecnologia.com.br', role: 'ADMIN' },
    });
  });

  function renderMenu() {
    return render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );
  }

  it('shows the user email as the trigger and hides the dropdown initially', () => {
    renderMenu();
    expect(screen.getByText('alfredo@dmtecnologia.com.br')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /minha conta/i }),
    ).not.toBeInTheDocument();
  });

  it('opens the dropdown with Minha Conta and Sair when clicked', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByText('alfredo@dmtecnologia.com.br'));

    expect(
      screen.getByRole('link', { name: /minha conta/i }),
    ).toHaveAttribute('href', '/my-account');
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
  });

  it('calls logout when Sair is clicked', async () => {
    const user = userEvent.setup();
    const logoutSpy = vi.fn();
    useAuthStore.setState({ logout: logoutSpy });
    renderMenu();

    await user.click(screen.getByText('alfredo@dmtecnologia.com.br'));
    await user.click(screen.getByRole('button', { name: /sair/i }));

    expect(logoutSpy).toHaveBeenCalled();
  });
});
