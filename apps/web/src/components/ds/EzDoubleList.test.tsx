import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzDoubleList } from './EzDoubleList';

const available = [
  { id: 1, label: 'Item A', description: 'Description A' },
  { id: 2, label: 'Item B' },
];

const selected = [{ id: 3, label: 'Item C' }];

describe('EzDoubleList', () => {
  it('renders available and selected items with default labels', () => {
    render(
      <EzDoubleList available={available} selected={selected} onAdd={vi.fn()} onRemove={vi.fn()} />
    );
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    expect(screen.getByText('Selecionados')).toBeInTheDocument();
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
    expect(screen.getByText('Item C')).toBeInTheDocument();
  });

  it('renders custom labels when provided', () => {
    render(
      <EzDoubleList
        available={available}
        selected={selected}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        availableLabel="Custom Available"
        selectedLabel="Custom Selected"
      />
    );
    expect(screen.getByText('Custom Available')).toBeInTheDocument();
    expect(screen.getByText('Custom Selected')).toBeInTheDocument();
  });

  it('shows the count of each list in parentheses', () => {
    render(
      <EzDoubleList available={available} selected={selected} onAdd={vi.fn()} onRemove={vi.fn()} />
    );
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('shows an empty state message when available list is empty', () => {
    render(<EzDoubleList available={[]} selected={selected} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('Nenhum item disponível')).toBeInTheDocument();
  });

  it('shows an empty state message when selected list is empty', () => {
    render(<EzDoubleList available={available} selected={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('Nenhum item selecionado')).toBeInTheDocument();
  });

  it('calls onAdd with the correct item when the add button is clicked', async () => {
    const onAddMock = vi.fn();
    render(
      <EzDoubleList available={available} selected={selected} onAdd={onAddMock} onRemove={vi.fn()} />
    );
    const addButtons = screen.getAllByTitle('Adicionar');
    await userEvent.click(addButtons[0]);
    expect(onAddMock).toHaveBeenCalledTimes(1);
    expect(onAddMock).toHaveBeenCalledWith(available[0]);
  });

  it('calls onRemove with the correct item when the remove button is clicked', async () => {
    const onRemoveMock = vi.fn();
    render(
      <EzDoubleList available={available} selected={selected} onAdd={vi.fn()} onRemove={onRemoveMock} />
    );
    const removeButton = screen.getByTitle('Remover');
    await userEvent.click(removeButton);
    expect(onRemoveMock).toHaveBeenCalledTimes(1);
    expect(onRemoveMock).toHaveBeenCalledWith(selected[0]);
  });

  it('renders item description when provided', () => {
    render(
      <EzDoubleList available={available} selected={selected} onAdd={vi.fn()} onRemove={vi.fn()} />
    );
    expect(screen.getByText('Description A')).toBeInTheDocument();
  });
});