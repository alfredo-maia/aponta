import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EzCollapsibleBox } from './EzCollapsibleBox';

describe('EzCollapsibleBox', () => {
  it('renders the title and keeps content collapsed by default', () => {
    render(
      <EzCollapsibleBox title="Detalhes">
        <p>Conteúdo escondido</p>
      </EzCollapsibleBox>
    );
    expect(screen.getByText('Detalhes')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo escondido')).not.toBeInTheDocument();
  });

  it('expands content when the header is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EzCollapsibleBox title="Detalhes">
        <p>Conteúdo escondido</p>
      </EzCollapsibleBox>
    );

    await user.click(screen.getByText('Detalhes'));
    expect(screen.getByText('Conteúdo escondido')).toBeInTheDocument();
  });

  it('collapses content again on a second click', async () => {
    const user = userEvent.setup();
    render(
      <EzCollapsibleBox title="Detalhes">
        <p>Conteúdo escondido</p>
      </EzCollapsibleBox>
    );

    const header = screen.getByText('Detalhes');
    await user.click(header);
    expect(screen.getByText('Conteúdo escondido')).toBeInTheDocument();

    await user.click(header);
    expect(screen.queryByText('Conteúdo escondido')).not.toBeInTheDocument();
  });

  it('renders expanded by default when defaultOpen is true and sets aria-expanded', () => {
    render(
      <EzCollapsibleBox title="Detalhes" defaultOpen>
        <p>Conteúdo visível</p>
      </EzCollapsibleBox>
    );
    expect(screen.getByText('Conteúdo visível')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detalhes' })).toHaveAttribute('aria-expanded', 'true');
  });
});
