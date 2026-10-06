import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzSplitPanel } from './EzSplitPanel';

describe('EzSplitPanel', () => {
  it('renders both left and right content', () => {
    render(<EzSplitPanel left={<div>Esquerda</div>} right={<div>Direita</div>} />);
    expect(screen.getByText('Esquerda')).toBeInTheDocument();
    expect(screen.getByText('Direita')).toBeInTheDocument();
  });

  it('applies the default 50% split width to both panels', () => {
    render(<EzSplitPanel left={<div>Esquerda</div>} right={<div>Direita</div>} />);
    expect(screen.getByTestId('split-panel-left')).toHaveStyle({ width: '50%' });
    expect(screen.getByTestId('split-panel-right')).toHaveStyle({ width: '50%' });
  });

  it('respects a custom defaultSplit percentage', () => {
    render(
      <EzSplitPanel left={<div>Esquerda</div>} right={<div>Direita</div>} defaultSplit={30} />
    );
    expect(screen.getByTestId('split-panel-left')).toHaveStyle({ width: '30%' });
    expect(screen.getByTestId('split-panel-right')).toHaveStyle({ width: '70%' });
  });

  it('renders the resizable divider with the col-resize cursor class', () => {
    render(<EzSplitPanel left={<div>Esquerda</div>} right={<div>Direita</div>} />);
    expect(screen.getByTestId('split-panel-divider')).toHaveClass('cursor-col-resize');
  });
});
