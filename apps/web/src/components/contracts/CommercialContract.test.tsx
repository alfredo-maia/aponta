import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContractForm, ContractDetail } from './ContractViews';

describe('commercial contract setup', () => {
  const organizations = [
    {
      id: 'org',
      name: 'Empresa',
      serviceDesks: [{ id: 'desk', name: 'Desenvolvimento' }],
    },
  ];
  it('approves a monthly contract with explicit zero allowance and zero fee', () => {
    const save = vi.fn();
    render(<ContractForm organizations={organizations} onSave={save} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Empresa/), { target: { value: 'org' } });
    fireEvent.change(screen.getByLabelText('Modalidade'), { target: { value: 'MONTHLY_HOURS' } });
    fireEvent.change(screen.getByLabelText('Franquia mensal (horas)'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Valor mensal (R$)'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Hora excedente (R$)'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Início da vigência'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByLabelText('Desenvolvimento'));
    fireEvent.click(screen.getByLabelText('Condições comerciais aprovadas'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar contrato' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: 'MONTHLY_HOURS', approved: true, includedMinutes: 0, monthlyFeeCents: 0, excessHourlyRateCents: 12000 }));
  });
  it('blocks approval without explicit desk coverage and commercial terms', () => {
    const save = vi.fn();
    render(
      <ContractForm
        organizations={organizations}
        onSave={save}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Empresa/), {
      target: { value: 'org' },
    });
    fireEvent.change(screen.getByLabelText('Modalidade'), {
      target: { value: 'HOURLY' },
    });
    fireEvent.click(screen.getByLabelText('Condições comerciais aprovadas'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar contrato' }));
    expect(
      screen.getByText(/Para aprovar, escolha uma modalidade atual/),
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
  it('saves fixed-project scope, total estimate and explicit desks without a monthly allowance', () => {
    const save = vi.fn();
    render(
      <ContractForm
        organizations={organizations}
        onSave={save}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Empresa/), {
      target: { value: 'org' },
    });
    fireEvent.change(screen.getByLabelText('Modalidade'), {
      target: { value: 'FIXED_PROJECT' },
    });
    fireEvent.change(screen.getByLabelText('Escopo aprovado'), {
      target: { value: 'API de integração' },
    });
    fireEvent.change(screen.getByLabelText('Preço fechado (R$)'), {
      target: { value: '1500.50' },
    });
    fireEvent.change(screen.getByLabelText('Estimativa total (horas)'), {
      target: { value: '10.5' },
    });
    fireEvent.change(screen.getByLabelText('Início da vigência'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.click(screen.getByLabelText('Desenvolvimento'));
    fireEvent.click(screen.getByLabelText('Condições comerciais aprovadas'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar contrato' }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'FIXED_PROJECT',
        approved: true,
        serviceDeskIds: ['desk'],
        scope: 'API de integração',
        fixedPriceCents: 150050,
        estimatedMinutes: 630,
        includedMinutes: null,
      }),
    );
  });
  it('preserves legacy meaning and explains that regularization blocks new hours', () => {
    render(
      <ContractDetail
        contract={{
          id: 'legacy',
          organizationId: 'org',
          type: 'FIXED_COVERAGE',
          active: true,
          createdAt: '2026-01-01',
        }}
        showFinancial={false}
      />,
    );
    expect(
      screen.getByText(/Novos lançamentos bloqueados até regularizar/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Empreito')).not.toBeInTheDocument();
  });
});
