import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzNumberInput } from './EzNumberInput';

describe('EzNumberInput', () => {
  it('renders the current value', () => {
    render(<EzNumberInput value={5} onChange={vi.fn()} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(5);
  });

  it('calls onChange with value + step when the increment button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EzNumberInput value={5} onChange={onChange} />);
    await user.click(screen.getByLabelText('Aumentar'));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('calls onChange with value - step when the decrement button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EzNumberInput value={5} onChange={onChange} step={2} />);
    await user.click(screen.getByLabelText('Diminuir'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('disables the decrement button when value is at min', () => {
    render(<EzNumberInput value={0} onChange={vi.fn()} min={0} />);
    expect(screen.getByLabelText('Diminuir')).toBeDisabled();
  });

  it('disables the increment button when value is at max', () => {
    render(<EzNumberInput value={10} onChange={vi.fn()} max={10} />);
    expect(screen.getByLabelText('Aumentar')).toBeDisabled();
  });
});
