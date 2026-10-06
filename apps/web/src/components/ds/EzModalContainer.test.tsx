import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzModalContainer } from './EzModalContainer';

describe('EzModalContainer', () => {
  it('renders title, children and footer', () => {
    render(
      <EzModalContainer title="Meu Título" onClose={vi.fn()} footer={<button>Salvar</button>}>
        Conteúdo do modal
      </EzModalContainer>
    );
    expect(screen.getByText('Meu Título')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument();
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EzModalContainer title="Título" onClose={onClose}>Conteúdo</EzModalContainer>);
    await user.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render footer area when footer is omitted', () => {
    render(<EzModalContainer title="Título" onClose={vi.fn()}>Conteúdo</EzModalContainer>);
    expect(screen.queryByText('Salvar')).not.toBeInTheDocument();
  });

  it('applies rounded white container classes', () => {
    const { container } = render(
      <EzModalContainer title="Título" onClose={vi.fn()}>Conteúdo</EzModalContainer>
    );
    expect(container.firstChild).toHaveClass('bg-white', 'rounded-[24px]');
  });
});
