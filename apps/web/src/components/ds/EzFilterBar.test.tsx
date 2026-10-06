import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzFilterBar, type FilterDef } from './EzFilterBar';

const filters: FilterDef[] = [
  { id: 'status', label: 'Status', category: 'Chamado', value: 'Aberto', active: true, pinned: false },
  { id: 'prioridade', label: 'Prioridade', category: 'Chamado', value: 'Alta', active: true, pinned: true },
  { id: 'cliente', label: 'Cliente', category: 'Relacionamento', value: '', active: false },
];

describe('EzFilterBar', () => {
  it('renders chips only for the currently active filters passed via props', () => {
    render(<EzFilterBar filters={filters} onFilterChange={() => undefined} onApplyAll={() => undefined} />);

    expect(screen.getByText('Status: Aberto')).toBeInTheDocument();
    expect(screen.getByText('Prioridade: Alta')).toBeInTheDocument();
    expect(screen.queryByText(/^Cliente/)).not.toBeInTheDocument();
  });

  it('opens the quick-edit popover with clear/pin/remove options when a chip is clicked', async () => {
    const user = userEvent.setup();
    render(<EzFilterBar filters={filters} onFilterChange={() => undefined} onApplyAll={() => undefined} />);

    expect(screen.queryByRole('button', { name: /limpar/i })).not.toBeInTheDocument();

    await user.click(screen.getByText('Status: Aberto'));

    expect(screen.getByRole('button', { name: /limpar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fixar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
  });

  it('calls onFilterChange with the updated filter when removing it from the popover', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<EzFilterBar filters={filters} onFilterChange={onFilterChange} onApplyAll={() => undefined} />);

    await user.click(screen.getByText('Status: Aberto'));
    await user.click(screen.getByRole('button', { name: /remover/i }));

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'status', active: false })
    );
  });

  it('calls onFilterChange with pinned toggled when "Fixar" is clicked', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<EzFilterBar filters={filters} onFilterChange={onFilterChange} onApplyAll={() => undefined} />);

    await user.click(screen.getByText('Status: Aberto'));
    await user.click(screen.getByRole('button', { name: /fixar/i }));

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'status', pinned: true })
    );
  });

  it('opens the "Filtros" modal showing every filter grouped by category', async () => {
    const user = userEvent.setup();
    render(<EzFilterBar filters={filters} onFilterChange={() => undefined} onApplyAll={() => undefined} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filtros' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Chamado')).toBeInTheDocument();
    expect(screen.getByText('Relacionamento')).toBeInTheDocument();
    // The inactive filter is not shown as a chip, but must appear inside the modal
    expect(screen.getByText('Cliente')).toBeInTheDocument();
  });

  it('calls onApplyAll with the full updated list when toggling a checkbox and clicking "Aplicar"', async () => {
    const user = userEvent.setup();
    const onApplyAll = vi.fn();
    render(<EzFilterBar filters={filters} onFilterChange={() => undefined} onApplyAll={onApplyAll} />);

    await user.click(screen.getByRole('button', { name: 'Filtros' }));
    await user.click(screen.getByRole('checkbox', { name: /cliente/i }));
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onApplyAll).toHaveBeenCalledTimes(1);
    expect(onApplyAll).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'cliente', active: true })])
    );
  });
});
