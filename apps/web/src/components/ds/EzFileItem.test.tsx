import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzFileItem } from './EzFileItem';

describe('EzFileItem', () => {
  it('renders file name and size', () => {
    render(<EzFileItem fileName="contrato.pdf" fileSize="1.2 MB" />);
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.2 MB')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', () => {
    const onRemove = vi.fn();
    render(<EzFileItem fileName="a.txt" onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remover'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('does not render download button when onDownload is omitted', () => {
    render(<EzFileItem fileName="a.txt" />);
    expect(screen.queryByLabelText('Baixar')).not.toBeInTheDocument();
  });
});
