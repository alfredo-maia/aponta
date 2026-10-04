import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzMultiSelect } from './EzMultiSelect';

describe('EzMultiSelect', () => {
  const defaultOptions = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
  ];

  it('renders properly with placeholder when empty', () => {
    render(<EzMultiSelect placeholder="Choose fruits" options={defaultOptions} />);
    expect(screen.getByPlaceholderText('Choose fruits')).toBeInTheDocument();
  });

  it('shows options when clicked/focused', async () => {
    const user = userEvent.setup();
    render(<EzMultiSelect options={defaultOptions} />);
    
    const input = screen.getByRole('textbox');
    await user.click(input);
    
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const mockChange = vi.fn();
    const user = userEvent.setup();
    render(<EzMultiSelect options={defaultOptions} value={[]} onChange={mockChange} />);
    
    await user.click(screen.getByRole('textbox'));
    await user.click(screen.getByText('Banana'));
    
    expect(mockChange).toHaveBeenCalledWith(['banana']);
  });

  it('renders selected values as tags', () => {
    render(<EzMultiSelect options={defaultOptions} value={['apple', 'cherry']} />);
    // EzTag renders the label text
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('removes an option from tags via X button', async () => {
    const mockChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<EzMultiSelect options={defaultOptions} value={['apple']} onChange={mockChange} />);
    
    // In EzMultiSelect, the tag remove is an X icon rendered by lucide-react inside EzTag
    // Since EzTag isn't fully expanded here, we can find the svg with cursor-pointer
    const removeIcon = container.querySelector('.cursor-pointer');
    expect(removeIcon).not.toBeNull();
    
    if (removeIcon) {
      await user.click(removeIcon);
      expect(mockChange).toHaveBeenCalledWith([]);
    }
  });

  it('filters options based on search input locally', async () => {
    const user = userEvent.setup();
    render(<EzMultiSelect options={defaultOptions} />);
    
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, 'app');
    
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.queryByText('Banana')).not.toBeInTheDocument();
  });

  it('disables properly', () => {
    render(<EzMultiSelect options={defaultOptions} disabled />);
    
    const input = screen.queryByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('clears all options when clear All button is clicked', async () => {
    const mockChange = vi.fn();
    const user = userEvent.setup();
    render(<EzMultiSelect options={defaultOptions} value={['apple', 'banana']} onChange={mockChange} />);
    
    const clearBtn = screen.getByTitle('Limpar todos');
    await user.click(clearBtn);
    expect(mockChange).toHaveBeenCalledWith([]);
  });

  it('displays validation errors', () => {
    render(<EzMultiSelect options={defaultOptions} label="Fruits" hasError message="Error msg" />);
    expect(screen.getByText('Error msg').parentElement).toHaveClass('text-red-700');
    expect(screen.getByText('Fruits')).toHaveClass('text-red-700');
  });
});
