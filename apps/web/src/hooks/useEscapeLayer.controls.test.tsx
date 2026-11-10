import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzModal } from '../components/ds/EzModal';

// Controles que não editam texto não seguram o Esc: um toque fecha a sobreposição.
describe('AC-4: Esc com foco em controle que não é campo de texto', () => {
  it.each(['checkbox', 'radio', 'range', 'file'])('input %s: um Esc fecha o modal', async (type) => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen onClose={onClose}><input type={type} aria-label="controle" /></EzModal>);
    screen.getByLabelText('controle').focus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('input type=text continua saindo do campo no primeiro Esc', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen onClose={onClose}><input type="email" aria-label="controle" /></EzModal>);
    await user.click(screen.getByLabelText('controle'));
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
