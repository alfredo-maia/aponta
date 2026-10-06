import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzFilterInput } from './EzFilterInput';

describe('EzFilterInput', () => {
  it('renders placeholder text', () => {
    render(<EzFilterInput value="" onChange={() => undefined} placeholder="Pesquisar chamados" />);
    expect(screen.getByPlaceholderText('Pesquisar chamados')).toBeInTheDocument();
  });

  it('calls onChange with new value', () => {
    const onChange = vi.fn();
    render(<EzFilterInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalledWith('abc');
  });

  it('calls onOpenAdvanced when advanced button clicked', () => {
    const onOpenAdvanced = vi.fn();
    render(<EzFilterInput value="" onChange={() => undefined} onOpenAdvanced={onOpenAdvanced} />);
    fireEvent.click(screen.getByLabelText('Filtros avançados'));
    expect(onOpenAdvanced).toHaveBeenCalled();
  });
});
