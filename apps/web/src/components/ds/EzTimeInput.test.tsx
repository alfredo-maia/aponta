import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzTimeInput } from './EzTimeInput';

describe('EzTimeInput', () => {
  it('renders a native time input with the given value', () => {
    render(<EzTimeInput label="Hora" value="08:30" onChange={() => undefined} readOnly />);
    const input = screen.getByDisplayValue('08:30');
    expect(input).toHaveAttribute('type', 'time');
    expect(screen.getByText('Hora')).toBeInTheDocument();
  });

  it('fires onChange when the time value changes', () => {
    const handleChange = vi.fn();
    render(<EzTimeInput label="Hora" value="08:00" onChange={handleChange} />);
    const input = screen.getByDisplayValue('08:00');
    fireEvent.change(input, { target: { value: '09:15' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies the error border class when hasError is true', () => {
    const { container } = render(
      <EzTimeInput label="Hora" value="08:00" onChange={() => undefined} hasError message="Obrigatório" />
    );
    expect(container.querySelector('.border-red-600')).toBeInTheDocument();
    expect(screen.getByText('Obrigatório')).toBeInTheDocument();
  });
});
