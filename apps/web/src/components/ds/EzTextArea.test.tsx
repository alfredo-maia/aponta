import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzTextArea } from './EzTextArea';

describe('EzTextArea', () => {
  it('renders without label or message', () => {
    render(<EzTextArea placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
  });

  it('renders label and required indicator', () => {
    render(<EzTextArea label="Notes" required />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders error state and message', () => {
    render(<EzTextArea label="Bio" hasError message="Too short" />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
    // Label should get red class
    expect(screen.getByText('Bio')).toHaveClass('text-red-700');
  });

  it('allows user input', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<EzTextArea placeholder="Type here" onChange={mockOnChange} />);
    
    const textarea = screen.getByPlaceholderText('Type here');
    await user.type(textarea, 'Hello world');
    expect(textarea).toHaveValue('Hello world');
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('is disabled and prevents typing', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<EzTextArea disabled placeholder="Locked" onChange={mockOnChange} />);
    
    const textarea = screen.getByPlaceholderText('Locked');
    expect(textarea).toBeDisabled();
    
    await user.type(textarea, 'try to edit');
    expect(textarea).not.toHaveValue('try to edit');
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
