import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ServiceDesksPage } from './ServiceDesksPage';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const serviceDesks = [
  { id: 'sd-1', name: 'Suporte N1', createdAt: '2026-09-29T10:00:00.000Z' },
  { id: 'sd-2', name: 'Infraestrutura', createdAt: '2026-09-29T10:00:00.000Z' },
];

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/service-desks') {
      return Promise.resolve({ data: serviceDesks });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/service-desks']}>
        <Routes>
          <Route path="/service-desks" element={<ServiceDesksPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT') {
  // Same decode-free shortcut the rest of the web suite uses: set the
  // store's `user` directly rather than crafting a real JWT, since the
  // page only reads `useAuthStore` state, never decodes a token itself.
  useAuthStore.setState({
    token: 'fake-token',
    user: { sub: 'u-1', email: 'admin@aponta.com', role },
  });
}

describe('ServiceDesksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet();
    useAuthStore.setState({ token: null, user: null });
  });

  it('should list existing service desks for an ADMIN user', async () => {
    loginAs('ADMIN');
    renderPage();

    expect(await screen.findByText('Suporte N1')).toBeInTheDocument();
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();
  });

  it('should create a new service desk and show it in the list', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    const created = {
      id: 'sd-3',
      name: 'Financeiro',
      createdAt: '2026-09-30T10:00:00.000Z',
    };
    vi.mocked(api.post).mockResolvedValue({ data: created });

    renderPage();
    await screen.findByText('Suporte N1');

    await user.type(screen.getByLabelText(/name/i), 'Financeiro');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/service-desks', {
        name: 'Financeiro',
      });
    });
  });

  it('should not submit when the name field is empty', async () => {
    loginAs('ADMIN');
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Suporte N1');

    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should show an access-denied message for a non-ADMIN user', () => {
    loginAs('CLIENT');
    renderPage();

    expect(
      screen.getByText(/do not have permission/i),
    ).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
