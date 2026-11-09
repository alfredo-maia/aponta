import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EzModal } from '../components/ds/EzModal';
import { EzTextEdit } from '../components/ds/EzTextEdit';
import { useEscapeLayer } from './useEscapeLayer';

function Layer({ name, onEscape, active = true }: { name: string; onEscape: () => void; active?: boolean }) {
  useEscapeLayer(onEscape, active);
  return <div>{name}</div>;
}

const esc = (init: KeyboardEventInit = {}) => fireEvent.keyDown(document.body, { key: 'Escape', ...init });

describe('useEscapeLayer', () => {
  it('AC-1: Esc age só na camada do topo, uma por vez', () => {
    const bottom = vi.fn();
    const top = vi.fn();
    render(<><Layer name="b" onEscape={bottom} /><Layer name="t" onEscape={top} /></>);
    esc();
    expect(top).toHaveBeenCalledTimes(1);
    expect(bottom).not.toHaveBeenCalled();
  });

  it('camada inativa não recebe Esc', () => {
    const fn = vi.fn();
    render(<Layer name="x" onEscape={fn} active={false} />);
    esc();
    expect(fn).not.toHaveBeenCalled();
  });

  it('AC-6: ignora defaultPrevented, IME e modificadores', () => {
    const fn = vi.fn();
    render(<Layer name="x" onEscape={fn} />);
    esc({ ctrlKey: true });
    esc({ shiftKey: true });
    esc({ isComposing: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it('AC-4: Esc em campo em edição só cancela a edição e não fecha o modal', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <EzModal isOpen onClose={onClose}>
        <EzTextEdit value="Titulo" onSave={vi.fn()} />
      </EzModal>
    );
    await user.click(screen.getByText('Titulo'));
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('EzModal + Esc', () => {
  it('AC-1: Esc fecha só o modal do topo', () => {
    const closeA = vi.fn();
    const closeB = vi.fn();
    render(<><EzModal isOpen onClose={closeA}>A</EzModal><EzModal isOpen onClose={closeB}>B</EzModal></>);
    esc();
    expect(closeB).toHaveBeenCalledTimes(1);
    expect(closeA).not.toHaveBeenCalled();
  });

  it('AC-5: com alterações não salvas, Esc pede confirmação; Esc na confirmação mantém a edição', async () => {
    const onClose = vi.fn();
    render(<EzModal isOpen dirty onClose={onClose}>Form</EzModal>);
    esc();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Descartar alterações?')).toBeInTheDocument();
    esc();
    expect(screen.queryByText('Descartar alterações?')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    esc();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-7: devolve o foco ao gatilho ao fechar', async () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>abrir</button>
          <EzModal isOpen={open} onClose={() => setOpen(false)}>conteudo</EzModal>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Host />);
    const trigger = screen.getByRole('button', { name: 'abrir' });
    await user.click(trigger);
    esc();
    expect(screen.queryByText('conteudo')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
