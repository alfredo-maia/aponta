import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzDialog } from './EzDialog';

describe('EzDialog', () => {
  it('renders nothing when closed', () => {
    render(<EzDialog open={false} title="T" message="M" onConfirm={() => undefined} onCancel={() => undefined} />);
    expect(screen.queryByText('T')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(<EzDialog open title="Excluir" message="Tem certeza?" onConfirm={onConfirm} onCancel={() => undefined} />);
    fireEvent.click(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('applies danger icon color class', () => {
    render(
      <EzDialog open title="Excluir" message="M" variant="danger" onConfirm={() => undefined} onCancel={() => undefined} />
    );
    expect(document.body.querySelector('svg')).toHaveClass('text-red-600');
  });
});
