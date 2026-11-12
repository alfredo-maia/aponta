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
    expect(screen.getByRole('combobox')).toHaveTextContent('Option 1');
  });

  it('DMTE-490 AC-11: renders through the EzSelect listbox, keeping the children <option> API', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EzComboBox label="Prioridade" onChange={onChange}>
        <option value="LOW">Baixa</option>
        <option value="HIGH">Alta</option>
      </EzComboBox>
    );

    await user.click(screen.getByRole('combobox', { name: /prioridade/i }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Baixa', 'Alta']);
    await user.click(screen.getByRole('option', { name: 'Alta' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe('HIGH');
  });

  it('DMTE-490 AC-11: forwards the ref to the native select', () => {
    const ref = { current: null as HTMLSelectElement | null };
    render(
      <EzComboBox ref={ref} data-testid="combo">
        <option value="1">1</option>
      </EzComboBox>
    );
    expect(ref.current).toBe(screen.getByTestId('combo'));
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
    expect(screen.getByTestId('combo')).toBeDisabled();
    const control = screen.getByRole('combobox');
    expect(control).toBeDisabled();
    expect(control).toHaveClass('cursor-not-allowed');
  });
});