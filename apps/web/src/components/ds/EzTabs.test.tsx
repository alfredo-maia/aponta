import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzTabs } from './EzTabs';

const dummyTabs = [
  { id: '1', label: 'Overview' },
  { id: '2', label: 'Settings' },
  { id: '3', label: 'Danger Zone', disabled: true },
];

describe('EzTabs', () => {
  it('renders line variant by default and highlights the active tab', () => {
    render(<EzTabs tabs={dummyTabs} activeTab="1" onChange={vi.fn()} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // In line variant, active tab gets text-brand-600
    expect(screen.getByText('Overview')).toHaveClass('text-brand-600');
    expect(screen.getByText('Settings')).not.toHaveClass('text-brand-600');
  });

  it('renders pills variant and marks disabled state correctly', () => {
    render(<EzTabs tabs={dummyTabs} activeTab="2" onChange={vi.fn()} variant="pills" />);
    // Active pill gets bg-brand-100
    expect(screen.getByText('Settings')).toHaveClass('bg-brand-100');
    
    // Disabled tab has opacity and disabled attribute
    const disabledTab = screen.getByText('Danger Zone');
    expect(disabledTab).toBeDisabled();
    expect(disabledTab).toHaveClass('opacity-50');
  });

  it('fires onChange when a non-disabled tab is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<EzTabs tabs={dummyTabs} activeTab="1" onChange={mockOnChange} />);

    await user.click(screen.getByText('Settings'));
    expect(mockOnChange).toHaveBeenCalledWith('2');
  });

  it('does not fire onChange when a disabled tab is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<EzTabs tabs={dummyTabs} activeTab="1" onChange={mockOnChange} />);

    await user.click(screen.getByText('Danger Zone'));
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
