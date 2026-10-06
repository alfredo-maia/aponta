import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzScroller } from './EzScroller';

describe('EzScroller', () => {
  it('renders children', () => {
    render(
      <EzScroller>
        <div>Item longo de lista</div>
      </EzScroller>
    );
    expect(screen.getByText('Item longo de lista')).toBeInTheDocument();
  });

  it('applies overflow-y-auto for scrolling', () => {
    const { container } = render(<EzScroller>Conteúdo</EzScroller>);
    expect(container.firstChild).toHaveClass('overflow-y-auto');
  });

  it('applies maxHeight as px when given a number', () => {
    const { container } = render(<EzScroller maxHeight={240}>Conteúdo</EzScroller>);
    expect((container.firstChild as HTMLElement).style.maxHeight).toBe('240px');
  });

  it('applies maxHeight as-is when given a string', () => {
    const { container } = render(<EzScroller maxHeight="50vh">Conteúdo</EzScroller>);
    expect((container.firstChild as HTMLElement).style.maxHeight).toBe('50vh');
  });
});
