import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EzModal } from '../components/ds/EzModal';
import { EzPageHeader } from '../components/ds/EzPageLayout';

// Achado do QA: Esc tira o foco do campo, e campo que grava no blur salvaria a edição.
// "Cancela a edição" (SPEC) = o campo volta ao valor que tinha ao receber o foco, antes de perder o foco.
describe('AC-4: Esc cancela a edição de verdade', () => {
  it('campo que grava no blur (padrão da tela Clientes) não grava o texto digitado', async () => {
    const mutate = vi.fn();
    const original = 'Acme Ltda';
    const user = userEvent.setup();
    render(
      <>
        <EzPageHeader title="Cliente" showBackButton onBack={vi.fn()} />
        <input
          aria-label="Razão Social"
          defaultValue={original}
          onBlur={(e) => { if (e.target.value !== original) mutate({ legalName: e.target.value }); }}
        />
      </>
    );
    const field = screen.getByLabelText('Razão Social');
    await user.click(field);
    await user.type(field, ' EDITADO');
    expect(field).toHaveValue('Acme Ltda EDITADO');
    await user.keyboard('{Escape}');
    expect(field).toHaveValue(original);
    expect(field).not.toHaveFocus();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('campo controlado dentro de modal volta ao valor original e não fecha no primeiro Esc', async () => {
    const onClose = vi.fn();
    function Form() {
      const [v, setV] = useState('original');
      return <input aria-label="nome" value={v} onChange={(e) => setV(e.target.value)} />;
    }
    const user = userEvent.setup();
    render(<EzModal isOpen onClose={onClose}><Form /></EzModal>);
    const field = screen.getByLabelText('nome');
    await user.click(field);
    await user.type(field, '123');
    await user.keyboard('{Escape}');
    expect(field).toHaveValue('original');
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('textarea volta ao valor original', async () => {
    const user = userEvent.setup();
    render(<EzModal isOpen onClose={vi.fn()}><textarea aria-label="obs" defaultValue="abc" /></EzModal>);
    const field = screen.getByLabelText('obs');
    await user.click(field);
    await user.type(field, 'def');
    await user.keyboard('{Escape}');
    expect(field).toHaveValue('abc');
  });

  it('campo sem alteração não dispara onChange ao sair com Esc', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EzModal isOpen onClose={vi.fn()}><input aria-label="x" defaultValue="a" onChange={onChange} /></EzModal>);
    await user.click(screen.getByLabelText('x'));
    await user.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
  });
});
