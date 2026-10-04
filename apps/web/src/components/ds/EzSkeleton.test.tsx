import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzSkeleton } from './EzSkeleton';

describe('EzSkeleton', () => {
  it('renders default text variant with text-shape classes', () => {
    const { container } = render(<EzSkeleton />);
    expect(container.firstChild).toHaveClass('rounded-md', 'h-4', 'w-full');
  });

  it('renders circular variant with circular-shape classes', () => {
    const { container } = render(<EzSkeleton variant="circular" />);
    expect(container.firstChild).toHaveClass('rounded-full', 'h-10', 'w-10');
  });

  it('renders rectangular variant with rectangular-shape classes', () => {
    const { container } = render(<EzSkeleton variant="rectangular" />);
    expect(container.firstChild).toHaveClass('rounded-xl', 'h-24', 'w-full');
  });

  it('applies explicit width and height as inline styles', () => {
    const { container } = render(<EzSkeleton width={120} height={40} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('40px');
  });

  it('accepts custom classes', () => {
    const { container } = render(<EzSkeleton className="my-custom-class" />);
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});
