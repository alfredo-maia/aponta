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

    it('never shrinks below its fixed width, even inside a flex row with a wide sibling (DMTE-35: "Tickets" item resizing on click)', () => {
      // Regression guard for the reported bug: clicking "Tickets" loaded a page
      // with wide content (e.g. the tickets table), which — without shrink-0 and
      // an explicit min-width — let the flex layout shrink the sidebar and every
      // item inside it. shrink-0 + min-w-[Npx] on the nav, paired with min-w-0 on
      // the content area (see AppLayout.tsx), is what keeps the sidebar's own
      // width (and therefore every nav button's box model) constant regardless
      // of how wide the active page's content is.
      const { container, rerender } = render(
        <div style={{ display: 'flex' }}>
          <EzSidebarNavigator>
            <div>Child Content</div>
          </EzSidebarNavigator>
          <div style={{ width: '4000px' }}>Very wide sibling content</div>
        </div>
      );
      const nav = container.querySelector('nav');
      expect(nav?.className).toContain('shrink-0');
      expect(nav?.className).toContain('w-[240px]');
      expect(nav?.className).toContain('min-w-[240px]');

      rerender(
        <div style={{ display: 'flex' }}>
          <EzSidebarNavigator collapsed>
            <div>Child Content</div>
          </EzSidebarNavigator>
          <div style={{ width: '4000px' }}>Very wide sibling content</div>
        </div>
      );
      const collapsedNav = container.querySelector('nav');
      expect(collapsedNav?.className).toContain('shrink-0');
      expect(collapsedNav?.className).toContain('w-[64px]');
      expect(collapsedNav?.className).toContain('min-w-[64px]');
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

    it('renders a disabled item with an "Em breve" badge and blocks the click', async () => {
      const onClick = vi.fn();
      render(<EzSidebarButton label="Agenda" disabled onClick={onClick} />);

      const button = screen.getByRole('button', { name: /agenda/i });
      expect(button).toBeDisabled();
      expect(screen.getByText('Em breve')).toBeInTheDocument();

      await userEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('shows "(Em breve)" in the title when disabled and collapsed, instead of the badge', () => {
      render(<EzSidebarButton label="Agenda" disabled collapsed />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Agenda (Em breve)');
      expect(screen.queryByText('Em breve')).not.toBeInTheDocument();
    });
  });
});
