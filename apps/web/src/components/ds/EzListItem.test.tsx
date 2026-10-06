import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzListItem } from './EzListItem';

describe('EzListItem', () => {
  it('renders title and subtitle', () => {
    render(<EzListItem title="João Silva" subtitle="joao@email.com" />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<EzListItem title="Clicável" onClick={onClick} />);
    await user.click(screen.getByText('Clicável'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the selected highlight classes when selected is true', () => {
    const { container } = render(<EzListItem title="Selecionado" selected />);
    expect(container.firstChild).toHaveClass('bg-brand-50');
  });

  it('renders icon and rightContent when provided', () => {
    render(
      <EzListItem
        title="Com extras"
        icon={<span data-testid="icon">I</span>}
        rightContent={<span data-testid="right">R</span>}
      />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });
});
