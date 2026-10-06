import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzClassicTextArea } from './EzClassicTextArea';

describe('EzClassicTextArea', () => {
  it('renders the label correctly', () => {
    render(<EzClassicTextArea label="Observações" />);
    expect(screen.getByText('Observações')).toBeInTheDocument();
  });

  it('accepts text input and fires onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EzClassicTextArea label="Observações" onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Conteúdo de teste');

    expect(onChange).toHaveBeenCalled();
    expect(textarea).toHaveValue('Conteúdo de teste');
  });

  it('applies square (classic) corners to the wrapper', () => {
    render(<EzClassicTextArea label="Observações" />);
    const wrapper = screen.getByRole('textbox').parentElement;
    expect(wrapper).toHaveClass('rounded-none');
  });

  it('shows error message styling when hasError is true', () => {
    render(<EzClassicTextArea message="Campo obrigatório" hasError />);
    const msgContainer = screen.getByText('Campo obrigatório').closest('div');
    expect(msgContainer).toHaveClass('text-red-700');
  });

  it('renders disabled state correctly', () => {
    render(<EzClassicTextArea label="Observações" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
