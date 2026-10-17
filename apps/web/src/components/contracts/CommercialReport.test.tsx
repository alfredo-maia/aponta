import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import { brasiliaWallClockIso } from '../../lib/billingTime';
import { CommercialReport, CommercialResultTable } from './CommercialReport';

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

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

  it('renders a non-project period verbatim, a known result value and the partial-month-pending flag', () => {
    render(
      <CommercialResultTable
        rows={[
          {
            contractId: 'c2',
            contractName: 'Hourly Co',
            organizationId: 'o2',
            organizationName: 'Empresa 2',
            type: 'HOURLY',
            period: '2026-10',
            effortMinutes: 120,
            bonusMinutes: 0,
            knownCostCents: 5000,
            unknownCostMinutes: 0,
            incrementalRevenueCents: 2000,
            unknownRevenueMinutes: 30,
            fixedRevenueCents: null,
            totalRevenueCents: 7000,
            resultCents: 2000,
            status: 'PARTIAL_MONTH_REVENUE_PENDING',
            estimatedMinutes: null,
            remainingEstimateMinutes: null,
            projectPriceCents: null,
            hasIncompleteCosts: false,
          },
        ]}
      />,
    );
    expect(screen.getByText(/2026-10/)).toBeInTheDocument();
    expect(screen.getByText(/Receita incompleta: 30 min/)).toBeInTheDocument();
    expect(
      screen.getByText(/Mês parcial: receita aguardando definição comercial\./),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Estimativa restante/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Custo incompleto/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Saldo parcial do projeto/)).not.toBeInTheDocument();
    expect(screen.queryByText('Resultado desconhecido')).not.toBeInTheDocument();
  });

  it('renders the project-month revenue unallocated flag', () => {
    render(
      <CommercialResultTable
        rows={[
          {
            contractId: 'c3',
            contractName: 'Empreito Co',
            organizationId: 'o3',
            organizationName: 'Empresa 3',
            type: 'MONTHLY_HOURS',
            period: 'all',
            effortMinutes: 0,
            bonusMinutes: 0,
            knownCostCents: 0,
            unknownCostMinutes: 0,
            incrementalRevenueCents: 0,
            unknownRevenueMinutes: 0,
            fixedRevenueCents: null,
            totalRevenueCents: null,
            resultCents: null,
            status: 'PROJECT_MONTH_REVENUE_UNALLOCATED',
            estimatedMinutes: null,
            remainingEstimateMinutes: null,
            projectPriceCents: null,
            hasIncompleteCosts: false,
          },
        ]}
      />,
    );
    expect(
      screen.getByText(/Preço global do empreito sem rateio mensal\./),
    ).toBeInTheDocument();
  });

  it('renders an empty state when there are no commercial rows', () => {
    render(<CommercialResultTable rows={[]} />);
    expect(
      screen.getByText('Nenhum contrato no período.'),
    ).toBeInTheDocument();
  });
});

function renderReport(
  contracts: { id: string; name?: string | null }[] = [
    { id: 'c1', name: 'Contrato Um' },
  ],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommercialReport contracts={contracts} />
    </QueryClientProvider>,
  );
}

// Several cost-rate fields use native HTML5 constraints (`required` on the
// due-date field, `min`/`step` on the hourly field) that make a real browser
// block the implicit submission entirely before our own JS validation runs.
// Dispatching `submit` directly exercises the component's own defense-in-depth
// validation branches regardless of what the browser's constraint validation
// would have allowed through.
function submitCostForm() {
  const form = screen
    .getByRole('button', { name: 'Registrar custo' })
    .closest('form');
  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

function stubApiGet({
  reports = [],
  costRates = [],
  agents = [],
  reportsError = false,
  costsError = false,
}: {
  reports?: unknown[];
  costRates?: unknown[];
  agents?: unknown[];
  reportsError?: boolean;
  costsError?: boolean;
} = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/reports/commercial') {
      return reportsError
        ? Promise.reject(new Error('fail'))
        : Promise.resolve({ data: reports });
    }
    if (url === '/contracts/cost-rates') {
      return costsError
        ? Promise.reject(new Error('fail'))
        : Promise.resolve({ data: costRates });
    }
    if (url === '/users/agents') {
      return Promise.resolve({ data: agents });
    }
    return Promise.resolve({ data: [] });
  });
}

