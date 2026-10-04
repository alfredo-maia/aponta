import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzTooltip } from './EzTooltip';

describe('EzTooltip', () => {
  it('renders the wrapped child element', () => {
    render(
      <EzTooltip content="Tooltip message">
        <button>Hover me</button>
      </EzTooltip>
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('renders the content visibly on hover based on group-hover class', () => {
    const { container } = render(
      <EzTooltip content="Tooltip message">
        <button>Hover me</button>
      </EzTooltip>
    );
    
    // The tooltip's inner element is present and has the content
    expect(screen.getByText('Tooltip message')).toBeInTheDocument();
    // The inner container has opacity-0 initially and group-hover:opacity-100
    const tipContainer = container.querySelector('.group-hover\\:opacity-100');
    expect(tipContainer).toBeInTheDocument();
  });

  it('applies position classes (e.g. bottom)', () => {
    render(
      <EzTooltip content="Bottom relative" position="bottom" />
    );
    // Looking for a class partial used in bottom position
    const tipContainer = screen.getByText('Bottom relative').closest('div');
    expect(tipContainer).toHaveClass('top-full');
  });

  it('applies transition delay via style', () => {
    render(<EzTooltip content="Delay Tip" delay={500} />);
    const tipContainer = screen.getByText('Delay Tip').closest('div');
    expect(tipContainer).not.toBeNull();
    expect(tipContainer?.style.transitionDelay).toBe('500ms');
  });
});
