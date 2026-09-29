import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /create account/i }));
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
  });

  it('should render register form', () => {
    renderRegisterPage();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it('should register and log in the user on success (happy path)', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockImplementation((url: string) => {
      if (url === '/auth/register') {
        return Promise.resolve({
          data: { id: '1', name: 'Jane Doe', email: 'jane@example.com' },
        });
      }
      if (url === '/auth/login') {
        return Promise.resolve({ data: { access_token: 'fake.jwt.token' } });
      }
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });

    renderRegisterPage();
    await fillAndSubmit(user);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'jane@example.com',
        password: 'password123',
      });
    });
    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe('fake.jwt.token');
    });
  });

  it('should show a generic/conflict error when registration itself fails (409)', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    });

    renderRegisterPage();
    await fillAndSubmit(user);

    expect(
      await screen.findByText(/account with this email already exists/i),
    ).toBeInTheDocument();
    // Only the register call should have been attempted; login must not
    // have been called since registration itself failed.
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    });
  });

  it('should show a distinguishing message and a path to /login when register succeeds but auto-login fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockImplementation((url: string) => {
      if (url === '/auth/register') {
        return Promise.resolve({
          data: { id: '1', name: 'Jane Doe', email: 'jane@example.com' },
        });
      }
      if (url === '/auth/login') {
        return Promise.reject({
          isAxiosError: true,
          response: { status: 500 },
        });
      }
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });

    renderRegisterPage();
    await fillAndSubmit(user);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'jane@example.com',
        password: 'password123',
      });
    });

    // Must NOT show the generic/ambiguous error that implies registration
    // itself failed.
    expect(
      screen.queryByText(/something went wrong\. please try again\./i),
    ).not.toBeInTheDocument();

    // Must show a message that makes clear the account WAS created.
    expect(
      await screen.findByText(/account (was )?created/i),
    ).toBeInTheDocument();

    // Must provide a path to /login (either a visible link, or the page
    // navigated there automatically).
    const loginLink = screen.queryByRole('link', { name: /sign in|log in/i });
    expect(loginLink).toBeInTheDocument();

    // The user should never have been logged in with a token.
    expect(useAuthStore.getState().token).toBeNull();
  });
});
