import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzBreadcrumb } from './EzBreadcrumb';

describe('EzBreadcrumb', () => {
  it('renders a single text item properly', () => {
    const items = [{ label: 'Home' }];
    render(<EzBreadcrumb items={items} />);
    const item = screen.getByText('Home');
    expect(item).toBeInTheDocument();
    // It should be a span and not have href, but should have aria-current="page"
    expect(item.tagName).toBe('SPAN');
    expect(item).toHaveAttribute('aria-current', 'page');
  });

  it('renders a link item with href as anchor tag', () => {
    const items = [{ label: 'Home', href: '/home' }, { label: 'Settings' }];
    render(<EzBreadcrumb items={items} />);
    const link = screen.getByText('Home');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/home');
  });

  it('renders clickable item as button and fires onClick', async () => {
    const onClickMock = vi.fn();
    const items = [{ label: 'Back', onClick: onClickMock }, { label: 'Current' }];
    render(<EzBreadcrumb items={items} />);
    const btn = screen.getByText('Back');
    expect(btn.tagName).toBe('BUTTON');
    
    await userEvent.click(btn);
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  it('sets aria-current="page" to the last item', () => {
    const items = [{ label: 'Root' }, { label: 'Parent' }, { label: 'Current' }];
    render(<EzBreadcrumb items={items} />);
    
    expect(screen.getByText('Root')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Parent')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Current')).toHaveAttribute('aria-current', 'page');
  });

  it('renders optional icons for items', () => {
    const items = [{ label: 'Home', icon: <svg data-testid="test-icon" /> }];
    render(<EzBreadcrumb items={items} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});