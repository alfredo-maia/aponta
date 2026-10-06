import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzClassicInput } from './EzClassicInput';

describe('EzClassicInput', () => {
  it('renders the label correctly', () => {
    render(<EzClassicInput label="Nome" />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
  });

  it('accepts text input and fires onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EzClassicInput label="Nome" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Teste');

    expect(onChange).toHaveBeenCalled();
    expect(input).toHaveValue('Teste');
  });

  it('applies square (classic) corners to the wrapper', () => {
    render(<EzClassicInput label="Nome" />);
    const wrapper = screen.getByRole('textbox').parentElement;
    expect(wrapper).toHaveClass('rounded-none');
  });

  it('renders disabled state correctly', () => {
    render(<EzClassicInput label="Nome" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows error message styling when hasError is true', () => {
    render(<EzClassicInput message="Campo obrigatório" hasError />);
    const msgContainer = screen.getByText('Campo obrigatório').closest('div');
    expect(msgContainer).toHaveClass('text-red-700');
  });
});
