import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzFilterDrawer } from '../components/ds/EzFilterDrawer';
import { EzModal } from '../components/ds/EzModal';
import { useEscapeLayer } from './useEscapeLayer';

function Page({ onBack, children }: { onBack: () => void; children?: React.ReactNode }) {
  useEscapeLayer(onBack, true, 'page');
  return <div>{children ?? 'page'}</div>;
}

describe('revisão interna (rodada 2)', () => {
  it('sobreposição tem prioridade sobre "Voltar" mesmo se a tela montar depois', () => {
    const onClose = vi.fn();
    const onBack = vi.fn();
    render(
      <>
        <EzModal isOpen onClose={onClose}>m</EzModal>
        <Page onBack={onBack} />
      </>
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('"Voltar" de tela ignora Esc dentro de campo de texto', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<Page onBack={onBack}><textarea aria-label="comentário" /></Page>);
    await user.click(screen.getByLabelText('comentário'));
    await user.keyboard('{Escape}');
    expect(onBack).not.toHaveBeenCalled();
    await user.click(document.body);
    await user.keyboard('{Escape}');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('Esc no campo de nome do filtro salvo só cancela o salvamento e não fecha o painel', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EzFilterDrawer isOpen onClose={onClose} onSaveCurrentFilter={vi.fn()}>c</EzFilterDrawer>);
    await user.click(screen.getByTestId('ez-filter-drawer-save-btn'));
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('confirmação de descarte não reaparece ao reabrir o modal', () => {
    const { rerender } = render(<EzModal isOpen dirty onClose={vi.fn()}>f</EzModal>);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByText('Descartar alterações?')).toBeInTheDocument();
    rerender(<EzModal isOpen={false} dirty onClose={vi.fn()}>f</EzModal>);
    rerender(<EzModal isOpen dirty onClose={vi.fn()}>f</EzModal>);
    expect(screen.queryByText('Descartar alterações?')).not.toBeInTheDocument();
  });
});
