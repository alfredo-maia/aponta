import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzSidebarNavigator, EzSidebarButton } from './EzSidebar';

describe('EzSidebar', () => {
  describe('EzSidebarNavigator', () => {
    it('renders its children', () => {
      render(
        <EzSidebarNavigator>
          <div data-testid="sidebar-child">Child Content</div>
        </EzSidebarNavigator>
      );
      expect(screen.getByTestId('sidebar-child')).toBeInTheDocument();
    });

    it('renders safely when collapsed', () => {
      const { container } = render(
        <EzSidebarNavigator collapsed>
          <div>Child Content</div>
        </EzSidebarNavigator>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('EzSidebarButton', () => {
    it('renders correctly with specific label', () => {
      render(<EzSidebarButton label="Dashboard" />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('fires onClick when clicked', async () => {
      const handleClick = vi.fn();
      render(<EzSidebarButton label="Settings" onClick={handleClick} />);
      await userEvent.click(screen.getByText('Settings'));
      expect(handleClick).toHaveBeenCalled();
    });

    it('renders icon if provided', () => {
      render(<EzSidebarButton label="Home" icon={<span data-testid="icon">H</span>} />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders safely when toggled as active', () => {
      const { container } = render(<EzSidebarButton label="Home" active />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('omits label text when collapsed, rendering as title instead', () => {
      render(<EzSidebarButton label="Profile" collapsed />);
      // Only the title attribute should be "Profile" when collapsed, since inside UI it's removed.
      expect(screen.getByTitle('Profile')).toBeInTheDocument();
      // 'Profile' as normal text might be hidden or absent depending on implementation. The component does:
      // {!collapsed && <span>{label}</span>}
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });
});
