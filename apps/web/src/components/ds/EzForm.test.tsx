import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzForm } from './EzForm';

describe('EzForm', () => {
  it('renders children', () => {
    render(
      <EzForm>
        <span>Campo</span>
      </EzForm>
    );
    expect(screen.getByText('Campo')).toBeInTheDocument();
  });

  it('calls onSubmit when submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <EzForm onSubmit={onSubmit} data-testid="form">
        <button type="submit">Enviar</button>
      </EzForm>
    );
    fireEvent.submit(screen.getByTestId('form'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('applies base layout classes', () => {
    render(<EzForm data-testid="form" />);
    expect(screen.getByTestId('form')).toHaveClass('rounded-[24px]');
  });
});
