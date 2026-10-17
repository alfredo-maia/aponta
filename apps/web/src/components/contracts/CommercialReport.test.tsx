import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CommercialResultTable } from './CommercialReport';

describe('commercial result semantics', () => {
  it('never presents incomplete costs as profit and labels project saldo as partial', () => {
    render(
      <CommercialResultTable
        rows={[
          {
            contractId: 'c',
            contractName: 'API',
            organizationId: 'o',
            organizationName: 'Empresa',
            type: 'FIXED_PROJECT',
            period: 'all',
            effortMinutes: 600,
            bonusMinutes: 60,
            knownCostCents: 10000,
            unknownCostMinutes: 60,
            incrementalRevenueCents: 0,
            unknownRevenueMinutes: 0,
            fixedRevenueCents: 50000,
            totalRevenueCents: 50000,
            resultCents: null,
            status: 'PROJECT_PARTIAL',
            estimatedMinutes: 1200,
            remainingEstimateMinutes: 600,
            projectPriceCents: 50000,
            hasIncompleteCosts: true,
          },
        ]}
      />,
    );
    expect(screen.getByText(/Saldo parcial do projeto/)).toBeInTheDocument();
    expect(screen.getByText(/Custo incompleto/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado desconhecido/)).toBeInTheDocument();
    expect(screen.queryByText(/Lucro/)).not.toBeInTheDocument();
  });
});
