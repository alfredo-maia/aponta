import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { BusinessHoursEditor } from './BusinessHoursEditor';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

function renderEditor(deskId = 'sd-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BusinessHoursEditor serviceDeskId={deskId} />
    </QueryClientProvider>,
  );
}

describe('BusinessHoursEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a 24/7 message when no business hours are configured', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { businessHours: [], holidays: [] },
    });

    renderEditor();

    expect(
      await screen.findByText(/sem expediente configurado/i),
    ).toBeInTheDocument();
  });

  it('lists existing business hour windows as editable rows', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        businessHours: [
          { id: 'bh-1', weekday: 1, startTime: '08:00', endTime: '18:00' },
          { id: 'bh-2', weekday: 2, startTime: '08:00', endTime: '18:00' },
        ],
        holidays: [{ id: 'hol-1', date: '2026-12-25', name: 'Natal' }],
      },
    });

    renderEditor();

    const row0 = await screen.findByTestId('business-hour-row-0');
    const row1 = screen.getByTestId('business-hour-row-1');
    expect(within(row0).getByLabelText(/dia da semana/i)).toHaveValue('1');
    expect(within(row1).getByLabelText(/dia da semana/i)).toHaveValue('2');
    expect(within(row0).getByLabelText(/início/i)).toHaveValue('08:00');
    expect(within(row0).getByLabelText(/fim/i)).toHaveValue('18:00');
    expect(screen.getByDisplayValue('Natal')).toBeInTheDocument();
  });

  it('adds a new window and saves the full config via PUT', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { businessHours: [], holidays: [] },
    });
    vi.mocked(api.put).mockResolvedValue({
      data: {
        businessHours: [
          { id: 'bh-1', weekday: 1, startTime: '08:00', endTime: '18:00' },
        ],
        holidays: [],
      },
    });

    const user = userEvent.setup();
    renderEditor('sd-1');

    await screen.findByText(/sem expediente configurado/i);

    await user.click(screen.getByRole('button', { name: /adicionar horário/i }));

    const row = screen.getByTestId('business-hour-row-0');
    await user.selectOptions(
      within(row).getByLabelText(/dia da semana/i),
      '1',
    );
    await user.clear(within(row).getByLabelText(/início/i));
    await user.type(within(row).getByLabelText(/início/i), '08:00');
    await user.clear(within(row).getByLabelText(/fim/i));
    await user.type(within(row).getByLabelText(/fim/i), '18:00');

    await user.click(screen.getByRole('button', { name: /salvar expediente/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/service-desks/sd-1/business-hours', {
        businessHours: [{ weekday: 1, startTime: '08:00', endTime: '18:00' }],
        holidays: [],
      });
    });
  });

  it('adds a holiday and includes it in the save payload', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { businessHours: [], holidays: [] },
    });
    vi.mocked(api.put).mockResolvedValue({
      data: { businessHours: [], holidays: [{ id: 'hol-1', date: '2026-12-25', name: 'Natal' }] },
    });

    const user = userEvent.setup();
    renderEditor('sd-1');

    await screen.findByText(/sem expediente configurado/i);

    await user.click(screen.getByRole('button', { name: /adicionar feriado/i }));

    const row = screen.getByTestId('holiday-row-0');
    await user.type(within(row).getByLabelText(/data/i), '2026-12-25');
    await user.type(within(row).getByLabelText(/nome do feriado/i), 'Natal');

    await user.click(screen.getByRole('button', { name: /salvar expediente/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/service-desks/sd-1/business-hours', {
        businessHours: [],
        holidays: [{ date: '2026-12-25', name: 'Natal' }],
      });
    });
  });

  it('removes a window when its remove button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        businessHours: [
          { id: 'bh-1', weekday: 1, startTime: '08:00', endTime: '18:00' },
        ],
        holidays: [],
      },
    });

    const user = userEvent.setup();
    renderEditor();

    await screen.findByTestId('business-hour-row-0');

    const row = screen.getByTestId('business-hour-row-0');
    await user.click(within(row).getByRole('button', { name: /remover/i }));

    expect(screen.queryByTestId('business-hour-row-0')).not.toBeInTheDocument();
  });

  it('applies the same Mon-Fri window in one click via the shortcut', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { businessHours: [], holidays: [] },
    });

    const user = userEvent.setup();
    renderEditor();

    await screen.findByText(/sem expediente configurado/i);

    await user.type(
      screen.getByLabelText(/horário seg-sex \(início\)/i),
      '08:00',
    );
    await user.type(
      screen.getByLabelText(/horário seg-sex \(fim\)/i),
      '18:00',
    );
    await user.click(
      screen.getByRole('button', { name: /aplicar seg-sex/i }),
    );

    const weekdays = [1, 2, 3, 4, 5];
    for (const [i, weekday] of weekdays.entries()) {
      const row = screen.getByTestId(`business-hour-row-${i}`);
      expect(within(row).getByLabelText(/dia da semana/i)).toHaveValue(
        String(weekday),
      );
      expect(within(row).getByLabelText(/início/i)).toHaveValue('08:00');
      expect(within(row).getByLabelText(/fim/i)).toHaveValue('18:00');
    }
    expect(screen.queryByTestId('business-hour-row-5')).not.toBeInTheDocument();
  });

  it('does not apply the Mon-Fri shortcut with empty start/end time', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { businessHours: [], holidays: [] },
    });

    const user = userEvent.setup();
    renderEditor();

    await screen.findByText(/sem expediente configurado/i);

    await user.click(
      screen.getByRole('button', { name: /aplicar seg-sex/i }),
    );

    expect(screen.queryByTestId('business-hour-row-0')).not.toBeInTheDocument();
  });

  it('imports national holidays for a chosen year and adds them as draft rows', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks/holidays/national/2026') {
        return Promise.resolve({
          data: [
            { date: '2026-01-01', name: 'Confraternização mundial' },
            { date: '2026-12-25', name: 'Natal' },
          ],
        });
      }
      return Promise.resolve({ data: { businessHours: [], holidays: [] } });
    });

    const user = userEvent.setup();
    renderEditor();

    await screen.findByText(/sem expediente configurado/i);

    await user.clear(screen.getByLabelText(/ano para importar feriados/i));
    await user.type(screen.getByLabelText(/ano para importar feriados/i), '2026');
    await user.click(
      screen.getByRole('button', { name: /importar feriados nacionais/i }),
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/service-desks/holidays/national/2026',
      );
    });

    expect(await screen.findByDisplayValue('Natal')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Confraternização mundial'),
    ).toBeInTheDocument();
  });

  it('shows an error message when importing national holidays fails', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/service-desks/holidays/national/2026') {
        return Promise.reject(new Error('BrasilAPI unreachable'));
      }
      return Promise.resolve({ data: { businessHours: [], holidays: [] } });
    });

    const user = userEvent.setup();
    renderEditor();

    await screen.findByText(/sem expediente configurado/i);

    await user.click(
      screen.getByRole('button', { name: /importar feriados nacionais/i }),
    );

    expect(
      await screen.findByText(/falha ao importar feriados/i),
    ).toBeInTheDocument();
  });
});
