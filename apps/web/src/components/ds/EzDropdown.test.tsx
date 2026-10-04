import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzDropdown } from './EzDropdown';

describe('EzDropdown', () => {
  const defaultOptions = [
    { label: 'Option 1', onClick: vi.fn() },
    { label: 'Option 2', onClick: vi.fn(), danger: true },
    { label: 'Option 3', onClick: vi.fn(), disabled: true },
  ];

  it('renders trigger correctly and options are hidden by default', () => {
    render(<EzDropdown trigger={<span data-testid="trigger">Menu</span>} options={defaultOptions} />);
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('opens and shows options when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<EzDropdown trigger="Menu" options={defaultOptions} />);
    
    await user.click(screen.getByText('Menu'));
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onClick and closes dropdown when an option is clicked', async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();
    render(<EzDropdown trigger="Menu" options={[{ label: 'Click Me', onClick: mockClick }]} />);
    
    await user.click(screen.getByText('Menu'));
    await user.click(screen.getByText('Click Me'));
    
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Click Me')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <EzDropdown trigger="Menu" options={defaultOptions} />
      </div>
    );
    
    await user.click(screen.getByText('Menu'));
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    
    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('does not open if dropdown is disabled', async () => {
    const user = userEvent.setup();
    render(<EzDropdown trigger="Menu" options={defaultOptions} disabled />);
    
    await user.click(screen.getByText('Menu'));
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('does not call onClick or close when disabled option is clicked', async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();
    render(<EzDropdown trigger="Menu" options={[{ label: 'Disabled', onClick: mockClick, disabled: true }]} />);
    
    await user.click(screen.getByText('Menu'));
    const disabledOption = screen.getByText('Disabled');
    await user.click(disabledOption);
    
    expect(mockClick).not.toHaveBeenCalled();
    expect(screen.getByText('Disabled')).toBeInTheDocument(); // still open
  });

  it('applies danger styling to danger options', async () => {
    const user = userEvent.setup();
    render(<EzDropdown trigger="Menu" options={[{ label: 'Delete', danger: true }]} />);
    
    await user.click(screen.getByText('Menu'));
    expect(screen.getByText('Delete').closest('button')).toHaveClass('text-red-700');
  });

  it('aligns to the right correctly', async () => {
    const user = userEvent.setup();
    render(<EzDropdown trigger="Menu" options={defaultOptions} align="right" />);
    
    await user.click(screen.getByText('Menu'));
    const menuContainer = screen.getByRole('menu');
    expect(menuContainer).toHaveClass('right-0 origin-top-right');
  });
});
