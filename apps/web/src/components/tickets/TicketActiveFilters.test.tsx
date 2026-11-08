import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketActiveFilters } from './TicketActiveFilters';

describe('TicketActiveFilters (AC-10)', () => {
  it('renders nothing when only paging and sorting are set', () => {
    const { container } = render(
      <TicketActiveFilters
        filters={{ page: 3, sortBy: 'title', sortDir: 'asc', agentIds: ['a1'] }}
        onReset={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each active filter in a named group', () => {
    render(
      <TicketActiveFilters
        filters={{ status: 'OPEN', priority: 'HIGH', search: 'impressora', mine: true }}
        onReset={vi.fn()}
      />,
    );
    const group = screen.getByRole('group', { name: /filtros ativos/i });
    for (const text of ['Status: Aberto', 'Prioridade: Alta', 'Busca: impressora', 'Meus']) {
      expect(group).toHaveTextContent(text);
    }
  });

  it('names filters that hold an id without inventing a label for the value', () => {
    render(
      <TicketActiveFilters
        filters={{ serviceDeskId: 'sd-1', organizationId: 'org-1', dateFrom: '2026-01-01' }}
        onReset={vi.fn()}
      />,
    );
    const group = screen.getByRole('group', { name: /filtros ativos/i });
    for (const text of ['Mesa de serviço', 'Cliente', 'Período']) {
      expect(group).toHaveTextContent(text);
    }
    expect(group).not.toHaveTextContent('sd-1');
  });

  it('calls onReset when "Redefinir filtros" is clicked', async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(<TicketActiveFilters filters={{ status: 'OPEN' }} onReset={onReset} />);
    await user.click(screen.getByRole('button', { name: 'Redefinir filtros' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
