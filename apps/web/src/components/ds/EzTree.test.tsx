import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzTree } from './EzTree';

const nodes = [
  {
    id: 'root',
    label: 'Departamentos',
    children: [
      { id: 'ti', label: 'TI' },
      { id: 'rh', label: 'RH' },
    ],
  },
];

describe('EzTree', () => {
  it('renders the root node and hides children until expanded', () => {
    render(<EzTree nodes={nodes} />);
    expect(screen.getByText('Departamentos')).toBeInTheDocument();
    expect(screen.queryByText('TI')).not.toBeInTheDocument();
  });

  it('expands children when the chevron is clicked', async () => {
    render(<EzTree nodes={nodes} />);
    await userEvent.click(screen.getByLabelText('Expandir'));
    expect(screen.getByText('TI')).toBeInTheDocument();
    expect(screen.getByText('RH')).toBeInTheDocument();
  });

  it('calls onSelect with the clicked node', async () => {
    const handleSelect = vi.fn();
    render(<EzTree nodes={nodes} onSelect={handleSelect} />);
    await userEvent.click(screen.getByText('Departamentos'));
    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'root' }));
  });

  it('applies the brand selected classes when selectedId matches a node', () => {
    render(<EzTree nodes={nodes} selectedId="root" />);
    expect(screen.getByTestId('tree-node-root')).toHaveClass('bg-brand-50');
  });
});
