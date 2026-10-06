import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzPrintSelector } from './EzPrintSelector';

const OPTIONS = [
  { id: 'printer-1', label: 'Impressora Recepção' },
  { id: 'printer-2', label: 'Impressora Financeiro' },
  { id: 'printer-3', label: 'PDF (CutePDF Writer)' },
];

describe('EzPrintSelector', () => {
  it('renders every option as a selectable radio item', () => {
    render(<EzPrintSelector isOpen options={OPTIONS} onPrint={() => undefined} />);

    expect(screen.getByRole('radio', { name: 'Impressora Recepção' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Impressora Financeiro' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'PDF (CutePDF Writer)' })).toBeInTheDocument();
  });

  it('calls onPrint with the selected option id and remember=false by default', async () => {
    const onPrint = vi.fn();
    const user = userEvent.setup();
    render(<EzPrintSelector isOpen options={OPTIONS} onPrint={onPrint} />);

    await user.click(screen.getByRole('radio', { name: 'Impressora Financeiro' }));
    await user.click(screen.getByRole('button', { name: 'Imprimir' }));

    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(onPrint).toHaveBeenCalledWith('printer-2', false);
  });

  it('calls onPrint with remember=true when the "usar sempre esta seleção" checkbox is checked', async () => {
    const onPrint = vi.fn();
    const user = userEvent.setup();
    render(<EzPrintSelector isOpen options={OPTIONS} onPrint={onPrint} />);

    await user.click(screen.getByRole('radio', { name: 'PDF (CutePDF Writer)' }));
    await user.click(screen.getByRole('checkbox', { name: 'Usar sempre esta seleção' }));
    await user.click(screen.getByRole('button', { name: 'Imprimir' }));

    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(onPrint).toHaveBeenCalledWith('printer-3', true);
  });

  it('calls onCancel and does not call onPrint when clicking Cancelar', async () => {
    const onPrint = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<EzPrintSelector isOpen options={OPTIONS} onPrint={onPrint} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onPrint).not.toHaveBeenCalled();
  });

  it('pre-selects the first option by default', () => {
    const onPrint = vi.fn();
    render(<EzPrintSelector isOpen options={OPTIONS} onPrint={onPrint} />);
    expect(screen.getByRole('radio', { name: 'Impressora Recepção' })).toBeChecked();
  });

  it('disables the Imprimir button when there are no options', () => {
    const onPrint = vi.fn();
    render(<EzPrintSelector isOpen options={[]} onPrint={onPrint} />);
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled();
  });

  it('renders nothing when isOpen is false', () => {
    render(<EzPrintSelector isOpen={false} options={OPTIONS} onPrint={() => undefined} />);
    expect(screen.queryByText('Impressora Recepção')).not.toBeInTheDocument();
  });
});
