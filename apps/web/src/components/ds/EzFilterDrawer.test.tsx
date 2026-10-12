import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EzFilterDrawer } from './EzFilterDrawer';

describe('EzFilterDrawer', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <EzFilterDrawer isOpen={false} onClose={vi.fn()}>
        <div>Filtros</div>
      </EzFilterDrawer>
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('ez-filter-drawer')).not.toBeInTheDocument();
  });

  it('renders title and children when isOpen is true', () => {
    render(
      <EzFilterDrawer isOpen={true} onClose={vi.fn()} title="Filtros Personalizados">
        <div data-testid="filter-child">Conteúdo do Filtro</div>
      </EzFilterDrawer>
    );

    expect(screen.getByTestId('ez-filter-drawer')).toBeInTheDocument();
    expect(screen.getByText('Filtros Personalizados')).toBeInTheDocument();
    expect(screen.getByTestId('filter-child')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <EzFilterDrawer isOpen={true} onClose={onClose}>
        <div>Conteúdo</div>
      </EzFilterDrawer>
    );

    await user.click(screen.getByTestId('ez-filter-drawer-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClear when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(
      <EzFilterDrawer isOpen={true} onClose={vi.fn()} onClear={onClear}>
        <div>Conteúdo</div>
      </EzFilterDrawer>
    );

    await user.click(screen.getByTestId('ez-filter-drawer-clear'));
    expect(onClear).toHaveBeenCalled();
  });

  it('supports saving, applying, and deleting saved filters (Sankhya parity)', async () => {
    const user = userEvent.setup();
    const onSaveCurrentFilter = vi.fn();
    const onApplySavedFilter = vi.fn();
    const onDeleteSavedFilter = vi.fn();

    const savedFilters = [
      { id: 'f-1', name: 'Ativos VIP', criteria: { status: 'ACTIVE' } },
    ];

    const { rerender } = render(
      <EzFilterDrawer
        isOpen={true}
        onClose={vi.fn()}
        savedFilters={savedFilters}
        onSaveCurrentFilter={onSaveCurrentFilter}
        onApplySavedFilter={onApplySavedFilter}
        onDeleteSavedFilter={onDeleteSavedFilter}
      >
        <div>Campos de busca</div>
      </EzFilterDrawer>
    );

    // Apply saved filter
    expect(screen.getByText('Meus Filtros')).toBeInTheDocument();
    expect(screen.getByText('Ativos VIP')).toBeInTheDocument();
    await user.click(screen.getByText('Ativos VIP'));
    expect(onApplySavedFilter).toHaveBeenCalledWith(savedFilters[0]);

    // Delete saved filter
    await user.click(screen.getByLabelText('Excluir filtro Ativos VIP'));
    expect(onDeleteSavedFilter).toHaveBeenCalledWith('f-1');

    // Save new filter
    await user.click(screen.getByTestId('ez-filter-drawer-save-btn'));
    const input = screen.getByTestId('ez-filter-drawer-name-input');
    await user.type(input, 'Novo Filtro');
    await user.click(screen.getByTestId('ez-filter-drawer-confirm-save'));
    expect(onSaveCurrentFilter).toHaveBeenCalledWith('Novo Filtro');
  });
});
