import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EzSplitButton } from './EzSplitButton';

describe('EzSplitButton', () => {
  const actions = [
    { label: 'Duplicar', onClick: vi.fn() },
    { label: 'Excluir', onClick: vi.fn() },
  ];

  it('renders the main label', () => {
    render(<EzSplitButton label="Salvar" onClick={() => undefined} actions={actions} />);
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('calls onClick when the main button is clicked', async () => {
    const handleClick = vi.fn();
    render(<EzSplitButton label="Salvar" onClick={handleClick} actions={actions} />);
    await userEvent.click(screen.getByText('Salvar'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('opens the dropdown and fires an action click', async () => {
    const onDuplicate = vi.fn();
    render(
      <EzSplitButton
        label="Salvar"
        onClick={() => undefined}
        actions={[{ label: 'Duplicar', onClick: onDuplicate }]}
      />
    );
    await userEvent.click(screen.getByLabelText('Mais ações'));
    const item = screen.getByText('Duplicar');
    expect(item).toBeInTheDocument();
    await userEvent.click(item);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('applies the brand background class to the main button', () => {
    render(<EzSplitButton label="Salvar" onClick={() => undefined} actions={actions} />);
    expect(screen.getByText('Salvar')).toHaveClass('bg-brand-500');
  });
});
