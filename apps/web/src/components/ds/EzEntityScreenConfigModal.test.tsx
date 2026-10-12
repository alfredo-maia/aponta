import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EzEntityScreenConfigModal } from './EzEntityScreenConfigModal';

describe('EzEntityScreenConfigModal', () => {
  const columns = [
    { id: 'protocol', label: 'Protocolo', isVisible: true },
    { id: 'title', label: 'Título', isVisible: true },
    { id: 'priority', label: 'Prioridade', isVisible: false },
  ];

  it('renders grid tab with columns and density selector by default', () => {
    render(
      <EzEntityScreenConfigModal
        columns={columns}
        onToggleColumn={vi.fn()}
        density="compact"
        onDensityChange={vi.fn()}
        formLayout="CASCADE"
        onFormLayoutChange={vi.fn()}
        onRestoreDefaults={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('ez-entity-screen-config-modal')).toBeInTheDocument();
    expect(screen.getByText('Protocolo')).toBeInTheDocument();
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Prioridade')).toBeInTheDocument();
    expect(screen.getByTestId('ez-config-density-compact')).toBeInTheDocument();
    expect(screen.getByTestId('ez-config-density-comfortable')).toBeInTheDocument();
  });

  it('toggles column visibility when checkbox clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <EzEntityScreenConfigModal
        columns={columns}
        onToggleColumn={onToggle}
        density="compact"
        onDensityChange={vi.fn()}
        formLayout="CASCADE"
        onFormLayoutChange={vi.fn()}
        onRestoreDefaults={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('ez-screen-config-toggle-protocol'));
    expect(onToggle).toHaveBeenCalledWith('protocol');
  });

  it('switches to form layout tab and changes form layout', async () => {
    const user = userEvent.setup();
    const onFormLayoutChange = vi.fn();

    render(
      <EzEntityScreenConfigModal
        columns={columns}
        onToggleColumn={vi.fn()}
        density="compact"
        onDensityChange={vi.fn()}
        formLayout="CASCADE"
        onFormLayoutChange={onFormLayoutChange}
        onRestoreDefaults={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Click tab "Modo Formulário (Layout)"
    await user.click(screen.getByText(/Modo Formulário/i));
    expect(screen.getByText('Distribuição dos Campos no Formulário')).toBeInTheDocument();

    // Click "Lado a lado"
    await user.click(screen.getByText('Lado a lado'));
    expect(onFormLayoutChange).toHaveBeenCalledWith('SIDE_BY_SIDE');
  });

  it('triggers onRestoreDefaults when button is clicked', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();

    render(
      <EzEntityScreenConfigModal
        columns={columns}
        onToggleColumn={vi.fn()}
        density="compact"
        onDensityChange={vi.fn()}
        formLayout="CASCADE"
        onFormLayoutChange={vi.fn()}
        onRestoreDefaults={onRestore}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('ez-screen-config-restore-defaults'));
    expect(onRestore).toHaveBeenCalled();
  });
});
