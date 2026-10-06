import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzAttachmentList } from './EzAttachmentList';

const attachments = [
  { id: '1', name: 'contrato.pdf', size: 204800, url: 'https://example.com/contrato.pdf' },
  { id: '2', name: 'planilha.xlsx', size: 1048576 },
  { id: '3', name: 'foto.png' },
];

describe('EzAttachmentList', () => {
  it('renders the list of attachments with name and formatted size', () => {
    render(<EzAttachmentList attachments={attachments} />);

    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('planilha.xlsx')).toBeInTheDocument();
    expect(screen.getByText('foto.png')).toBeInTheDocument();
    expect(screen.getByText('200 KB')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });

  it('calls onRemove with the correct attachment id when the remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<EzAttachmentList attachments={attachments} onRemove={onRemove} />);

    const removeButtons = screen.getAllByLabelText('Remover anexo');
    fireEvent.click(removeButtons[1]);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('2');
  });

  it('calls onDownload with the correct attachment id when the download button is clicked', () => {
    const onDownload = vi.fn();
    render(<EzAttachmentList attachments={attachments} onDownload={onDownload} />);

    const downloadButtons = screen.getAllByLabelText('Baixar anexo');
    fireEvent.click(downloadButtons[0]);

    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledWith('1');
  });

  it('calls onView with the correct attachment id when the view button is clicked', () => {
    const onView = vi.fn();
    render(<EzAttachmentList attachments={attachments} onView={onView} />);

    const viewButtons = screen.getAllByLabelText('Visualizar anexo');
    fireEvent.click(viewButtons[2]);

    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith('3');
  });

  it('does not render action buttons when their callbacks are omitted', () => {
    render(<EzAttachmentList attachments={attachments} />);

    expect(screen.queryByLabelText('Remover anexo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Baixar anexo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Visualizar anexo')).not.toBeInTheDocument();
  });

  it('renders the add dropzone and calls onAdd with the selected files', async () => {
    const onAdd = vi.fn();
    render(<EzAttachmentList attachments={attachments} onAdd={onAdd} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const file = new File(['conteudo'], 'novo-anexo.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0][0].name).toBe('novo-anexo.pdf');
  });

  it('does not render the add dropzone when onAdd is omitted', () => {
    render(<EzAttachmentList attachments={attachments} />);
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });

  it('renders an empty state message when there are no attachments', () => {
    render(<EzAttachmentList attachments={[]} />);
    expect(screen.getByText(/nenhum anexo/i)).toBeInTheDocument();
  });
});
