import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzTextEdit } from './EzTextEdit';

describe('EzTextEdit', () => {
  it('renders the value as plain text initially', () => {
    render(<EzTextEdit value="Título do chamado" onChange={() => undefined} />);
    expect(screen.getByText('Título do chamado')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('switches to an input on click and saves on Enter', async () => {
    const handleChange = vi.fn();
    const handleSave = vi.fn();
    render(<EzTextEdit value="Original" onChange={handleChange} onSave={handleSave} />);

    await userEvent.click(screen.getByText('Original'));
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, 'Editado{Enter}');

    expect(handleChange).toHaveBeenCalledWith('Editado');
    expect(handleSave).toHaveBeenCalledWith('Editado');
  });

  it('saves on blur as well', async () => {
    const handleChange = vi.fn();
    render(<EzTextEdit value="Original" onChange={handleChange} />);
    await userEvent.click(screen.getByText('Original'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'Via blur');
    await userEvent.tab();
    expect(handleChange).toHaveBeenCalledWith('Via blur');
  });

  it('applies the brand ring class while editing', async () => {
    render(<EzTextEdit value="Original" onChange={() => undefined} />);
    await userEvent.click(screen.getByText('Original'));
    expect(screen.getByRole('textbox')).toHaveClass('ring-brand-600');
  });
});
