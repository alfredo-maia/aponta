import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketsHeader } from './TicketsHeader';

function renderHeader(props: Partial<Parameters<typeof TicketsHeader>[0]> = {}) {
  const defaultProps: Parameters<typeof TicketsHeader>[0] = {
    isClient: false,
    viewMode: 'kanban',
    onViewModeChange: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    onOpenAdvancedSearch: vi.fn(),
  };
  return render(<TicketsHeader {...defaultProps} {...props} />);
}

describe('TicketsHeader (D3)', () => {
  it('shows "Tickets" as the title, in that position, with Lista/Kanban, Buscar and Busca avançada (AC2)', () => {
    renderHeader();

    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lista' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kanban' })).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Busca avançada' })).toBeInTheDocument();
  });

  it('hides the Lista/Kanban toggle for CLIENT (AC2)', () => {
    renderHeader({ isClient: true });

    expect(screen.queryByRole('button', { name: 'Lista' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kanban' })).not.toBeInTheDocument();
  });

  it('calls onViewModeChange when a toggle button is clicked', async () => {
    const onViewModeChange = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onViewModeChange, viewMode: 'kanban' });

    await user.click(screen.getByRole('button', { name: 'Lista' }));
    expect(onViewModeChange).toHaveBeenCalledWith('list');
  });

  it('debounces typed search text before calling onSearchChange', async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onSearchChange });

    await user.type(screen.getByLabelText(/buscar/i), 'impressora');
    expect(onSearchChange).not.toHaveBeenCalled();

    await waitFor(() => expect(onSearchChange).toHaveBeenCalledWith('impressora'));
  });

  it('calls onOpenAdvancedSearch when "Busca avançada" is clicked', async () => {
    const onOpenAdvancedSearch = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onOpenAdvancedSearch });

    await user.click(screen.getByRole('button', { name: 'Busca avançada' }));
    expect(onOpenAdvancedSearch).toHaveBeenCalled();
  });
});