describe('CommercialReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner while the commercial report query is pending', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderReport();
    expect(screen.getByText('Carregando resultado...')).toBeInTheDocument();
  });

  it('shows an error alert when the commercial report query fails', async () => {
    stubApiGet({ reportsError: true });
    renderReport();
    await waitFor(() =>
      expect(
        screen.getByText('Não foi possível carregar o resultado gerencial.'),
      ).toBeInTheDocument(),
    );
  });

  it('shows an empty state once the commercial report resolves with no rows', async () => {
    stubApiGet({ reports: [] });
    renderReport();
    await waitFor(() =>
      expect(
        screen.getByText('Nenhum contrato no período.'),
      ).toBeInTheDocument(),
    );
  });

  it('shows an error alert when the cost-rates query fails', async () => {
    stubApiGet({ costsError: true });
    renderReport();
    await waitFor(() =>
      expect(screen.getByText('Erro ao consultar custos.')).toBeInTheDocument(),
    );
  });

  it('lists registered cost rates per technician', async () => {
    stubApiGet({
      costRates: [
        {
          id: 'rate-1',
          userId: 'u-1',
          effectiveFrom: '2026-10-01T03:00:00.000Z',
          hourlyCostCents: 15000,
          user: { id: 'u-1', name: 'Técnico Um' },
        },
      ],
    });
    renderReport();
    await waitFor(() =>
      expect(screen.getByText(/Técnico Um/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/R\$\s*150,00/)).toBeInTheDocument();
  });

  it('falls back to the contract id when a contract has no name', async () => {
    stubApiGet();
    renderReport([{ id: 'contract-without-name' }]);
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'contract-without-name' }),
      ).toBeInTheDocument(),
    );
  });

  it('lists agents as technician options for the cost-rate form', async () => {
    stubApiGet({ agents: [{ id: 'agent-1', name: 'Agente Um' }] });
    renderReport();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Agente Um' }),
      ).toBeInTheDocument(),
    );
  });

  it('rejects submission without a selected technician, due date or cost', async () => {
    stubApiGet();
    renderReport();
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    submitCostForm();
    expect(
      screen.getByText(/Informe técnico, vigência e custo válido/),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects a negative hourly cost', async () => {
    stubApiGet({ agents: [{ id: 'agent-1', name: 'Agente Um' }] });
    renderReport();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Agente Um' }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('Técnico'), {
      target: { value: 'agent-1' },
    });
    fireEvent.change(screen.getByLabelText(/Custo vigente desde/), {
      target: { value: '2026-10-15T10:30' },
    });
    fireEvent.change(screen.getByLabelText('Custo por hora (R$)'), {
      target: { value: '-5' },
    });
    submitCostForm();
    expect(
      screen.getByText(/Informe técnico, vigência e custo válido/),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric hourly cost', async () => {
    stubApiGet({ agents: [{ id: 'agent-1', name: 'Agente Um' }] });
    renderReport();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Agente Um' }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('Técnico'), {
      target: { value: 'agent-1' },
    });
    fireEvent.change(screen.getByLabelText(/Custo vigente desde/), {
      target: { value: '2026-10-15T10:30' },
    });
    fireEvent.change(screen.getByLabelText('Custo por hora (R$)'), {
      target: { value: 'abc' },
    });
    submitCostForm();
    expect(
      screen.getByText(/Informe técnico, vigência e custo válido/),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects an hourly cost with more than two decimal places', async () => {
    stubApiGet({ agents: [{ id: 'agent-1', name: 'Agente Um' }] });
    renderReport();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Agente Um' }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('Técnico'), {
      target: { value: 'agent-1' },
    });
    fireEvent.change(screen.getByLabelText(/Custo vigente desde/), {
      target: { value: '2026-10-15T10:30' },
    });
    fireEvent.change(screen.getByLabelText('Custo por hora (R$)'), {
      target: { value: '12.345' },
    });
    submitCostForm();
    expect(
      screen.getByText(/Informe técnico, vigência e custo válido/),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('saves a valid hourly cost rate and resets the form on success', async () => {
    stubApiGet({ agents: [{ id: 'agent-1', name: 'Agente Um' }] });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    renderReport();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Agente Um' }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('Técnico'), {
      target: { value: 'agent-1' },
    });
    fireEvent.change(screen.getByLabelText(/Custo vigente desde/), {
      target: { value: '2026-10-15T10:30' },
    });
    fireEvent.change(screen.getByLabelText('Custo por hora (R$)'), {
      target: { value: '150.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar custo' }));
    const expectedEffectiveFrom = brasiliaWallClockIso('2026-10-15', '10:30');
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/contracts/cost-rates', {
        userId: 'agent-1',
        effectiveFrom: expectedEffectiveFrom,
        hourlyCostCents: 15050,
      }),
    );
    await waitFor(() => {
      const hourlyInput = screen.getByLabelText(
        'Custo por hora (R$)',
      ) as HTMLInputElement;
      expect(hourlyInput.value).toBe('');
    });
    expect(
      screen.queryByText(/Informe técnico, vigência e custo válido/),
    ).not.toBeInTheDocument();
  });

  it('shows an error message when saving the hourly cost rate fails', async () => {
    stubApiGet({ agents: [{ id: 'agent-1', name: 'Agente Um' }] });
    vi.mocked(api.post).mockRejectedValue(new Error('fail'));
    renderReport();
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Agente Um' }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('Técnico'), {
      target: { value: 'agent-1' },
    });
    fireEvent.change(screen.getByLabelText(/Custo vigente desde/), {
      target: { value: '2026-10-15T10:30' },
    });
    fireEvent.change(screen.getByLabelText('Custo por hora (R$)'), {
      target: { value: '150.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar custo' }));
    await waitFor(() =>
      expect(
        screen.getByText(
          /Não foi possível salvar o custo\. Verifique a vigência\./,
        ),
      ).toBeInTheDocument(),
    );
  });
});
