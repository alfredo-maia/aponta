import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzEntityScreenConfigModal } from './EzEntityScreenConfigModal';
import { EzFilterDrawer } from './EzFilterDrawer';
import { EzPopoverPlus } from './EzPopoverPlus';
import { EzPopup } from './EzPopup';

const esc = () => fireEvent.keyDown(document.body, { key: 'Escape' });

describe('AC-2: sobreposições do DS fecham com Esc', () => {
  it('EzPopup', () => {
    const onClose = vi.fn();
    render(<EzPopup trigger="t" open onClose={onClose}>c</EzPopup>);
    esc();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('EzPopoverPlus', () => {
    const onClose = vi.fn();
    render(<EzPopoverPlus trigger="t" open onClose={onClose}>c</EzPopoverPlus>);
    esc();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('EzFilterDrawer', () => {
    const onClose = vi.fn();
    render(<EzFilterDrawer isOpen onClose={onClose}>c</EzFilterDrawer>);
    esc();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('EzEntityScreenConfigModal', () => {
    const onClose = vi.fn();
    render(
      <EzEntityScreenConfigModal
        columns={[]}
        onToggleColumn={vi.fn()}
        density="compact"
        onDensityChange={vi.fn()}
        formLayout="CASCADE"
        onFormLayoutChange={vi.fn()}
        onRestoreDefaults={vi.fn()}
        onClose={onClose}
      />
    );
    esc();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ez-entity-screen-config-modal')).toBeInTheDocument();
  });

  it('só a camada do topo fecha: drawer sobre popup', () => {
    const closeDrawer = vi.fn();
    const closePopup = vi.fn();
    render(
      <>
        <EzPopup trigger="t" open onClose={closePopup}>c</EzPopup>
        <EzFilterDrawer isOpen onClose={closeDrawer}>c</EzFilterDrawer>
      </>
    );
    esc();
    expect(closeDrawer).toHaveBeenCalledTimes(1);
    expect(closePopup).not.toHaveBeenCalled();
  });
});

describe('AC-8: sem listener de Esc próprio', () => {
  it.each([
    'components/ds/EzEntityGrid.tsx',
    'components/ds/EzModal.tsx',
    'components/layout/AppLayout.tsx',
    'pages/VaultPage.tsx',
  ])('%s usa só o mecanismo único', (file) => {
    const src = readFileSync(resolve(__dirname, '../..', file), 'utf8');
    expect(src).not.toMatch(/key === 'Escape'/);
    expect(src).toMatch(/useEscapeLayer/);
  });
});
