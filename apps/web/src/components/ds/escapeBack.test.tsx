import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzModal } from './EzModal';
import { EzPageHeader } from './EzPageLayout';
import { EzSimpleBar } from './EzSimpleBar';

const esc = () => fireEvent.keyDown(document.body, { key: 'Escape' });

describe('AC-3: Esc aciona "Voltar" das telas', () => {
  it('EzPageHeader com botão Voltar', () => {
    const onBack = vi.fn();
    render(<EzPageHeader title="T" showBackButton onBack={onBack} />);
    esc();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('EzPageHeader sem botão Voltar não reage ao Esc', () => {
    const onBack = vi.fn();
    render(<EzPageHeader title="T" onBack={onBack} />);
    esc();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('EzSimpleBar com onBack', () => {
    const onBack = vi.fn();
    render(<EzSimpleBar title="T" onBack={onBack} />);
    esc();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('sobreposição aberta tem prioridade: Esc fecha o modal e não volta', () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    render(
      <>
        <EzPageHeader title="T" showBackButton onBack={onBack} />
        <EzModal isOpen onClose={onClose}>m</EzModal>
      </>
    );
    esc();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });
});
