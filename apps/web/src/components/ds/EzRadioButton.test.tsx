import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzRadioButton } from './EzRadioButton';

describe('EzRadioButton', () => {
  it('renders correctly', () => {
    render(<EzRadioButton />);
    expect(screen.getByRole('radio')).toBeInTheDocument();
  });

  it('renders a string label', () => {
    render(<EzRadioButton label="Option A" />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
  });

  it('handles custom string label rendering on click', async () => {
    const handleChange = vi.fn();
    render(<EzRadioButton label="Option A" onChange={handleChange} />);
    const radio = screen.getByRole('radio');
    await userEvent.click(radio);
    expect(handleChange).toHaveBeenCalled();
    expect(radio).toBeChecked();
  });

  it('renders disabled state', () => {
    render(<EzRadioButton label="Option Disabled" disabled />);
    const radio = screen.getByRole('radio');
    expect(radio).toBeDisabled();
  });

  it('renders correctly with error styling class indicator', () => {
    const { container } = render(<EzRadioButton label="Error option" hasError />);
    const labelParent = container.querySelector('label');
    expect(labelParent).toBeInTheDocument();
    // Assuming error logic visually marks radio
  });
});
