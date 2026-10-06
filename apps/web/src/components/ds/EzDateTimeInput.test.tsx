import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzDateTimeInput } from './EzDateTimeInput';

describe('EzDateTimeInput', () => {
  it('renders with datetime-local type', () => {
    render(<EzDateTimeInput label="Data" id="dt" value="2024-01-01T10:00" onChange={() => undefined} />);
    const input = screen.getByLabelText('Data') as HTMLInputElement;
    expect(input.type).toBe('datetime-local');
  });

  it('calls onChange on user input', () => {
    const onChange = vi.fn();
    render(<EzDateTimeInput value="" onChange={onChange} aria-label="dt" />);
    fireEvent.change(screen.getByLabelText('dt'), { target: { value: '2024-02-02T12:00' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('applies error border class', () => {
    render(<EzDateTimeInput hasError aria-label="dt" />);
    expect(screen.getByLabelText('dt')).toHaveClass('border-red-600');
  });
});
