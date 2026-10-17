import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { CommercialTicketContext } from './CommercialTicketContext';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderContext(
  props: { ticketId?: string; isAdmin?: boolean } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommercialTicketContext
        ticketId={props.ticketId ?? 't-1'}
        isAdmin={props.isAdmin ?? false}
      />
    </QueryClientProvider>,
  );
}

function stubApiGet({
  commercialOrganizationId = null as string | null,
  organizations = [] as { id: string; name: string }[],
}: {
  commercialOrganizationId?: string | null;
  organizations?: { id: string; name: string }[];
} = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/tickets/t-1') {
      return Promise.resolve({ data: { commercialOrganizationId } });
    }
    if (url === '/organizations') {
      return Promise.resolve({ data: organizations });
    }
    return Promise.resolve({ data: [] });
  });
}

describe('CommercialTicketContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing while the ticket query is still pending', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderContext();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders nothing once the ticket already has a commercial organization', async () => {
    stubApiGet({ commercialOrganizationId: 'org-1' });
    renderContext({ isAdmin: true });
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/tickets/t-1'),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/organizations');
  });

  it('warns a non-admin agent without showing the regularization form', async () => {
    stubApiGet({ commercialOrganizationId: null });
    renderContext({ isAdmin: false });
    await waitFor(() =>
      expect(
        screen.getByText(/Empresa comercial não definida/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByLabelText('Empresa comercial do chamado'),
    ).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/organizations');
  });

  it('lets an admin pick an organization and regularizes the ticket', async () => {
    stubApiGet({
      commercialOrganizationId: null,
      organizations: [{ id: 'org-9', name: 'Empresa Nove' }],
    });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    renderContext({ isAdmin: true });
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Empresa Nove' }),
      ).toBeInTheDocument(),
    );
    const button = screen.getByRole('button', {
      name: 'Regularizar empresa comercial',
    });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Empresa comercial do chamado'), {
      target: { value: 'org-9' },
    });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/tickets/t-1/worklog-context', {
        organizationId: 'org-9',
      }),
    );
  });

  it('ignores a form submission without a chosen organization', async () => {
    stubApiGet({
      commercialOrganizationId: null,
      organizations: [{ id: 'org-9', name: 'Empresa Nove' }],
    });
    renderContext({ isAdmin: true });
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Empresa Nove' }),
      ).toBeInTheDocument(),
    );
    const form = screen
      .getByLabelText('Empresa comercial do chamado')
      .closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('shows an error message when regularization fails', async () => {
    stubApiGet({
      commercialOrganizationId: null,
      organizations: [{ id: 'org-9', name: 'Empresa Nove' }],
    });
    vi.mocked(api.patch).mockRejectedValue(new Error('fail'));
    renderContext({ isAdmin: true });
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Empresa Nove' }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('Empresa comercial do chamado'), {
      target: { value: 'org-9' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Regularizar empresa comercial' }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(
          /Não foi possível regularizar\. Confira o vínculo com a mesa/,
        ),
      ).toBeInTheDocument(),
    );
  });
});
