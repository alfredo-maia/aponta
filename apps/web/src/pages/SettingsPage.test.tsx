import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { useAuthStore } from '../stores/authStore';

describe('SettingsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  it('should render a link to My Account for any authenticated user', () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'agent@aponta.com', role: 'AGENT' },
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: /minha conta/i }),
    ).toHaveAttribute('href', '/my-account');
  });

  it('should render a link to Departamentos only for ADMIN', () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'admin@aponta.com', role: 'ADMIN' },
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: /departamentos/i }),
    ).toHaveAttribute('href', '/service-desks');
  });

  it('should not render the Departamentos link for a non-ADMIN user', () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: 'client@aponta.com', role: 'CLIENT' },
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole('link', { name: /departamentos/i }),
    ).not.toBeInTheDocument();
  });
});
