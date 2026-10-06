import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzMultiSelectionList } from './EzMultiSelectionList';

const items = [
  { id: '1', label: 'Opção 1' },
  { id: '2', label: 'Opção 2' },
  { id: '3', label: 'Opção 3' },
];

describe('EzMultiSelectionList', () => {
  it('renders all item labels', () => {
    render(<EzMultiSelectionList items={items} selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Opção 1')).toBeInTheDocument();
    expect(screen.getByText('Opção 2')).toBeInTheDocument();
    expect(screen.getByText('Opção 3')).toBeInTheDocument();
  });

  it('calls onChange adding the id when an unselected item is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EzMultiSelectionList items={items} selectedIds={['1']} onChange={onChange} />);
    await user.click(screen.getByText('Opção 2'));
    expect(onChange).toHaveBeenCalledWith(['1', '2']);
  });

  it('calls onChange removing the id when a selected item is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EzMultiSelectionList items={items} selectedIds={['1', '2']} onChange={onChange} />);
    await user.click(screen.getByText('Opção 1'));
    expect(onChange).toHaveBeenCalledWith(['2']);
  });

  it('applies the selected highlight class to a selected row', () => {
    render(<EzMultiSelectionList items={items} selectedIds={['1']} onChange={vi.fn()} />);
    const option = screen.getByText('Opção 1').closest('label');
    expect(option).toHaveClass('bg-brand-50');
  });
});
