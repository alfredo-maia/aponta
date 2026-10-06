import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EzAlertList } from './EzAlertList';

describe('EzAlertList', () => {
  const items = [
    { id: 1, variant: 'success' as const, message: 'Operação concluída' },
    { id: 2, variant: 'error' as const, message: 'Falha ao salvar' },
    { id: 3, variant: 'info' as const, message: 'Informação útil' },
  ];

  it('renders every alert message in the list', () => {
    render(<EzAlertList items={items} />);
    expect(screen.getByText('Operação concluída')).toBeInTheDocument();
    expect(screen.getByText('Falha ao salvar')).toBeInTheDocument();
    expect(screen.getByText('Informação útil')).toBeInTheDocument();
  });

  it('applies the correct variant classes to each alert', () => {
    render(<EzAlertList items={items} />);
    const alerts = screen.getAllByRole('alert');
    expect(alerts[0]).toHaveClass('bg-green-100');
    expect(alerts[1]).toHaveClass('bg-red-100');
    expect(alerts[2]).toHaveClass('bg-petroleum-100');
  });

  it('calls onDismiss with the correct id when closing an alert', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<EzAlertList items={items} onDismiss={onDismiss} />);

    const closeButtons = screen.getAllByRole('button', { name: 'Fechar' });
    await user.click(closeButtons[1]);

    expect(onDismiss).toHaveBeenCalledWith(2);
  });

  it('renders nothing when items is empty', () => {
    render(<EzAlertList items={[]} />);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
});
