import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzDateInput } from './EzDateInput';

describe('EzDateInput', () => {
  it('renders standard date input correctly', () => {
    render(<EzDateInput data-testid="date-in" />);
    const input = screen.getByTestId('date-in');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'date');
  });

  it('renders a label if provided', () => {
    render(<EzDateInput id="dt-my" label="Start Date" />);
    expect(screen.getByText('Start Date')).toBeInTheDocument();
  });

  it('renders required indicator if required is true', () => {
    render(<EzDateInput label="Required Date" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('calls onChange when user inputs a value', async () => {
    const onChangeMock = vi.fn();
    render(<EzDateInput data-testid="date-in" onChange={onChangeMock} />);
    const input = screen.getByTestId('date-in');
    
    await userEvent.type(input, '2023-10-31');
    expect(onChangeMock).toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe('2023-10-31');
  });

  it('shows message text', () => {
    render(<EzDateInput message="Format: MM/DD/YYYY" />);
    expect(screen.getByText('Format: MM/DD/YYYY')).toBeInTheDocument();
  });

  it('applies error state styling', () => {
    render(
      <EzDateInput data-testid="date-in" hasError message="Invalid date" label="End Date" />
    );
    expect(screen.getByText('Invalid date')).toBeInTheDocument();
    
    const wrapper = screen.getByTestId('date-in').parentElement;
    expect(wrapper).toHaveClass('border-red-600');
  });

  it('applies disabled state', () => {
    render(<EzDateInput data-testid="date-in" disabled />);
    const input = screen.getByTestId('date-in');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('cursor-not-allowed');
  });

  it('calls showPicker when the wrapper is clicked', async () => {
    const showPickerMock = vi.fn();
    // HTMLInputElement.prototype.showPicker is not implemented in jsdom by default
    HTMLInputElement.prototype.showPicker = showPickerMock;
    
    render(<EzDateInput data-testid="date-in" />);
    const input = screen.getByTestId('date-in');
    const wrapper = input.parentElement;
    
    if (wrapper) {
      await userEvent.click(wrapper);
    }
    
    expect(showPickerMock).toHaveBeenCalledTimes(1);
    
    // Clean up
    delete (HTMLInputElement.prototype as any).showPicker;
  });
});