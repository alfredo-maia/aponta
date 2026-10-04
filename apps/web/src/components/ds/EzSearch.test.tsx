import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzSearch } from './EzSearch';

const mockOptions = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

describe('EzSearch', () => {
  it('renders the placeholder and label', () => {
    render(<EzSearch label="Fruits" placeholder="Search fruit..." />);
    expect(screen.getByText('Fruits')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search fruit...')).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    render(<EzSearch options={mockOptions} placeholder="Search..." />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.click(input);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('filters options locally when typing', async () => {
    render(<EzSearch options={mockOptions} placeholder="Search..." />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'Ban');
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
  });

  it('selects an option and updates value', async () => {
    const handleChange = vi.fn();
    render(<EzSearch options={mockOptions} placeholder="Search..." onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.click(input);
    await userEvent.click(screen.getByText('Apple'));
    expect(handleChange).toHaveBeenCalledWith('apple');
  });

  it('clears selection when clear button is clicked', async () => {
    const handleChange = vi.fn();
    // Passing value means it's selected
    render(<EzSearch options={mockOptions} value="cherry" onChange={handleChange} placeholder="Search..." />);
    // Clear button only appears when value != null and not disabled
    const clearBtn = screen.getByTitle('Limpar seleção');
    await userEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('calls onSearchChange when typing', async () => {
    const handleSearchChange = vi.fn();
    render(<EzSearch options={mockOptions} onSearchChange={handleSearchChange} placeholder="Search..." />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'a');
    expect(handleSearchChange).toHaveBeenCalledWith('a');
  });

  it('disables the input correctly', () => {
    render(<EzSearch options={mockOptions} placeholder="Search..." disabled />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeDisabled();
  });

  it('renders error message and state', () => {
    render(<EzSearch hasError message="This field is required" placeholder="Search..." />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });
});
