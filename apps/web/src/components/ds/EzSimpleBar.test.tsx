import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EzSimpleBar } from './EzSimpleBar';

describe('EzSimpleBar', () => {
  it('renders the title and optional subtitle', () => {
    render(<EzSimpleBar title="Título do header" subtitle="Subtítulo do header" />);
    expect(screen.getByText('Título do header')).toBeInTheDocument();
    expect(screen.getByText('Subtítulo do header')).toBeInTheDocument();
  });

  it('does not render a back button when onBack is not provided', () => {
    render(<EzSimpleBar title="Sem botão de voltar" />);
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
  });

  it('renders a back button and calls onBack when clicked', () => {
    const onBack = vi.fn();
    render(<EzSimpleBar title="Com botão de voltar" onBack={onBack} />);
    const button = screen.getByRole('button', { name: 'Voltar' });
    button.click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders custom actions content aligned to the right', () => {
    render(
      <EzSimpleBar title="Com ações">
        <button type="button">Ação personalizada</button>
      </EzSimpleBar>
    );
    expect(screen.getByRole('button', { name: 'Ação personalizada' })).toBeInTheDocument();
  });

  it('renders the actions prop as an alternative to children', () => {
    render(<EzSimpleBar title="Com prop actions" actions={<span>Conteúdo à direita</span>} />);
    expect(screen.getByText('Conteúdo à direita')).toBeInTheDocument();
  });

  it('renders breadcrumb items and fires onBreadcrumbItemClick', () => {
    const onBreadcrumbItemClick = vi.fn();
    const breadcrumbItems = [
      { id: 1, label: 'Tela principal' },
      { id: 2, label: 'Tela atual' },
    ];
    render(
      <EzSimpleBar
        title="Relatórios de Vendas"
        breadcrumbItems={breadcrumbItems}
        onBreadcrumbItemClick={onBreadcrumbItemClick}
      />
    );
    expect(screen.getByText('Tela principal')).toBeInTheDocument();
    expect(screen.getByText('Tela atual')).toBeInTheDocument();

    screen.getByText('Tela principal').click();
    expect(onBreadcrumbItemClick).toHaveBeenCalledTimes(1);
    expect(onBreadcrumbItemClick).toHaveBeenCalledWith(breadcrumbItems[0]);
  });

  it('applies the sticky positioning classes when sticky is true', () => {
    const { container } = render(<EzSimpleBar title="Fixo no topo" sticky />);
    expect(container.firstChild).toHaveClass('sticky');
    expect(container.firstChild).toHaveClass('top-0');
  });
});
