import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzDataExporter } from './EzDataExporter';

describe('EzDataExporter', () => {
  it('does not render the modal content when isOpen is false', () => {
    render(<EzDataExporter isOpen={false} onClose={vi.fn()} onExport={vi.fn()} />);
    expect(screen.queryByText('Exportar dados')).not.toBeInTheDocument();
  });

  it('opens the modal and lists the available formats and scopes', () => {
    render(
      <EzDataExporter
        isOpen={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        formats={['csv', 'xlsx', 'pdf']}
        scopes={[
          { value: 'selected', label: 'Selecionados' },
          { value: 'page', label: 'Página atual' },
          { value: 'all', label: 'Todos os registros' },
        ]}
      />
    );
    expect(screen.getByText('Exportar dados')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('XLSX')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Selecionados')).toBeInTheDocument();
    expect(screen.getByText('Página atual')).toBeInTheDocument();
    expect(screen.getByText('Todos os registros')).toBeInTheDocument();
  });

  it('selects a format by clicking its option', async () => {
    const user = userEvent.setup();
    render(
      <EzDataExporter
        isOpen={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        formats={['csv', 'xlsx']}
      />
    );

    const xlsxOption = screen.getByRole('radio', { name: 'XLSX' });
    expect(xlsxOption).not.toBeChecked();

    await user.click(xlsxOption);
    expect(xlsxOption).toBeChecked();
  });

  it('calls onExport with the selected format and scope when confirming', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn().mockResolvedValue(undefined);
    render(
      <EzDataExporter
        isOpen={true}
        onClose={vi.fn()}
        onExport={onExport}
        formats={['csv', 'xlsx']}
        scopes={[
          { value: 'page', label: 'Página atual' },
          { value: 'all', label: 'Todos os registros' },
        ]}
      />
    );

    await user.click(screen.getByRole('radio', { name: 'XLSX' }));
    await user.click(screen.getByRole('radio', { name: 'Todos os registros' }));
    await user.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledWith('xlsx', 'all');
  });

  it('shows a loading state while an async export is running, then success', async () => {
    const user = userEvent.setup();
    let resolveExport: () => void = () => undefined;
    const onExport = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveExport = resolve;
        })
    );

    render(
      <EzDataExporter
        isOpen={true}
        onClose={vi.fn()}
        onExport={onExport}
        formats={['csv']}
        scopes={[{ value: 'all', label: 'Todos os registros' }]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(screen.getByText(/exportando/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled();

    resolveExport();

    await waitFor(() => {
      expect(screen.getByText(/exportação concluída/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/exportando/i)).not.toBeInTheDocument();
  });

  it('shows an error message when onExport rejects', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn().mockRejectedValue(new Error('falhou'));

    render(
      <EzDataExporter
        isOpen={true}
        onClose={vi.fn()}
        onExport={onExport}
        formats={['csv']}
        scopes={[{ value: 'all', label: 'Todos os registros' }]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Exportar' }));

    await waitFor(() => {
      expect(screen.getByText(/erro ao exportar/i)).toBeInTheDocument();
    });
  });

  it('defaults to the first format and first scope when none is selected', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn().mockResolvedValue(undefined);
    render(
      <EzDataExporter
        isOpen={true}
        onClose={vi.fn()}
        onExport={onExport}
        formats={['pdf', 'csv']}
        scopes={[
          { value: 'selected', label: 'Selecionados' },
          { value: 'all', label: 'Todos os registros' },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(onExport).toHaveBeenCalledWith('pdf', 'selected');
  });

  it('shows selected and total counts when provided', () => {
    render(
      <EzDataExporter
        isOpen={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
        selectedCount={3}
        totalCount={120}
        scopes={[
          { value: 'selected', label: 'Selecionados' },
          { value: 'all', label: 'Todos os registros' },
        ]}
      />
    );
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it('calls onClose when the modal close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EzDataExporter isOpen={true} onClose={onClose} onExport={vi.fn()} />);

    await user.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
