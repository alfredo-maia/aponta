import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { useAuthStore } from './stores/authStore';

describe('App', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    window.history.pushState({}, '', '/');
  });

  it('redirects unauthenticated users to the login page', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('renders the placeholder dashboard for authenticated users', () => {
    useAuthStore.setState({
      token: 'fake.jwt.token',
      user: { sub: '1', email: 'jane@example.com', role: 'CLIENT' },
    });

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /aponta/i }),
    ).toBeInTheDocument();
  });
});
