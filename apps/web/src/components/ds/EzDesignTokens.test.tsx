import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzDesignTokens } from './EzDesignTokens';

describe('EzDesignTokens', () => {
  it('documents the D6 control height scale (DMTE-427 fatia 1)', () => {
    render(<EzDesignTokens />);
    expect(screen.getByText(/42px/)).toBeInTheDocument();
    expect(screen.getByText(/32px/)).toBeInTheDocument();
  });

  it('documents the D6 radius and shadow tokens', () => {
    render(<EzDesignTokens />);
    expect(screen.getByText(/radius-control/)).toBeInTheDocument();
    expect(screen.getByText(/radius-card/)).toBeInTheDocument();
    expect(screen.getByText(/shadow-card/)).toBeInTheDocument();
    expect(screen.getByText(/shadow-popover/)).toBeInTheDocument();
  });

  it('renders each control height preview from its CSS variable', () => {
    render(<EzDesignTokens />);
    const preview = screen.getByText('Altura compacta de controle');
    expect(preview).toHaveStyle({ height: 'var(--control-height-compact)' });
    expect(screen.getByText('Altura padrão de controle')).toHaveStyle({
      height: 'var(--control-height-md)',
    });
  });
});
