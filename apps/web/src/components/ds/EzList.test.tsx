import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzList, EzListItem } from './EzList';

describe('EzList & EzListItem', () => {
  describe('EzList', () => {
    it('renders list with default styling', () => {
      const { container } = render(<EzList><EzListItem>Item</EzListItem></EzList>);
      expect(container.firstChild).toHaveClass('border-gray-200');
    });

    it('renders flush list without borders', () => {
      const { container } = render(<EzList flush><EzListItem>Item</EzListItem></EzList>);
      expect(container.firstChild).not.toHaveClass('border-gray-200');
    });
  });

  describe('EzListItem', () => {
    it('renders description and children', () => {
      render(<EzListItem description="Test desc">Item text</EzListItem>);
      expect(screen.getByText('Item text')).toBeInTheDocument();
      expect(screen.getByText('Test desc')).toBeInTheDocument();
    });

    it('renders leading and trailing elements', () => {
      render(
        <EzListItem 
          leading={<span data-testid="lead">L</span>} 
          trailing={<span data-testid="trail">T</span>}
        >
          Item
        </EzListItem>
      );
      expect(screen.getByTestId('lead')).toBeInTheDocument();
      expect(screen.getByTestId('trail')).toBeInTheDocument();
    });

    it('handles click events and applies clickable styles', async () => {
      const mockClick = vi.fn();
      const user = userEvent.setup();
      render(<EzListItem onClick={mockClick}>Clickable</EzListItem>);
      
      const listItem = screen.getByText('Clickable').closest('li');
      expect(listItem).toHaveClass('cursor-pointer');
      
      await user.click(screen.getByText('Clickable'));
      expect(mockClick).toHaveBeenCalledTimes(1);
    });
  });
});
