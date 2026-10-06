import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzTagInput } from './EzTagInput';

describe('EzTagInput', () => {
  it('renders the existing tags', () => {
    render(<EzTagInput tags={['bug', 'urgente']} onChange={() => undefined} />);
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('urgente')).toBeInTheDocument();
  });

  it('adds a new tag when typing text and pressing Enter', async () => {
    const handleChange = vi.fn();
    render(<EzTagInput tags={['bug']} onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Adicionar e pressionar Enter...');
    await userEvent.type(input, 'novo{Enter}');
    expect(handleChange).toHaveBeenCalledWith(['bug', 'novo']);
  });

  it('removes a tag when its X button is clicked', async () => {
    const handleChange = vi.fn();
    render(<EzTagInput tags={['bug', 'urgente']} onChange={handleChange} />);
    await userEvent.click(screen.getByLabelText('Remover bug'));
    expect(handleChange).toHaveBeenCalledWith(['urgente']);
  });

  it('applies the brand chip classes to each tag', () => {
    render(<EzTagInput tags={['bug']} onChange={() => undefined} />);
    expect(screen.getByText('bug').closest('span')).toHaveClass('text-brand-700');
  });
});
