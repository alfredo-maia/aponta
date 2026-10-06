import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzActionsButton } from './EzActionsButton';

describe('EzActionsButton', () => {
  const defaultActions = [
    { label: 'Editar', onClick: vi.fn() },
    { label: 'Duplicar', onClick: vi.fn() },
    { label: 'Excluir', onClick: vi.fn(), danger: true },
  ];

  it('renders the trigger label and keeps actions hidden by default', () => {
    render(<EzActionsButton label="Ações" actions={defaultActions} />);
    expect(screen.getByText('Ações')).toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('opens the dropdown and lists all secondary actions on click', async () => {
    const user = userEvent.setup();
    render(<EzActionsButton label="Ações" actions={defaultActions} />);

    await user.click(screen.getByText('Ações'));

    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Duplicar')).toBeInTheDocument();
    expect(screen.getByText('Excluir')).toBeInTheDocument();
  });

  it('calls onClick and closes the menu when an action is selected', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<EzActionsButton label="Ações" actions={[{ label: 'Editar', onClick }]} />);

    await user.click(screen.getByText('Ações'));
    await user.click(screen.getByText('Editar'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('applies danger styling to destructive actions', async () => {
    const user = userEvent.setup();
    render(<EzActionsButton label="Ações" actions={defaultActions} />);

    await user.click(screen.getByText('Ações'));
    expect(screen.getByText('Excluir').closest('button')).toHaveClass('text-red-700');
  });
});
