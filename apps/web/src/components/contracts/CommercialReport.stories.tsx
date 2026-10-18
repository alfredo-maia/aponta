import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CommercialResultTable,
  type CommercialResult,
} from './CommercialReport';

const project: CommercialResult = {
  contractId: 'project',
  contractName: 'API aprovada',
  organizationId: 'organization',
  organizationName: 'Empresa demonstração',
  type: 'FIXED_PROJECT',
  period: 'all',
  effortMinutes: 600,
  bonusMinutes: 120,
  knownCostCents: 100000,
  unknownCostMinutes: 0,
  incrementalRevenueCents: 0,
  unknownRevenueMinutes: 0,
  fixedRevenueCents: 500000,
  totalRevenueCents: 500000,
  resultCents: 400000,
  status: 'PROJECT_PARTIAL',
  estimatedMinutes: 2400,
  remainingEstimateMinutes: 1800,
  projectPriceCents: 500000,
  hasIncompleteCosts: false,
};
const meta = {
  title: 'Contratos/Resultado gerencial',
  component: CommercialResultTable,
  args: { rows: [project] },
} satisfies Meta<typeof CommercialResultTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SaldoParcialEmpreito: Story = {};
export const CustoDesconhecido: Story = {
  args: {
    rows: [
      {
        ...project,
        resultCents: null,
        hasIncompleteCosts: true,
        unknownCostMinutes: 120,
      },
    ],
  },
};
export const MesParcialSemRateioPresumido: Story = {
  args: {
    rows: [
      {
        ...project,
        type: 'MONTHLY_HOURS',
        period: '2026-10',
        totalRevenueCents: null,
        fixedRevenueCents: null,
        resultCents: null,
        status: 'PARTIAL_MONTH_REVENUE_PENDING',
      },
    ],
  },
};
