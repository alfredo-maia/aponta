import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzModal } from '../components/ds/EzModal';
import { useEscapeLayer } from './useEscapeLayer';

// Valor-base do cancelamento por Esc (AC-4): campos com autoFocus, select que grava no onChange e valor já confirmado.
describe('AC-4: valor-base do cancelamento por Esc', () => {
  it('campo com autoFocus no mesmo commit da camada (como no VaultPage) também volta ao valor original', async () => {
    function Overlay() {
      useEscapeLayer(() => undefined);
      return <input aria-label="nome" autoFocus defaultValue="original" />;
    }
    const user = userEvent.setup();
    render(<Overlay />);
    const field = screen.getByLabelText('nome');
    expect(field).toHaveFocus();
    await user.type(field, 'XYZ');
    await user.keyboard('{Escape}');
    expect(field).toHaveValue('original');
  });

  it('select que grava no onChange não é regravado pelo Esc', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <EzModal isOpen onClose={vi.fn()}>
        <select aria-label="status" defaultValue="a" onChange={onChange}>
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      </EzModal>
    );
    const field = screen.getByLabelText('status');
    await user.selectOptions(field, 'b');
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(field).toHaveValue('b');
  });

  it('valor já confirmado (evento change) vira o novo valor-base', async () => {
    const user = userEvent.setup();
    render(<EzModal isOpen onClose={vi.fn()}><input aria-label="campo" defaultValue="a" /></EzModal>);
    const field = screen.getByLabelText('campo');
    await user.click(field);
    await user.type(field, 'b');
    fireEvent.change(field, { target: { value: 'ab' } });
    fireEvent(field, new Event('change', { bubbles: true }));
    await user.type(field, 'c');
    await user.keyboard('{Escape}');
    expect(field).toHaveValue('ab');
  });
});
