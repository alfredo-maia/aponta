import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzTaskbar } from './EzTaskbar';

describe('EzTaskbar', () => {
  const baseButtons = ['PREVIOUS', 'NEXT', 'DIVIDER', 'CLONE', 'REMOVE', 'INSERT'];

  it('renders a button for each entry in the buttons prop', () => {
    render(<EzTaskbar buttons={baseButtons} onAction={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duplicar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incluir' })).toBeInTheDocument();
  });

  it('fires onAction with the correct button identifier on click', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<EzTaskbar buttons={baseButtons} onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('REMOVE');
  });

  it('renders DIVIDER as a non-interactive separator', () => {
    const onAction = vi.fn();
    render(<EzTaskbar buttons={baseButtons} onAction={onAction} />);

    const separator = screen.getByRole('separator');
    expect(separator).toBeInTheDocument();
    expect(separator.tagName).not.toBe('BUTTON');
  });

  it('opens a dropdown with actionsList items when MORE_OPTIONS is clicked', async () => {
    const onOption1 = vi.fn();
    const onOption2 = vi.fn();
    const actionsList = [
      { label: 'Opção 1', onClick: onOption1 },
      { label: 'Opção 2', onClick: onOption2 },
    ];
    const user = userEvent.setup();
    render(
      <EzTaskbar
        buttons={['PREVIOUS', 'MORE_OPTIONS']}
        onAction={() => undefined}
        actionsList={actionsList}
      />
    );

    expect(screen.queryByText('Opção 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mais opções' }));

    expect(screen.getByText('Opção 1')).toBeInTheDocument();
    expect(screen.getByText('Opção 2')).toBeInTheDocument();

    await user.click(screen.getByText('Opção 1'));
    expect(onOption1).toHaveBeenCalledTimes(1);
    expect(onOption2).not.toHaveBeenCalled();
    expect(screen.queryByText('Opção 1')).not.toBeInTheDocument();
  });

  it('disables buttons listed in disabledButtons and does not fire onAction', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <EzTaskbar
        buttons={baseButtons}
        onAction={onAction}
        disabledButtons={['REMOVE']}
      />
    );

    const removeButton = screen.getByRole('button', { name: 'Excluir' });
    expect(removeButton).toBeDisabled();

    await user.click(removeButton);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('applies primary styling to the button matching primaryButton', () => {
    render(
      <EzTaskbar buttons={baseButtons} onAction={() => undefined} primaryButton="INSERT" />
    );

    expect(screen.getByRole('button', { name: 'Incluir' })).toHaveClass('bg-brand-500');
    expect(screen.getByRole('button', { name: 'Anterior' })).not.toHaveClass('bg-brand-500');
  });

  it('aligns the buttons to the right when alignRight is true', () => {
    const { container } = render(
      <EzTaskbar buttons={baseButtons} onAction={() => undefined} alignRight />
    );
    expect(container.firstChild).toHaveClass('justify-end');
  });
});
