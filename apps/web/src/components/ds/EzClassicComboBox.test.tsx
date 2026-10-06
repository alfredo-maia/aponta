import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzClassicComboBox } from './EzClassicComboBox';

describe('EzClassicComboBox', () => {
  const options = [
    { label: 'Opção 1', value: '1' },
    { label: 'Opção 2', value: '2' },
    { label: 'Opção 3', value: '3', disabled: true },
  ];

  it('renders the label and all options', () => {
    render(<EzClassicComboBox label="Categoria" options={options} />);
    expect(screen.getByText('Categoria')).toBeInTheDocument();
    expect(screen.getByText('Opção 1')).toBeInTheDocument();
    expect(screen.getByText('Opção 2')).toBeInTheDocument();
  });

  it('fires onChange when a different option is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EzClassicComboBox options={options} onChange={onChange} />);

    await user.selectOptions(screen.getByRole('combobox'), '2');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('2');
  });

  it('applies square (classic) corners instead of rounded ones', () => {
    render(<EzClassicComboBox options={options} />);
    const wrapper = screen.getByRole('combobox').parentElement;
    expect(wrapper).toHaveClass('rounded-none');
  });

  it('renders error message styling when hasError is true', () => {
    render(<EzClassicComboBox options={options} hasError message="Campo obrigatório" />);
    const msgContainer = screen.getByText('Campo obrigatório').closest('div');
    expect(msgContainer).toHaveClass('text-red-700');
  });
});
