import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzSortableList } from './EzSortableList';

const items = [
  { id: 1, label: 'Item A' },
  { id: 2, label: 'Item B' },
  { id: 3, label: 'Item C' },
];

function makeDataTransfer() {
  const store: Record<string, string> = {};
  return {
    effectAllowed: '',
    setData: (type: string, value: string) => {
      store[type] = value;
    },
    getData: (type: string) => store[type] ?? '',
  };
}

describe('EzSortableList', () => {
  it('renders all items in order', () => {
    render(<EzSortableList items={items} onReorder={() => undefined} />);
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
    expect(screen.getByText('Item C')).toBeInTheDocument();
  });

  it('calls onReorder with the new order after a drag-and-drop sequence', () => {
    const handleReorder = vi.fn();
    render(<EzSortableList items={items} onReorder={handleReorder} />);

    const first = screen.getByTestId('sortable-item-1');
    const third = screen.getByTestId('sortable-item-3');
    const dataTransfer = makeDataTransfer();

    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.dragOver(third, { dataTransfer });
    fireEvent.drop(third, { dataTransfer });

    expect(handleReorder).toHaveBeenCalledTimes(1);
    const newOrder = handleReorder.mock.calls[0][0];
    expect(newOrder.map((i: { id: number }) => i.id)).toEqual([2, 3, 1]);
  });

  it('applies the default border class to each row', () => {
    render(<EzSortableList items={items} onReorder={() => undefined} />);
    expect(screen.getByTestId('sortable-item-1')).toHaveClass('border-gray-200');
  });
});
