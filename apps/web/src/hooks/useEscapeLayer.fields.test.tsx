import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzModal } from '../components/ds/EzModal';

// AC-4 (achado do QA): em campo de texto dentro de sobreposição, Esc só sai da edição.
describe('AC-4: Esc em campo de texto dentro de sobreposição', () => {
  it.each([
    ['input', <input key="i" aria-label="campo" />],
    ['textarea', <textarea key="t" aria-label="campo" />],
    ['select', <select key="s" aria-label="campo"><option>a</option></select>],
  ])('%s: o primeiro Esc sai do campo sem fechar; o segundo fecha', async (_name, field) => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen onClose={onClose}>{field}</EzModal>);
    const el = screen.getByLabelText('campo');
    await user.click(el);
    expect(el).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(el).not.toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('com o foco fora de campo, Esc continua fechando o modal', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen onClose={onClose}>conteudo</EzModal>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
