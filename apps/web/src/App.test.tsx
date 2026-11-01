import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { api } from './lib/api';
import { useAuthStore } from './stores/authStore';

vi.mock('./lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/tickets') {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    useAuthStore.setState({ token: null, user: null });
    window.history.pushState({}, '', '/');
  });

  it('redirects unauthenticated users to the login page', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /entrar/i }),
    ).toBeInTheDocument();
  });

  it('renders the dashboard page for authenticated users', async () => {
    useAuthStore.setState({
      token: 'fake.jwt.token',
      user: { sub: '1', email: 'jane@example.com', role: 'CLIENT' },
    });

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Tickets' }),
    ).toBeInTheDocument();
  });

  it('renders the public /r/knowledge portal without redirecting to login, even with no session (AC-07)', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/public/knowledge/folders') return Promise.resolve({ data: [] });
      if (url === '/public/knowledge/articles') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    window.history.pushState({}, '', '/r/knowledge');

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /base de conhecimento/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /entrar/i })).not.toBeInTheDocument();
  });
});
