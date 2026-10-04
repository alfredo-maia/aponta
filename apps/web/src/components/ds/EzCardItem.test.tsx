import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzCardItem, EzEmptyCard } from './EzCardItem';

describe('EzCardItem', () => {
  it('renders children correctly', () => {
    render(<EzCardItem>Card Content</EzCardItem>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('has shadow by default', () => {
    const { container } = render(<EzCardItem>Default Card</EzCardItem>);
    expect(container.firstChild).toHaveClass('shadow-sm');
  });

  it('removes shadow when flat prop is true', () => {
    const { container } = render(<EzCardItem flat>Flat Card</EzCardItem>);
    expect(container.firstChild).not.toHaveClass('shadow-sm');
  });
});

describe('EzEmptyCard', () => {
  it('renders the title and description', () => {
    render(<EzEmptyCard title="No items" description="Please add some items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Please add some items')).toBeInTheDocument();
  });

  it('renders an icon if provided', () => {
    render(<EzEmptyCard icon={<div data-testid="empty-icon" />} title="Empty" />);
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('renders action content if provided', () => {
    render(<EzEmptyCard action={<button>Add New</button>} />);
    expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument();
  });
});