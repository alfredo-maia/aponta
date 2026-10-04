import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzCheck } from './EzCheck';

describe('EzCheck', () => {
  it('renders correctly', () => {
    render(<EzCheck data-testid="check" />);
    const checkbox = screen.getByTestId('check');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });

  it('renders a label if provided', () => {
    render(<EzCheck id="opt-1" label="Accept terms" />);
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });

  it('fires onChange event when clicked', async () => {
    const onChangeMock = vi.fn();
    render(<EzCheck data-testid="check" onChange={onChangeMock} />);
    const checkbox = screen.getByTestId('check');
    
    await userEvent.click(checkbox);
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(checkbox).toBeChecked();
  });

  it('reflects checked value when passed as prop', () => {
    render(<EzCheck data-testid="check" checked readOnly />);
    expect(screen.getByTestId('check')).toBeChecked();
  });

  it('applies disabled state correctly', () => {
    render(<EzCheck data-testid="check" disabled label="Disabled Option" />);
    const checkbox = screen.getByTestId('check');
    expect(checkbox).toBeDisabled();
    
    // The visual wrapper applies opacity class for disabled
    const labelWrapper = screen.getByText('Disabled Option').closest('label');
    expect(labelWrapper).toHaveClass('opacity-60');
  });

  it('applies error styling when hasError is true', () => {
    render(<EzCheck data-testid="check" hasError label="Error text" />);
    const checkbox = screen.getByTestId('check');
    expect(checkbox).toHaveClass('border-red-600');
    
    const labelSpan = screen.getByText('Error text');
    expect(labelSpan).toHaveClass('text-red-700');
  });
});