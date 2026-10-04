import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzUpload, EzFileItem } from './EzUpload';

describe('EzUpload', () => {
  it('renders default label', () => {
    render(<EzUpload onChange={vi.fn()} />);
    expect(screen.getByText(/Arraste e solte arquivos aqui/i)).toBeInTheDocument();
  });

  it('renders error state and message', () => {
    render(<EzUpload onChange={vi.fn()} hasError message="File too large" />);
    expect(screen.getByText('File too large')).toBeInTheDocument();
    expect(screen.getByText(/Arraste e solte/i)).toHaveClass('text-red-700');
  });

  it('fires onChange with an array of files when uploading via file input', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<EzUpload onChange={mockOnChange} data-testid="upload" />);

    // In EzUpload, the input is hidden, so we select it via its type
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    
    await user.upload(input, file);
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const uploadedFiles = mockOnChange.mock.calls[0][0];
    expect(uploadedFiles).toHaveLength(1);
    expect(uploadedFiles[0].name).toBe('hello.png');
  });

  describe('EzFileItem', () => {
    it('renders file name and size in KB', () => {
      // 2048 bytes = 2.0 KB
      const file = new File(['x'.repeat(2048)], 'document.pdf', { type: 'application/pdf' });
      render(<EzFileItem file={file} />);
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('fires onRemove when close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnRemove = vi.fn();
      const file = new File(['data'], 'data.csv');
      
      render(<EzFileItem file={file} onRemove={mockOnRemove} />);
      
      // Accessibility title "Remover arquivo" is present on the button
      const removeBtn = screen.getByTitle('Remover arquivo');
      await user.click(removeBtn);
      
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it('does not render remove button if onRemove is omitted', () => {
      const file = new File(['data'], 'data.csv');
      render(<EzFileItem file={file} />);
      expect(screen.queryByTitle('Remover arquivo')).not.toBeInTheDocument();
    });
  });
});
