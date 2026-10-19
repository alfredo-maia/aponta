import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { brasiliaDateString } from '../../lib/brasiliaTime';
import { TicketWorklogs, formatWorklogMinutes, formatAttendanceType, formatWorklogValue } from './TicketWorklogs';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../ds', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ds')>();
  return {
    ...actual,
    EzRichText: ({
      testId,
      value,
      onChange,
      onUploadImage,
      spellCheck = true,
      lang = 'pt-BR',
    }: {
      testId?: string;
      value?: string;
      onChange?: (html: string) => void;
      onUploadImage?: (file: File) => Promise<string>;
      spellCheck?: boolean;
      lang?: string;
    }) => (
      <textarea
        data-testid={testId}
        value={value ?? ''}
        spellCheck={spellCheck}
        lang={lang}
        autoCorrect="on"
        onChange={(e) => onChange?.(e.target.value)}
        onPaste={async (e) => {
          const items = e.clipboardData?.items;
          if (!items || !onUploadImage) return;
          const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
          if (!imageItem) return;
          const file = imageItem.getAsFile();
          if (!file) return;
          e.preventDefault();
          const url = await onUploadImage(file);
          onChange?.(`${value ?? ''}<img src="${url}" alt="${file.name}">`);
        }}
      />
    ),
  };
});

const mockWorklogs = [
  {
    id: 'wl-1',
    description: 'Diagnóstico e análise',
    minutes: 60,
    startTime: '2026-10-12T08:00:00.000Z',
    endTime: '2026-10-12T09:00:00.000Z',
    attendanceType: 'REMOTE',
    billable: true,
    valuationType: 'CONTRACT',
    value: 100,
    ticketId: 't-1',
    authorId: 'u-1',
    createdAt: '2026-10-12T01:00:00.000Z',
    author: { id: 'u-1', name: 'Técnico Silva', email: 'silva@aponta.com' },
  },
  {
    id: 'wl-2',
    description: 'Reunião interna sobre escopo',
    minutes: 30,
    startTime: '2026-10-12T14:00:00.000Z',
    endTime: '2026-10-12T14:30:00.000Z',
    attendanceType: 'ON_SITE',
    billable: false,
    valuationType: 'GUARANTEE',
    value: 0,
    ticketId: 't-1',
    authorId: 'u-2',
    createdAt: '2026-10-12T02:00:00.000Z',
    author: { id: 'u-2', name: 'Gestor Santos', email: 'santos@aponta.com' },
  },
];

const todayStr = () => brasiliaDateString();

type PreRow = {
  contractId?: string;
  id: string;
  beginning: string;
  ending: string | null;
  initTime: string;
  endTime: string | null;
  ticketId: string;
  authorId: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
};

let currentWorklogs: unknown[] = [];
let preStore: PreRow[] = [];

function installApiStubs() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    const path = String(url);
    if (path.includes('/pre-appointments')) {
      return Promise.resolve({ data: [...preStore] });
    }
    if (path.includes('/users/agents')) {
      return Promise.resolve({ data: [] });
    }
    if (path.includes('/worklog-contracts')) {
      return Promise.resolve({ data: [{ id: 'contract-1', name: 'Suporte', type: 'HOURS_LIMIT', active: true, organizationId: 'org-1', createdAt: '2026-01-01' }] });
    }
    return Promise.resolve({ data: currentWorklogs });
  });
  vi.mocked(api.post).mockImplementation((url: string, body?: unknown) => {
    if (String(url).includes('/pre-appointments')) {
      const input = (body || {}) as { beginning?: string; initTime?: string };
      const beginning = input.beginning || new Date().toISOString();
      const created: PreRow = {
        id: `pre-${preStore.length + 1}-${beginning}`,
        beginning,
        ending: null,
        initTime: input.initTime || '00:00',
        endTime: null,
        ticketId: 't-1',
        authorId: 'u-1',
        createdAt: beginning,
        author: { id: 'u-1', name: 'user', email: 'user@aponta.com' },
      };
      preStore = [created, ...preStore];
      return Promise.resolve({ data: created });
    }
    return Promise.resolve({ data: { id: 'wl-new' } });
  });
  vi.mocked(api.patch).mockImplementation((url: string, body?: unknown) => {
    const match = String(url).match(/\/pre-appointments\/([^/]+)$/);
    if (match) {
      const input = (body || {}) as { ending?: string; endTime?: string };
      preStore = preStore.map((row) =>
        row.id === match[1]
          ? {
              ...row,
              ending: input.ending || new Date().toISOString(),
              endTime: input.endTime || '00:00',
            }
          : row,
      );
      return Promise.resolve({ data: preStore.find((row) => row.id === match[1]) });
    }
    return Promise.resolve({ data: {} });
  });
  vi.mocked(api.delete).mockImplementation((url: string) => {
    const match = String(url).match(/\/pre-appointments\/([^/]+)$/);
    if (match) {
      preStore = preStore.filter((row) => row.id !== match[1]);
      return Promise.resolve({ data: { id: match[1] } });
    }
    return Promise.resolve({ data: { id: 'wl-1' } });
  });
}

function renderComponent(ticketId = 't-1', defaultModalOpen = true, props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketWorklogs ticketId={ticketId} defaultModalOpen={defaultModalOpen} {...props} />
    </QueryClientProvider>,
  );
}

