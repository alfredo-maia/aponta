import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzComboBox } from './EzComboBox';

describe('EzComboBox', () => {
  it('renders correctly with options', () => {
    render(
      <EzComboBox data-testid="combo">
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </EzComboBox>
    );
    const select = screen.getByTestId('combo');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('renders a label if provided', () => {
    render(
      <EzComboBox id="my-select" label="Select an item">
        <option value="1">1</option>
      </EzComboBox>
    );
    expect(screen.getByText('Select an item')).toBeInTheDocument();
  });

  it('renders required indicator if required is true', () => {
    render(
      <EzComboBox label="Mandatory" required>
        <option value="1">1</option>
      </EzComboBox>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('fires onChange when selection changes', async () => {
    const onChangeMock = vi.fn();
    render(
      <EzComboBox data-testid="combo" onChange={onChangeMock}>
        <option value="A">Choice A</option>
        <option value="B">Choice B</option>
      </EzComboBox>
    );
    const select = screen.getByTestId('combo');
    await userEvent.selectOptions(select, 'B');
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect((select as HTMLSelectElement).value).toBe('B');
  });

  it('shows generic message if provided', () => {
    render(
      <EzComboBox message="Helpful text">
        <option value="1">1</option>
      </EzComboBox>
    );
    expect(screen.getByText('Helpful text')).toBeInTheDocument();
  });

  it('applies error state correctly', () => {
    render(
      <EzComboBox data-testid="combo" hasError message="Error text" label="Label text">
        <option value="1">1</option>
      </EzComboBox>
    );
    expect(screen.getByText('Error text')).toBeInTheDocument();
    
    // Check if error classes are applied
    const label = screen.getByText('Label text');
    expect(label).toHaveClass('text-red-700');
    
    // Verify focus wrapper classes
    const wrapper = screen.getByTestId('combo').parentElement;
    expect(wrapper).toHaveClass('border-red-600');
  });

  it('applies disabled state correctly', () => {
    render(
      <EzComboBox data-testid="combo" disabled label="Disabled Select">
        <option value="1">1</option>
      </EzComboBox>
    );
    const select = screen.getByTestId('combo');
    expect(select).toBeDisabled();
    expect(select).toHaveClass('cursor-not-allowed');
  });
});