import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EzUnderface } from './EzUnderface';

describe('EzUnderface', () => {
  it('renders its children', () => {
    render(
      <EzUnderface>
        <span>Seção agrupada</span>
      </EzUnderface>
    );
    expect(screen.getByText('Seção agrupada')).toBeInTheDocument();
  });

  it('applies the default subtle background and border classes', () => {
    const { container } = render(<EzUnderface>Conteúdo</EzUnderface>);
    expect(container.firstChild).toHaveClass('bg-gray-80');
    expect(container.firstChild).toHaveClass('border-gray-100');
  });

  it('merges a custom className without losing the base classes', () => {
    const { container } = render(<EzUnderface className="mt-4">Conteúdo</EzUnderface>);
    expect(container.firstChild).toHaveClass('mt-4');
    expect(container.firstChild).toHaveClass('rounded-[12px]');
  });
});
