import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzAvatar } from './EzAvatar';

describe('EzAvatar', () => {
  it('renders initials based on full name', () => {
    // "João Silva" -> "JS"
    render(<EzAvatar name="João Silva" />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders single initial if only one name is provided', () => {
    render(<EzAvatar name="Admin" />);
    expect(screen.getByText('AD')).toBeInTheDocument(); // Code takes first 2 chars
  });

  it('renders question mark if no name provided', () => {
    render(<EzAvatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders image if src is provided', () => {
    const { container } = render(<EzAvatar name="User" src="http://example.com/img.jpg" />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'http://example.com/img.jpg');
  });

  it('applies square classes when shape is square', () => {
    const { container } = render(<EzAvatar shape="square" />);
    expect(container.firstChild).toHaveClass('rounded-lg');
    expect(container.firstChild).not.toHaveClass('rounded-full');
  });
});