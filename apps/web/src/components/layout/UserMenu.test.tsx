import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '../../stores/authStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

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
      screen.queryByRole('menuitem', { name: /minha conta/i }),
    ).not.toBeInTheDocument();
  });

  it('opens the dropdown with Minha Conta and Sair when clicked, and navigates to /my-account', async () => {
    const user = userEvent.setup();
    const navigateMock = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigateMock);
    renderMenu();

    await user.click(screen.getByText('alfredo@dmtecnologia.com.br'));

    const myAccountItem = screen.getByRole('menuitem', { name: /minha conta/i });
    expect(myAccountItem).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /sair/i })).toBeInTheDocument();

    await user.click(myAccountItem);
    expect(navigateMock).toHaveBeenCalledWith('/my-account');
  });

  it('calls logout when Sair is clicked', async () => {
    const user = userEvent.setup();
    const logoutSpy = vi.fn();
    useAuthStore.setState({ logout: logoutSpy });
    renderMenu();

    await user.click(screen.getByText('alfredo@dmtecnologia.com.br'));
    await user.click(screen.getByRole('menuitem', { name: /sair/i }));

    expect(logoutSpy).toHaveBeenCalled();
  });
});