function loginAs(role: 'ADMIN' | 'AGENT' | 'CLIENT', id = 'u-1') {
  useAuthStore.setState({
    token: 'fake-token',
    user: {
      sub: id,
      email: 'user@aponta.com',
      role,
    },
  });
}

describe('TicketWorklogs', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    currentWorklogs = [];
    preStore = [];
    installApiStubs();
    useAuthStore.setState({ token: null, user: null });
  });

  it('formatWorklogMinutes formats minutes into human readable text', () => {
    expect(formatWorklogMinutes(30)).toBe('30 min');
    expect(formatWorklogMinutes(60)).toBe('1h');
    expect(formatWorklogMinutes(90)).toBe('1h 30m');
    expect(formatWorklogMinutes(125)).toBe('2h 5m');
  });

  it('formatAttendanceType translates the attendance type enum', () => {
    expect(formatAttendanceType('REMOTE')).toBe('Remoto');
    expect(formatAttendanceType('ON_SITE')).toBe('Presencial');
  });

  it('formatWorklogValue formats a monetary value or a dash when null', () => {
    expect(formatWorklogValue(100)).toBe('R$ 100,00');
    expect(formatWorklogValue(0)).toBe('R$ 0,00');
    expect(formatWorklogValue(null)).toBe('—');
  });

  it('renders worklogs list and summary header correctly', async () => {
    loginAs('ADMIN', 'u-1');
    currentWorklogs = mockWorklogs;

    renderComponent();

    expect(screen.getByTestId('ticket-worklogs-section')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('worklog-item-wl-1')).toBeInTheDocument();
      expect(screen.getByTestId('worklog-item-wl-2')).toBeInTheDocument();
    });

    expect(screen.queryByText('Diagnóstico e análise')).not.toBeInTheDocument();
    expect(screen.getAllByText('1h 30m').length).toBeGreaterThan(0);
    expect(screen.getByText('Faturável')).toBeInTheDocument();
    expect(screen.getByText('Não Faturável')).toBeInTheDocument();
    expect(within(screen.getByTestId('worklog-item-wl-1')).getByText('Remoto')).toBeInTheDocument();
    expect(within(screen.getByTestId('worklog-item-wl-2')).getByText('Presencial')).toBeInTheDocument();
    expect(within(screen.getByTestId('worklog-item-wl-1')).getByText('R$ 100,00')).toBeInTheDocument();
    expect(within(screen.getByTestId('worklog-item-wl-1')).getByText('(Contrato)')).toBeInTheDocument();
    expect(within(screen.getByTestId('worklog-item-wl-2')).getByText('(Garantia)')).toBeInTheDocument();
  });

  it('renders empty state when no worklogs exist', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum apontamento de horas registrado neste chamado até o momento.'),
      ).toBeInTheDocument();
    });
  });

  it('uses the DS EzComboBox (Storybook) for every worklog selector', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    renderComponent();

    const attendance = screen.getByTestId('worklog-attendance-type-select');
    const nextStage = screen.getByTestId('worklog-next-stage-select');
    const valuation = screen.getByTestId('worklog-valuation-type-select');

    expect(attendance.tagName).toBe('SELECT');
    expect(nextStage.tagName).toBe('SELECT');
    expect(valuation.tagName).toBe('SELECT');
    expect(attendance.parentElement).toHaveClass('rounded-[12px]');
    expect(nextStage.parentElement).toHaveClass('rounded-[12px]');
    expect(valuation.parentElement).toHaveClass('rounded-[12px]');
    expect(screen.getByLabelText(/Tipo de Valorização/)).toBe(valuation);
    expect(screen.getByLabelText(/Próximo Estágio/)).toBe(nextStage);
    expect(screen.getByLabelText(/Deslocamento/)).toBeDisabled();
  });

  it('allows filling the form and submitting a new worklog', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: 'wl-new',
        description: 'Implementação de feature',
        minutes: 45,
        billable: true,
        author: { id: 'u-1', name: 'Usuário Teste' },
      },
    });

    const user = userEvent.setup();
    renderComponent();

    const descInput = screen.getByTestId('worklog-description-input');
    await user.type(descInput, 'Implementação de feature');

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/t-1/worklogs', {
        startTime: `${todayStr()}T11:00:00.000Z`,
        endTime: `${todayStr()}T11:30:00.000Z`,
        attendanceType: 'REMOTE',
        description: 'Implementação de feature',
        billable: true,
        contractId: 'contract-1',
        valuationType: 'CONTRACT',
      });
    });
  });

  it('allows choosing attendance type and a custom time range, sending them on submit', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { id: 'wl-new', description: 'Visita técnica', minutes: 120, billable: true, author: { id: 'u-1', name: 'Usuário Teste' } },
    });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('worklog-description-input'), 'Visita técnica');
    await user.selectOptions(screen.getByTestId('worklog-attendance-type-select'), 'ON_SITE');

    const startInput = screen.getByTestId('worklog-start-time-input') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '09:00' } });

    const endInput = screen.getByTestId('worklog-end-time-input') as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: '11:00' } });

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tickets/t-1/worklogs', {
        startTime: `${todayStr()}T12:00:00.000Z`,
        endTime: `${todayStr()}T14:00:00.000Z`,
        attendanceType: 'ON_SITE',
        description: 'Visita técnica',
        billable: true,
        contractId: 'contract-1',
        valuationType: 'CONTRACT',
      });
    });
  });

  it('blocks submission when the end time is not after the start time', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('worklog-description-input'), 'Horário inválido');
    fireEvent.change(screen.getByTestId('worklog-start-time-input'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByTestId('worklog-end-time-input'), { target: { value: '09:00' } });

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(screen.getByText('O horário de término deve ser posterior ao horário de início.')).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('quick chip buttons update the end time and the computed duration', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    const user = userEvent.setup();
    renderComponent();

    const endInput = screen.getByTestId('worklog-end-time-input') as HTMLInputElement;
    expect(endInput.value).toBe('08:30');
    expect(screen.getByTestId('worklog-computed-duration')).toHaveTextContent('30 min');

    const chip1h = screen.getByRole('button', { name: '1h' });
    await user.click(chip1h);
    expect(endInput.value).toBe('09:00');
    expect(screen.getByTestId('worklog-computed-duration')).toHaveTextContent('1h');

    const chipExtend = screen.getByRole('button', { name: '+15m' });
    await user.click(chipExtend);
    expect(endInput.value).toBe('09:15');
    expect(screen.getByTestId('worklog-computed-duration')).toHaveTextContent('1h 15m');
  });

  it('sends valuationType MANUAL with the entered value', async () => {
    loginAs('ADMIN', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'wl-new' } });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('worklog-description-input'), 'Ajuste pontual');
    await user.selectOptions(screen.getByTestId('worklog-valuation-type-select'), 'MANUAL');

    const valueInput = screen.getByTestId('worklog-manual-value-input');
    await user.type(valueInput, '250');

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets/t-1/worklogs',
        expect.objectContaining({ valuationType: 'MANUAL', value: 250 }),
      );
    });
  });

  it('blocks submission when valuationType is MANUAL without a value', async () => {
    loginAs('ADMIN', 'u-1');
    currentWorklogs = [];

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('worklog-description-input'), 'Sem valor');
    await user.selectOptions(screen.getByTestId('worklog-valuation-type-select'), 'MANUAL');

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(screen.getByText('Informe um valor manual válido.')).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('unchecks billable automatically when GUARANTEE is selected', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    const user = userEvent.setup();
    renderComponent();

    const billableCheckbox = screen.getByTestId('worklog-billable-checkbox') as HTMLInputElement;
    expect(billableCheckbox.checked).toBe(true);

    await user.selectOptions(screen.getByTestId('worklog-valuation-type-select'), 'GUARANTEE');
    expect(billableCheckbox.checked).toBe(false);
  });

  const mockNextStages = [
    { id: 'stage-n2', name: 'N2', isFinal: false, position: 1 },
    { id: 'stage-closed', name: 'Fechado', isFinal: true, position: 2 },
  ];

  it('sends nextStageId when a next stage is chosen', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'wl-new' } });

    const user = userEvent.setup();
    renderComponent('t-1', true, { nextStages: mockNextStages });

    await user.type(screen.getByTestId('worklog-description-input'), 'Resolvido no atendimento');
    await user.selectOptions(screen.getByTestId('worklog-next-stage-select'), 'stage-n2');

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets/t-1/worklogs',
        expect.objectContaining({ nextStageId: 'stage-n2' }),
      );
    });
  });

  it('does not send nextStageId when "Não alterar" stays selected', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'wl-new' } });

    renderComponent('t-1', true, { nextStages: mockNextStages });
    await userEvent.setup().type(screen.getByTestId('worklog-description-input'), 'Sem mudança de estágio');
    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      const callArgs = vi.mocked(api.post).mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty('nextStageId');
    });
  });

  it('sends sendAsReply when the checkbox is checked', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'wl-new' } });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('worklog-description-input'), 'Resposta ao cliente');
    await user.click(screen.getByTestId('worklog-send-as-reply-checkbox'));

    fireEvent.submit(screen.getByTestId('worklog-form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets/t-1/worklogs',
        expect.objectContaining({ sendAsReply: true }),
      );
    });
  });

  it('renders TiFlux-parity action buttons and checkbox text', () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    renderComponent();

    expect(screen.getByText('Enviar apontamento também como resposta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar e fechar ticket' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar e criar novo apontamento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('submits with the final next stage when "Salvar e fechar ticket" is clicked', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'wl-new' } });

    const user = userEvent.setup();
    renderComponent('t-1', true, { nextStages: mockNextStages });

    await user.type(screen.getByTestId('worklog-description-input'), 'Encerrando chamado');
    await user.click(screen.getByTestId('worklog-submit-close-button'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets/t-1/worklogs',
        expect.objectContaining({ nextStageId: 'stage-closed' }),
      );
    });
  });

  it('disables "Salvar e fechar ticket" when no reachable next stage closes the ticket', () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    renderComponent('t-1', true, {
      nextStages: [{ id: 'stage-n2', name: 'N2', isFinal: false, position: 1 }],
    });

    expect(screen.getByTestId('worklog-submit-close-button')).toBeDisabled();
  });

  it('submits and advances start time to previous end time when "Salvar e criar novo apontamento" is clicked', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 'wl-new' } });

    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByTestId('worklog-description-input'), 'Primeira etapa');
    await user.click(screen.getByTestId('worklog-submit-new-button'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets/t-1/worklogs',
        expect.objectContaining({ description: 'Primeira etapa' }),
      );
    });

    // Form resets description and sets start time to previous end time ('08:30')
    expect(screen.getByTestId('worklog-description-input')).toHaveValue('');
    expect(screen.getByTestId('worklog-start-time-input')).toHaveValue('08:30');
    expect(screen.getByTestId('worklog-end-time-input')).toHaveValue('09:00');
  });

  it('allows deleting own worklog when confirmed', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = mockWorklogs;
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { id: 'wl-1' } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('worklog-delete-button-wl-1')).toBeInTheDocument();
    });

    // wl-2 was created by u-2, so u-1 (AGENT) cannot delete it
    expect(screen.queryByTestId('worklog-delete-button-wl-2')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('worklog-delete-button-wl-1'));

    expect(window.confirm).toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledWith('/tickets/t-1/worklogs/wl-1');
  });

  it('renders modal closed by default when defaultModalOpen is false and opens upon "+ Apontamento" click', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    const user = userEvent.setup();
    renderComponent('t-1', false);

    expect(screen.queryByTestId('worklog-form')).not.toBeInTheDocument();

    const openBtn = screen.getByTestId('open-worklog-modal-btn');
    await user.click(openBtn);

    expect(screen.getByTestId('worklog-form')).toBeInTheDocument();
  });

  it('handles activity timer start, pause, and stop to open apontamento modal', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    const user = userEvent.setup();
    renderComponent('t-1', false);

    expect(screen.getByTestId('worklog-timer-display')).toHaveTextContent('00:00:00');
    expect(screen.queryByTestId('worklog-form')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('worklog-timer-start-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('worklog-timer-pause-btn')).toBeInTheDocument();
    });
    expect(screen.getByTestId('worklog-timer-stop-btn')).toBeInTheDocument();

    await user.click(screen.getByTestId('worklog-timer-pause-btn'));
    expect(screen.getByTestId('worklog-timer-resume-btn')).toBeInTheDocument();

    expect(screen.getByTestId('worklog-pre-appointments')).toBeInTheDocument();
    expect(screen.getByTestId('worklog-pre-end')).toHaveTextContent('--');

    await user.click(screen.getByTestId('worklog-timer-stop-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('worklog-pre-end')).not.toHaveTextContent('--');
    });
    expect(screen.queryByTestId('worklog-form')).not.toBeInTheDocument();
  });

  it('lists a Brasília pré-apontamento while the timer runs and converts it into the form', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T22:15:00.000Z'));

    try {
      renderComponent('t-1', false);
      fireEvent.click(screen.getByTestId('worklog-timer-start-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('worklog-pre-appointments')).toBeInTheDocument();
      });
      expect(screen.getByTestId('worklog-pre-attendant')).toHaveTextContent('user');
      expect(screen.getByTestId('worklog-pre-date')).toHaveTextContent('14/10/2026');
      expect(screen.getByTestId('worklog-pre-start')).toHaveTextContent('19:15');
      expect(screen.getByTestId('worklog-pre-end')).toHaveTextContent('--');
      expect(screen.queryByTestId('worklog-form')).not.toBeInTheDocument();

      vi.setSystemTime(new Date('2026-10-14T22:45:00.000Z'));
      fireEvent.click(screen.getByTestId('worklog-timer-stop-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('worklog-pre-end')).toHaveTextContent('19:45');
      });
      expect(screen.queryByTestId('worklog-form')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('worklog-pre-convert-btn'));
      expect(screen.getByTestId('worklog-form')).toBeInTheDocument();
      expect(screen.getByTestId('worklog-day-input')).toHaveValue('2026-10-14');
      expect(screen.getByTestId('worklog-start-time-input')).toHaveValue('19:15');
      expect(screen.getByTestId('worklog-end-time-input')).toHaveValue('19:45');
    } finally {
      vi.useRealTimers();
    }
  });

  it('appends a new pré-apontamento when starting again instead of overwriting', async () => {
    loginAs('AGENT', 'u-1');
    const user = userEvent.setup();
    renderComponent('t-1', false);

    await user.click(screen.getByTestId('worklog-timer-start-btn'));
    await waitFor(() => expect(screen.getAllByTestId('worklog-pre-appointment-row')).toHaveLength(1));

    await user.click(screen.getByTestId('worklog-timer-stop-btn'));
    await waitFor(() => expect(screen.getByTestId('worklog-pre-end')).not.toHaveTextContent('--'));

    await user.click(screen.getByTestId('worklog-timer-start-btn'));
    await waitFor(() => expect(screen.getAllByTestId('worklog-pre-appointment-row')).toHaveLength(2));
    expect(screen.getAllByTestId('worklog-pre-end')[0]).toHaveTextContent('--');
    expect(screen.getAllByTestId('worklog-pre-end')[1]).not.toHaveTextContent('--');
  });
  it('converts stopped raw time with its original contract and source identifier', async () => {
    loginAs('AGENT', 'u-1');
    preStore = [{ id: 'source-pre', contractId: 'contract-1', beginning: '2026-10-14T12:00:00Z', ending: '2026-10-14T13:00:00Z', initTime: '09:00', endTime: '10:00', ticketId: 't-1', authorId: 'u-1', createdAt: '2026-10-14T12:00:00Z', author: { id: 'u-1', name: 'Técnico', email: 'agent@example.com' } }];
    renderComponent('t-1', false);
    fireEvent.click(await screen.findByTestId('worklog-pre-convert-btn'));
    expect(screen.getByLabelText('Contrato aplicável')).toHaveValue('contract-1');
    fireEvent.change(screen.getByTestId('worklog-description-input'), { target: { value: 'Conversão de tempo preservado' } });
    fireEvent.submit(screen.getByTestId('worklog-form'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tickets/t-1/worklogs', expect.objectContaining({ contractId: 'contract-1', preAppointmentId: 'source-pre' })));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('discards the running pré-apontamento from the timer cancel control', async () => {
    loginAs('AGENT', 'u-1');
    const user = userEvent.setup();
    renderComponent('t-1', false);

    await user.click(screen.getByTestId('worklog-timer-start-btn'));
    await waitFor(() => expect(screen.getByTestId('worklog-pre-appointment-row')).toBeInTheDocument());

    await user.click(screen.getByTestId('worklog-timer-cancel-btn'));
    await waitFor(() => expect(screen.queryByTestId('worklog-pre-appointments')).not.toBeInTheDocument());
  });

  it('prefills + Apontamento from the running pré without opening from the table', async () => {
    loginAs('AGENT', 'u-1');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T22:15:00.000Z'));

    try {
      renderComponent('t-1', false);
      fireEvent.click(screen.getByTestId('worklog-timer-start-btn'));
      await waitFor(() => expect(screen.getByTestId('worklog-pre-appointments')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('open-worklog-modal-btn'));
      expect(screen.getByTestId('worklog-form')).toBeInTheDocument();
      expect(screen.getByTestId('worklog-start-time-input')).toHaveValue('19:15');
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses and resumes the running pré from the table row', async () => {
    loginAs('AGENT', 'u-1');
    const user = userEvent.setup();
    renderComponent('t-1', false);

    await user.click(screen.getByTestId('worklog-timer-start-btn'));
    await waitFor(() => expect(screen.getByTestId('worklog-pre-pause-btn')).toBeInTheDocument());

    await user.click(screen.getByTestId('worklog-pre-pause-btn'));
    expect(screen.getByTestId('worklog-pre-resume-btn')).toBeInTheDocument();

    await user.click(screen.getByTestId('worklog-pre-resume-btn'));
    expect(screen.getByTestId('worklog-pre-pause-btn')).toBeInTheDocument();
  });

  it('falls back to the author email local-part when the name is empty', async () => {
    loginAs('AGENT', 'u-1');
    preStore = [
      {
        id: 'pre-email',
        beginning: '2026-10-14T22:00:00.000Z',
        ending: '2026-10-14T22:10:00.000Z',
        initTime: '19:00',
        endTime: '19:10',
        ticketId: 't-1',
        authorId: 'u-9',
        createdAt: '2026-10-14T22:00:00.000Z',
        author: { id: 'u-9', name: '', email: 'joao.silva@aponta.com' },
      },
    ];

    renderComponent('t-1', false);

    await waitFor(() => expect(screen.getByTestId('worklog-pre-attendant')).toHaveTextContent('joao.silva'));
  });

  it('falls back to Técnico when author and session emails are empty', async () => {
    useAuthStore.setState({
      token: 'fake-token',
      user: { sub: 'u-1', email: '', role: 'AGENT' },
    });
    preStore = [
      {
        id: 'pre-anon',
        beginning: '2026-10-14T22:00:00.000Z',
        ending: '2026-10-14T22:10:00.000Z',
        initTime: '19:00',
        endTime: '19:10',
        ticketId: 't-1',
        authorId: 'u-9',
        createdAt: '2026-10-14T22:00:00.000Z',
        author: { id: 'u-9', name: '', email: '' },
      },
    ];

    renderComponent('t-1', false);

    await waitFor(() => expect(screen.getByTestId('worklog-pre-attendant')).toHaveTextContent('Técnico'));
  });

  it('prefills from derived timer times when initTime and endTime are blank', async () => {
    loginAs('AGENT', 'u-1');
    preStore = [
      {
        id: 'pre-blank',
        beginning: '2026-10-14T22:15:00.000Z',
        ending: '2026-10-14T22:45:00.000Z',
        initTime: '',
        endTime: '',
        ticketId: 't-1',
        authorId: 'u-1',
        createdAt: '2026-10-14T22:15:00.000Z',
        author: { id: 'u-1', name: 'user', email: 'user@aponta.com' },
      },
    ];

    renderComponent('t-1', false);

    await waitFor(() => expect(screen.getByTestId('worklog-pre-convert-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('worklog-pre-convert-btn'));
    expect(screen.getByTestId('worklog-form')).toBeInTheDocument();
    expect(screen.getByTestId('worklog-start-time-input')).not.toHaveValue('');
    expect(screen.getByTestId('worklog-end-time-input')).not.toHaveValue('');
  });

  it('paginates the pré-apontamentos table when the list grows', async () => {
    loginAs('AGENT', 'u-1');
    const user = userEvent.setup();
    preStore = Array.from({ length: 6 }, (_, index) => ({
      id: `pre-seed-${index}`,
      beginning: `2026-10-14T22:0${index}:00.000Z`,
      ending: `2026-10-14T22:1${index}:00.000Z`,
      initTime: `19:0${index}`,
      endTime: `19:1${index}`,
      ticketId: 't-1',
      authorId: 'u-1',
      createdAt: `2026-10-14T22:0${index}:00.000Z`,
      author: { id: 'u-1', name: 'user', email: 'user@aponta.com' },
    }));

    renderComponent('t-1', false);

    await waitFor(() => expect(screen.getAllByTestId('worklog-pre-appointment-row')).toHaveLength(5));
    expect(screen.getByTestId('worklog-pre-pagination')).toBeInTheDocument();

    await user.click(screen.getByTitle('Próxima Página'));
    await waitFor(() => expect(screen.getAllByTestId('worklog-pre-appointment-row')).toHaveLength(1));
  });

  it('clamps pagination back to the last page after deleting the only row on page 2', async () => {
    loginAs('AGENT', 'u-1');
    const user = userEvent.setup();
    preStore = Array.from({ length: 6 }, (_, index) => ({
      id: `pre-clamp-${index}`,
      beginning: `2026-10-14T22:0${index}:00.000Z`,
      ending: `2026-10-14T22:1${index}:00.000Z`,
      initTime: `19:0${index}`,
      endTime: `19:1${index}`,
      ticketId: 't-1',
      authorId: 'u-1',
      createdAt: `2026-10-14T22:0${index}:00.000Z`,
      author: { id: 'u-1', name: 'user', email: 'user@aponta.com' },
    }));

    renderComponent('t-1', false);

    await waitFor(() => expect(screen.getAllByTestId('worklog-pre-appointment-row')).toHaveLength(5));
    await user.click(screen.getByTitle('Próxima Página'));
    await waitFor(() => expect(screen.getAllByTestId('worklog-pre-appointment-row')).toHaveLength(1));

    await user.click(screen.getByTestId('worklog-pre-delete-btn'));
    await waitFor(() => expect(screen.getAllByTestId('worklog-pre-appointment-row')).toHaveLength(5));
    expect(screen.queryByTestId('worklog-pre-pagination')).not.toBeInTheDocument();
  });

  it('renders modal with spellcheck and portuguese language attributes', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    renderComponent('t-1', true);

    const descInput = screen.getByTestId('worklog-description-input') as HTMLTextAreaElement;
    expect(descInput.getAttribute('spellcheck')).toBe('true');
    expect(descInput.getAttribute('lang')).toBe('pt-BR');
    expect(descInput.getAttribute('autocorrect')).toBe('on');
    expect(screen.getByText(/Corretor ortográfico ativo/i)).toBeInTheDocument();
  });

  it('saves worklog draft in localStorage and restores it automatically', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    const user = userEvent.setup();
    const { unmount } = renderComponent('t-draft-1', true);

    const descInput = screen.getByTestId('worklog-description-input');
    await user.type(descInput, 'Rascunho de análise técnica');

    // Verify localStorage has saved the draft
    await waitFor(() => {
      const saved = localStorage.getItem('aponta_worklog_draft_t-draft-1');
      expect(saved).not.toBeNull();
      expect(JSON.parse(saved!)).toMatchObject({
        description: 'Rascunho de análise técnica',
      });
    });

    unmount();

    // Re-mount component and verify draft is restored
    renderComponent('t-draft-1', true);
    expect(screen.getByTestId('worklog-draft-alert')).toBeInTheDocument();
    expect(screen.getByTestId('worklog-description-input')).toHaveValue('Rascunho de análise técnica');

    // Discard draft button clears the form and localStorage
    const clearBtn = screen.getByTestId('worklog-clear-draft-btn');
    await user.click(clearBtn);

    expect(screen.getByTestId('worklog-description-input')).toHaveValue('');
    expect(localStorage.getItem('aponta_worklog_draft_t-draft-1')).toBeNull();
  });

  it('handles pasting image screenshot, uploading attachment and inserting it inline', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: 'att-paste-1',
        fileUrl: 'https://cdn.aponta.com/screenshots/tela.png',
        originalName: 'evidencia_erro.png',
      },
    });

    renderComponent('t-1', true);

    const descInput = screen.getByTestId('worklog-description-input');
    fireEvent.change(descInput, { target: { value: 'Identificado erro na tela:' } });

    const file = new File(['fake-image-bytes'], 'screenshot.png', { type: 'image/png' });
    const clipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => file,
        },
      ],
      types: ['Files'],
    };

    fireEvent.paste(descInput, { clipboardData });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tickets/t-1/attachments',
        expect.any(FormData),
      );
    });

    await waitFor(() => {
      expect(descInput).toHaveValue(
        'Identificado erro na tela:<img src="https://cdn.aponta.com/screenshots/tela.png" alt="screenshot.png">',
      );
    });
  });

  it('keeps filled fields after closing the modal with X and reopening', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    const user = userEvent.setup();
    renderComponent('t-1', true);

    await user.type(screen.getByTestId('worklog-description-input'), 'Texto que não pode se perder');
    await user.click(screen.getByLabelText('Fechar'));

    expect(screen.queryByTestId('worklog-form')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('open-worklog-modal-btn'));
    expect(screen.getByTestId('worklog-description-input')).toHaveValue('Texto que não pode se perder');
  });

  it('renders the apontamento modal at 5xl width', () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = [];

    renderComponent('t-1', true);

    expect(screen.getByRole('dialog').className).toMatch(/max-w-5xl/);
  });

  it('expands and collapses activity details per row and in bulk', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = mockWorklogs;

    const user = userEvent.setup();
    renderComponent('t-1', false);

    await waitFor(() => {
      expect(screen.getByTestId('worklog-item-wl-1')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('worklog-detail-wl-1')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('worklog-expand-all-btn'));
    expect(screen.getByTestId('worklog-detail-wl-1')).toBeInTheDocument();
    expect(screen.getByText('Diagnóstico e análise')).toBeInTheDocument();

    await user.click(screen.getByTestId('worklog-expand-all-btn'));
    expect(screen.queryByTestId('worklog-detail-wl-1')).not.toBeInTheDocument();
  });

  it('filters the history by attendant and attendance type via the funnel', async () => {
    loginAs('AGENT', 'u-1');
    currentWorklogs = mockWorklogs;

    const user = userEvent.setup();
    renderComponent('t-1', false);

    await waitFor(() => {
      expect(screen.getByTestId('worklog-item-wl-1')).toBeInTheDocument();
      expect(screen.getByTestId('worklog-item-wl-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('worklog-filter-funnel-btn'));
    const filterAuthor = screen.getByTestId('worklog-filter-author');
    expect(filterAuthor.parentElement).toHaveClass('rounded-[12px]');
    await user.selectOptions(filterAuthor, 'u-1');

    expect(screen.getByTestId('worklog-item-wl-1')).toBeInTheDocument();
    expect(screen.queryByTestId('worklog-item-wl-2')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId('worklog-filter-attendance'), 'ON_SITE');
    expect(screen.queryByTestId('worklog-item-wl-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('worklog-filter-empty')).toHaveTextContent(
      'Nenhum apontamento corresponde aos filtros selecionados.',
    );
  });

  it('sorts worklogs by day and shows filtered totals in the footer', async () => {
    loginAs('ADMIN', 'u-1');
    currentWorklogs = mockWorklogs;

    const user = userEvent.setup();
    renderComponent('t-1', false);

    await waitFor(() => {
      expect(screen.getByTestId('worklog-footer-hours')).toHaveTextContent('1h 30m');
    });
    expect(screen.getByTestId('worklog-footer-value')).toHaveTextContent('R$ 100,00');

    const rowsBefore = screen.getAllByTestId(/worklog-item-/).map((el) => el.getAttribute('data-testid'));
    await user.click(screen.getByTestId('worklog-sort-day-btn'));
    const rowsAfter = screen.getAllByTestId(/worklog-item-/).map((el) => el.getAttribute('data-testid'));
    expect(rowsAfter).not.toEqual(rowsBefore);
  });
  it('hides monetary data and manual valuation for agents even with unmasked payloads', async () => {
    loginAs('AGENT');
    currentWorklogs = mockWorklogs;
    renderComponent('t-1', true);
    await screen.findByTestId('worklog-item-wl-1');
    expect(screen.queryByText('R$ 100,00')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Valor manual' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('worklog-footer-value')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Valor')).not.toBeInTheDocument();
  });

  it('submits an explicit eligible contract and preserves it in the draft', async () => {
    loginAs('AGENT');
    renderComponent('t-1', true);
    await screen.findByRole('option', { name: 'Suporte' });
    fireEvent.change(screen.getByLabelText('Contrato aplicável'), { target: { value: 'contract-1' } });
    fireEvent.change(screen.getByTestId('worklog-description-input'), { target: { value: 'Atividade realizada' } });
    await waitFor(() => expect(JSON.parse(localStorage.getItem('aponta_worklog_draft_t-1') || '{}').contractId).toBe('contract-1'));
    fireEvent.submit(screen.getByTestId('worklog-form'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tickets/t-1/worklogs', expect.objectContaining({ contractId: 'contract-1', valuationType: 'CONTRACT' })));
  });

  it('keeps unknown contract values distinct from free coverage', async () => {
    loginAs('ADMIN');
    renderComponent('t-1', true);
    expect(screen.queryByDisplayValue('Incluso no contrato')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('A calcular ao salvar')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('worklog-valuation-type-select'), { target: { value: 'GUARANTEE' } });
    expect(screen.getByTestId('worklog-billable-checkbox')).toBeDisabled();
    expect(screen.getByTestId('worklog-billable-checkbox')).not.toBeChecked();
    fireEvent.change(screen.getByTestId('worklog-valuation-type-select'), { target: { value: 'CONTRACT' } });
    expect(screen.getByTestId('worklog-billable-checkbox')).toBeChecked();
  });

  it('does not restore manual financial fields for an agent draft', () => {
    loginAs('AGENT');
    localStorage.setItem('aponta_worklog_draft_t-1', JSON.stringify({ valuationType: 'MANUAL', manualValue: '250', description: 'Rascunho anterior' }));
    renderComponent('t-1', true);
    expect(screen.getByTestId('worklog-valuation-type-select')).toHaveValue('CONTRACT');
    expect(screen.queryByTestId('worklog-manual-value-input')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('aponta_worklog_draft_t-1') || '{}').manualValue).toBe('');
  });

  it('rejects negative manual amounts before calling the API', async () => {
    loginAs('ADMIN');
    renderComponent('t-1', true);
    fireEvent.change(screen.getByTestId('worklog-description-input'), { target: { value: 'Atividade realizada' } });
    fireEvent.change(screen.getByTestId('worklog-valuation-type-select'), { target: { value: 'MANUAL' } });
    fireEvent.change(screen.getByTestId('worklog-manual-value-input'), { target: { value: '-10' } });
    fireEvent.submit(screen.getByTestId('worklog-form'));
    expect(await screen.findByText('Informe um valor manual válido.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('keeps unknown historical totals visible without inferring free values', async () => {
    loginAs('ADMIN');
    currentWorklogs = [{ ...mockWorklogs[0], value: null }];
    renderComponent('t-1', true);
    await screen.findByRole('option', { name: 'Suporte' });
    fireEvent.change(screen.getByLabelText('Contrato aplicável'), { target: { value: 'contract-1' } });
    expect(await screen.findByTestId('worklog-footer-value')).toHaveTextContent('Valor desconhecido');
  });
  it('blocks every valuation mode when no commercial contract is eligible', async () => {
    loginAs('ADMIN');
    vi.mocked(api.get).mockImplementation(async () => ({ data: [] }));
    renderComponent('t-1', true);
    await screen.findByText(/Lançamento bloqueado: nenhum contrato elegível/);
    fireEvent.change(screen.getByTestId('worklog-description-input'), { target: { value: 'Atividade sem cobertura' } });
    for (const mode of ['CONTRACT', 'GUARANTEE', 'MANUAL', 'BONUS']) {
      fireEvent.change(screen.getByTestId('worklog-valuation-type-select'), { target: { value: mode } });
      fireEvent.submit(screen.getByTestId('worklog-form'));
      expect(await screen.findByText(/Lançamento bloqueado: selecione um contrato aprovado/)).toBeInTheDocument();
    }
    expect(api.post).not.toHaveBeenCalled();
  });
  it('requires a bonus reason and records its eligible contract without quota consumption', async () => {
    loginAs('ADMIN');
    renderComponent('t-1', true);
    await screen.findByRole('option', { name: 'Suporte' });
    fireEvent.change(screen.getByTestId('worklog-description-input'), { target: { value: 'Correção interna' } });
    fireEvent.change(screen.getByTestId('worklog-valuation-type-select'), { target: { value: 'BONUS' } });
    fireEvent.submit(screen.getByTestId('worklog-form'));
    expect(await screen.findByText('Informe o motivo da garantia ou bonificação.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Motivo da garantia ou bonificação/), { target: { value: 'Retrabalho autorizado' } });
    fireEvent.submit(screen.getByTestId('worklog-form'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tickets/t-1/worklogs', expect.objectContaining({ contractId: 'contract-1', valuationType: 'BONUS', billable: false, bonusReason: 'Retrabalho autorizado' })));
  });
  it('submits near-midnight Brasília work as true instants in the correct local cycle', async () => {
    loginAs('AGENT');
    renderComponent('t-1', true);
    fireEvent.change(screen.getByTestId('worklog-day-input'), { target: { value: '2026-10-31' } });
    fireEvent.change(screen.getByTestId('worklog-start-time-input'), { target: { value: '23:00' } });
    fireEvent.change(screen.getByTestId('worklog-end-time-input'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByTestId('worklog-description-input'), { target: { value: 'Atividade noturna' } });
    fireEvent.submit(screen.getByTestId('worklog-form'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tickets/t-1/worklogs', expect.objectContaining({ startTime: '2026-11-01T02:00:00.000Z', endTime: '2026-11-01T02:30:00.000Z' })));
  });
  it('renders marked UTC logs in Brasília while preserving naive-Z legacy wallclocks', async () => {
    loginAs('AGENT');
    currentWorklogs = [{ ...mockWorklogs[0], timeConvention: 'UTC', startTime: '2026-11-01T02:00:00.000Z', endTime: '2026-11-01T02:30:00.000Z' }, { ...mockWorklogs[1], startTime: '2026-10-31T23:00:00.000Z', endTime: '2026-10-31T23:30:00.000Z' }];
    renderComponent('t-1', false);
    const marked = await screen.findByTestId('worklog-item-wl-1');
    const legacy = screen.getByTestId('worklog-item-wl-2');
    expect(marked).toHaveTextContent('31/10/2026 23:00 - 23:30');
    expect(legacy).toHaveTextContent('31/10/2026 23:00 - 23:30');
  });
  it.each(['worklog-day-input', 'worklog-start-time-input', 'worklog-end-time-input'])('keeps incomplete %s editable and blocks submission', async (field) => {
    loginAs('AGENT');
    renderComponent('t-1', true);
    fireEvent.change(screen.getByTestId('worklog-description-input'), { target: { value: 'Atividade' } });
    fireEvent.change(screen.getByTestId(field), { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('worklog-form'));
    expect(await screen.findByText('O horário de término deve ser posterior ao horário de início.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});


