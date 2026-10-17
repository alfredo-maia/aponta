import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorklogValuation } from './WorklogValuation';

const meta = {
  title: 'Apontamentos/Valorização',
  component: WorklogValuation,
  tags: ['autodocs'],
  args: {
    showFinancial: true,
    worklog: {
      valuationType: 'CONTRACT',
      contractId: 'contract-1',
      valuationSnapshot: { contractName: 'Suporte mensal (histórico)' },
      value: 60,
      valueCents: 6000,
    },
  },
} satisfies Meta<typeof WorklogValuation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ExcedenteConhecido: Story = {};
export const AgenteSemValores: Story = { args: { showFinancial: false } };
export const TarifaDesconhecida: Story = {
  args: { worklog: { ...meta.args.worklog, value: null, valueCents: null } },
};
export const CobertoPelaFranquia: Story = {
  args: { worklog: { ...meta.args.worklog, value: 0, valueCents: 0 } },
};
export const Legado: Story = {
  args: {
    worklog: { valuationType: 'CONTRACT', value: null, contractId: null },
  },
};
export const Garantia: Story = {
  args: { worklog: { valuationType: 'GUARANTEE', value: 0, valueCents: 0 } },
};
export const ValorManual: Story = {
  args: { worklog: { valuationType: 'MANUAL', value: 150, valueCents: 15000 } },
};
export const BonificacaoComCusto: Story = {
  args: {
    worklog: {
      ...meta.args.worklog,
      valuationType: 'BONUS',
      value: 0,
      valueCents: 0,
      costCents: 10000,
    },
  },
};
export const BonificacaoTecnicoSemCustos: Story = {
  args: {
    showFinancial: false,
    worklog: {
      ...meta.args.worklog,
      valuationType: 'BONUS',
      value: null,
      valueCents: null,
      costCents: null,
    },
  },
};
