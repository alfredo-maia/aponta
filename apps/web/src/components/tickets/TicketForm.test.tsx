import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TicketForm } from './TicketForm';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function renderForm(props: Partial<React.ComponentProps<typeof TicketForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSubmit = props.onSubmit ?? vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <TicketForm onSubmit={onSubmit} {...props} />
    </QueryClientProvider>,
  );
  return { onSubmit: onSubmit as ReturnType<typeof vi.fn> };
}

function mockApiGet(overrides: Record<string, unknown> = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/organizations') {
      return Promise.resolve({ data: overrides.organizations ?? [{ id: 'org-1', name: 'Acme Corp' }] });
    }
    if (url === '/service-desks') {
      return Promise.resolve({ data: overrides.serviceDesks ?? [{ id: 'sd-1', name: 'Suporte N1' }] });
    }
    if (url === '/users') {
      return Promise.resolve({
        data: overrides.users ?? [
          { id: 'u-1', name: 'Alice', organizationId: 'org-1' },
          { id: 'u-2', name: 'Bob', organizationId: 'org-2' },
        ],
      });
    }
    if (url === '/tickets') {
      return Promise.resolve({
        data: overrides.tickets ?? [{ id: 'tkt-parent-1', title: 'Issue original' }],
      });
    }
    return Promise.resolve({ data: [] });
  });
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/título \(assunto\)/i), 'Algo quebrou');
  await user.selectOptions(screen.getByLabelText(/^mesa/i), 'sd-1');
  const editable = screen
    .getByTestId('ticket-description')
    .querySelector('[contenteditable="true"]') as HTMLElement;
  editable.innerHTML = '<p>Descrição do problema.</p>';
  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('TicketForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null });
    mockApiGet();
  });

  it('renders all core fields', async () => {
    renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/service-desks'));

    expect(screen.getByLabelText(/título \(assunto\)/i)).toBeInTheDocument();
    expect(screen.getByText(/descrição detalhada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mesa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prioridade/i)).toBeInTheDocument();
  });

  it('shows the submit error banner when submitError is set', () => {
    renderForm({ submitError: 'Algo deu errado no servidor.' });
    expect(screen.getByText('Algo deu errado no servidor.')).toBeInTheDocument();
  });

  it('disables submit buttons while isSubmitting is true', () => {
    renderForm({ isSubmitting: true });
    expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /salvar e criar novo/i })).toBeDisabled();
  });

  it('disables the Cliente and Solicitante fields for CLIENT role users', async () => {
    useAuthStore.setState({
      token: 'tok',
      user: { sub: 'u-1', email: 'client@example.com', role: 'CLIENT', organizationId: 'org-1' },
    });
    renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/organizations', { params: { active: true } }));

    expect(screen.getByLabelText('Cliente')).toBeDisabled();
    expect(screen.getByLabelText('Solicitante')).toBeDisabled();
  });

  it('keeps the Cliente and Solicitante fields enabled for ADMIN/AGENT role users', async () => {
    useAuthStore.setState({
      token: 'tok',
      user: { sub: 'u-1', email: 'admin@example.com', role: 'ADMIN', organizationId: null },
    });
    renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/organizations', { params: { active: true } }));

    expect(screen.getByLabelText('Cliente')).not.toBeDisabled();
    expect(screen.getByLabelText('Solicitante')).not.toBeDisabled();
  });

  it('locks title, service desk and priority when a catalogOverride is supplied', async () => {
    renderForm({
      catalogOverride: {
        id: 'item-1',
        title: 'Troca de Teclado',
        description: null,
        icon: null,
        defaultServiceDeskId: 'sd-1',
        defaultPriority: 'HIGH',
      },
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/service-desks'));

    expect(screen.getByLabelText(/título \(assunto\)/i)).toBeDisabled();
    expect(screen.getByLabelText(/^mesa/i)).toBeDisabled();
    expect(screen.getByLabelText(/prioridade/i)).toBeDisabled();
    expect(screen.getByLabelText(/título \(assunto\)/i)).toHaveValue('Troca de Teclado');
  });

  it('toggles the schedule date field on and off via the "Agendar Ticket" button', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/service-desks'));

    expect(screen.queryByLabelText(/data para agendamento/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /agendar ticket/i }));
    expect(screen.getByText('Data para Agendamento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar agendamento/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar agendamento/i }));
    expect(screen.queryByText('Data para Agendamento')).not.toBeInTheDocument();
  });

  it('shows a validation error and blocks submit when title/description/service desk are empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/service-desks'));

    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    expect(await screen.findByText(/descrição é obrigatória/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with saveAndNew: true when "Salvar e criar novo" is clicked', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/service-desks'));

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /salvar e criar novo/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Algo quebrou', saveAndNew: true }),
      );
    });
  });

  it('submits without saveAndNew when the primary "Abrir Ticket" button is clicked', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/service-desks'));

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /abrir ticket/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const submittedValues = onSubmit.mock.calls[0][0];
    expect(submittedValues).toMatchObject({ title: 'Algo quebrou' });
    expect(submittedValues.saveAndNew).not.toBe(true);
  });

  it('attaches a file via EzUpload and removes it again via the file item remove button', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/service-desks'));

    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(await screen.findByText('foto.png')).toBeInTheDocument();

    const removeButton = screen.getByRole('button', { name: /remover/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('foto.png')).not.toBeInTheDocument();
    });
  });

  it('filters available requesters down to the selected organization once Cliente is chosen', async () => {
    useAuthStore.setState({
      token: 'tok',
      user: { sub: 'u-1', email: 'admin@example.com', role: 'ADMIN', organizationId: null },
    });
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/organizations', { params: { active: true } }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/users'));

    const orgSearch = screen.getByLabelText('Cliente') as HTMLInputElement;
    await user.type(orgSearch, 'Acme');
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Acme Corp'));

    const reqSearch = screen.getByLabelText('Solicitante') as HTMLInputElement;
    await user.type(reqSearch, 'A');
    // Alice belongs to org-1 (the selected organization); Bob (org-2) should
    // be filtered out of the dropdown results.
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('lets the user search and attach a parent ticket', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/tickets'));

    const parentSearch = screen.getByPlaceholderText(/buscar ticket existente/i) as HTMLInputElement;
    await user.type(parentSearch, 'Issue');
    await waitFor(() => {
      expect(screen.getByText(/issue original/i)).toBeInTheDocument();
    });
  });

  it('lets the user add followers via the multi-select', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/users'));

    const followersField = screen.getByPlaceholderText(/adicionar seguidores/i);
    await user.click(followersField);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Alice'));

    // Picking a follower renders it as a selected chip/tag in the control.
    const followersContainer = followersField.closest('div') as HTMLElement;
    expect(within(followersContainer).getByText('Alice')).toBeInTheDocument();
  });
});
