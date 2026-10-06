import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzFilter } from './EzFilter';

const filters = [
  { id: '1', label: 'Status', value: 'Aberto' },
  { id: '2', label: 'Prioridade', value: 'Alta' },
];

describe('EzFilter', () => {
  it('renders all filter chips', () => {
    render(<EzFilter filters={filters} onRemove={() => undefined} />);
    expect(screen.getByText('Status: Aberto')).toBeInTheDocument();
    expect(screen.getByText('Prioridade: Alta')).toBeInTheDocument();
  });

  it('calls onRemove with the correct id', () => {
    const onRemove = vi.fn();
    render(<EzFilter filters={filters} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remover Status: Aberto'));
    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('renders add filter button only when onAdd is provided', () => {
    render(<EzFilter filters={filters} onRemove={() => undefined} onAdd={() => undefined} />);
    expect(screen.getByText('Adicionar filtro')).toBeInTheDocument();
  });
});
