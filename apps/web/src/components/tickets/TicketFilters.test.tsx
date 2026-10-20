import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { TicketFilters } from './TicketFilters';
import type { TicketFiltersInput } from '../../hooks/useTickets';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function renderFilters(filters: TicketFiltersInput, onChange = vi.fn()) {
  vi.mocked(api.get).mockResolvedValue({ data: [] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TicketFilters filters={filters} onChange={onChange} />
    </QueryClientProvider>,
  );
  return { onChange };
}

describe('TicketFilters', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  describe('filtros rápidos (TiFlux "Padrões" parity)', () => {
    it('renders the four quick-filter toggles, all inactive when no flag is set', () => {
      renderFilters({});

      for (const label of ['Meus', 'Não atendidos', 'Pausados', 'Vencidos']) {
        expect(screen.getByRole('button', { name: label })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      }
    });

    it('marks a toggle active when its filter flag is already set', () => {
      renderFilters({ mine: true });

      expect(screen.getByRole('button', { name: 'Meus' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(
        screen.getByRole('button', { name: 'Não atendidos' }),
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('clicking an inactive toggle calls onChange with that flag set to true, preserving other filters', () => {
      const { onChange } = renderFilters({ status: 'OPEN' });

      screen.getByRole('button', { name: 'Vencidos' }).click();

      expect(onChange).toHaveBeenCalledWith({ status: 'OPEN', overdue: true });
    });

    it('clicking an already-active toggle clears that flag (toggle off)', () => {
      const { onChange } = renderFilters({ paused: true, mine: true });

      screen.getByRole('button', { name: 'Pausados' }).click();

      expect(onChange).toHaveBeenCalledWith({ paused: undefined, mine: true });
    });
  });

  describe('filtro de Prioridade', () => {
    it('lists every ticket priority and calls onChange with the selected one', () => {
      const { onChange } = renderFilters({});

      const select = screen.getByLabelText('Prioridade');
      expect(select).toHaveValue('');

      (select as HTMLSelectElement).value = 'CRITICAL';
      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(onChange).toHaveBeenCalledWith({ priority: 'CRITICAL' });
    });

    it('reflects an already-set priority filter in the select value', () => {
      renderFilters({ priority: 'HIGH' });
      expect(screen.getByLabelText('Prioridade')).toHaveValue('HIGH');
    });
  });
});
