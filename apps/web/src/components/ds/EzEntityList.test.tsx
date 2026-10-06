import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzEntityList } from './EzEntityList';

const items = [
  { id: '1', label: 'Item 1', checked: true },
  { id: '2', label: 'Item 2', checked: false },
  { id: '3', label: 'Item 3', checked: false },
];

describe('EzEntityList', () => {
  it('renders items with the correct checked state', () => {
    render(<EzEntityList items={items} onToggle={vi.fn()} />);
    expect(screen.getByLabelText('Item 1')).toBeChecked();
    expect(screen.getByLabelText('Item 2')).not.toBeChecked();
    expect(screen.getByLabelText('Item 3')).not.toBeChecked();
  });

  it('calls onToggle with the correct id when a checkbox is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<EzEntityList items={items} onToggle={onToggle} />);
    await user.click(screen.getByLabelText('Item 2'));
    expect(onToggle).toHaveBeenCalledWith('2');
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onSearch when typing in the search field (async search mode)', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(
      <EzEntityList
        items={items}
        onToggle={vi.fn()}
        onSearch={onSearch}
        searchPlaceholder="Buscar parceiro..."
      />
    );
    const input = screen.getByPlaceholderText('Buscar parceiro...');
    await user.type(input, 'abc');
    expect(onSearch).toHaveBeenCalledWith('abc');
  });

  it('filters the list locally by label when onSearch is not provided', async () => {
    const user = userEvent.setup();
    render(<EzEntityList items={items} onToggle={vi.fn()} />);
    const input = screen.getByPlaceholderText('Buscar...');
    await user.type(input, 'Item 2');
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument();
  });

  it('renders an empty state message when no items match the local filter', async () => {
    const user = userEvent.setup();
    render(<EzEntityList items={items} onToggle={vi.fn()} />);
    const input = screen.getByPlaceholderText('Buscar...');
    await user.type(input, 'xyz-not-found');
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
  });
});
