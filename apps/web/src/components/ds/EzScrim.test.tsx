import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzScrim } from './EzScrim';

describe('EzScrim', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(<EzScrim visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a fixed full-screen overlay when visible is true', () => {
    const { container } = render(<EzScrim visible={true} />);
    expect(container.firstChild).toHaveClass('fixed', 'inset-0', 'bg-black/50');
  });

  it('calls onClick when the overlay is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<EzScrim visible={true} onClick={onClick} />);
    await user.click(container.firstChild as Element);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies a custom zIndex via inline style', () => {
    const { container } = render(<EzScrim visible={true} zIndex={70} />);
    expect((container.firstChild as HTMLElement).style.zIndex).toBe('70');
  });
});
