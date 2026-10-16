import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Contract, ContractInput } from '../../hooks/useContracts';
import { ContractDetail, ContractForm, ContractList } from './ContractViews';
import { EzAlert, EzButton } from '../ds';

const sample: Contract = {
  id: 'contract-1',
  organizationId: 'org-1',
  organization: { name: 'Empresa demonstração' },
  name: 'Suporte mensal',
  type: 'HOURS_LIMIT',
  active: true,
  includedMinutes: 600,
  monthlyValue: 1200,
  excessHourlyRateCents: 12000,
  startsAt: '2026-01-01',
  createdAt: '2026-01-01',
};
const meta: Meta = { title: 'Contratos/Estados', tags: ['autodocs'] };
export default meta;
type Story = StoryObj;

function ListDemo({
  financial = true,
  contracts = [sample],
  loading = false,
  error = false,
}: {
  financial?: boolean;
  contracts?: Contract[];
  loading?: boolean;
  error?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return selected ? (
    <div className="space-y-4">
      <EzButton label="Voltar para lista" onClick={() => setSelected(null)} />
      <ContractDetail
        contract={contracts.find((c) => c.id === selected) || sample}
        showFinancial={financial}
      />
    </div>
  ) : (
    <ContractList
      contracts={contracts}
      showFinancial={financial}
      loading={loading}
      error={error}
      onDetail={setSelected}
    />
  );
}
function FormDemo({ invalid = false }: { invalid?: boolean }) {
  const [saved, setSaved] = useState<ContractInput | null>(null);
  const [visible, setVisible] = useState(true);
  if (!visible)
    return (
      <EzButton label="Abrir formulário" onClick={() => setVisible(true)} />
    );
  return (
    <div className="max-w-2xl space-y-4">
      {saved && (
        <EzAlert variant="success">
          Contrato {saved.name || 'sem nome'} salvo na demonstração.
        </EzAlert>
      )}
      <ContractForm
        contract={invalid ? { ...sample, endsAt: '2025-01-01' } : undefined}
        organizations={[{ id: 'org-1', name: 'Empresa demonstração' }]}
        onSave={setSaved}
        onCancel={() => setVisible(false)}
      />
    </div>
  );
}
export const Lista: Story = { render: () => <ListDemo /> };
export const Carregando: Story = { render: () => <ListDemo loading /> };
export const Vazio: Story = { render: () => <ListDemo contracts={[]} /> };
export const Erro: Story = { render: () => <ListDemo error /> };
export const InativoEValorZero: Story = {
  render: () => (
    <ListDemo
      contracts={[
        { ...sample, active: false, monthlyValue: 0, excessHourlyRateCents: 0 },
      ]}
    />
  ),
};
export const AgenteSemValores: Story = {
  render: () => <ListDemo financial={false} />,
};
export const ClienteMasterFinanceiro: Story = {
  render: () => <ContractDetail contract={sample} showFinancial />,
};
export const TarifaAusente: Story = {
  render: () => (
    <ContractDetail
      contract={{ ...sample, excessHourlyRateCents: null }}
      showFinancial
    />
  ),
};
export const Cadastro: Story = { render: () => <FormDemo /> };
export const ValidacaoVigencia: Story = { render: () => <FormDemo invalid /> };
