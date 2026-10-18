import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  EzAlert,
  EzButton,
  EzComboBox,
  EzEmptyCard,
  EzGridWrapper,
  EzSpinner,
  EzTextInput,
} from '../ds';
import { contractMoney } from './ContractViews';
import { brasiliaWallClockIso } from '../../lib/billingTime';

export interface CommercialResult {
  contractId: string;
  contractName: string;
  organizationId: string;
  organizationName: string;
  type: string;
  period: string;
  effortMinutes: number;
  bonusMinutes: number;
  knownCostCents: number;
  unknownCostMinutes: number;
  incrementalRevenueCents: number;
  unknownRevenueMinutes: number;
  fixedRevenueCents: number | null;
  totalRevenueCents: number | null;
  resultCents: number | null;
  status: string;
  estimatedMinutes: number | null;
  remainingEstimateMinutes: number | null;
  projectPriceCents: number | null;
  hasIncompleteCosts: boolean;
}
const money = (cents: number | null) =>
  contractMoney(cents == null ? null : cents / 100);
export function CommercialResultTable({ rows }: { rows: CommercialResult[] }) {
  if (!rows.length) return <EzEmptyCard title="Nenhum contrato no período." />;
  return (
    <EzGridWrapper>
      <thead>
        <tr>
          {[
            'Contrato / empresa',
            'Esforço / bonificação',
            'Receita gerencial',
            'Custo conhecido',
            'Resultado operacional estimado',
          ].map((label) => (
            <th key={label} className="p-3 text-left">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.contractId}-${row.period}`} className="border-t">
            <td className="p-3">
              {row.contractName}
              <span className="block text-sm text-gray-500">
                {row.organizationName} ·{' '}
                {row.period === 'all' ? 'Projeto completo' : row.period}
              </span>
            </td>
            <td className="p-3">
              {row.effortMinutes / 60}h / {row.bonusMinutes / 60}h
              {row.remainingEstimateMinutes != null && (
                <span className="block text-sm">
                  Estimativa restante: {row.remainingEstimateMinutes / 60}h
                </span>
              )}
            </td>
            <td className="p-3">
              {money(row.totalRevenueCents)}
              <span className="block text-sm">
                Fixa: {money(row.fixedRevenueCents)} · Incremental:{' '}
                {money(row.incrementalRevenueCents)}
              </span>
              {row.unknownRevenueMinutes > 0 && (
                <span className="block">
                  Receita incompleta: {row.unknownRevenueMinutes} min
                </span>
              )}
              {row.status === 'PARTIAL_MONTH_REVENUE_PENDING' && (
                <span className="block">
                  Mês parcial: receita aguardando definição comercial.
                </span>
              )}
              {row.status === 'PROJECT_MONTH_REVENUE_UNALLOCATED' && (
                <span className="block">
                  Preço global do empreito sem rateio mensal.
                </span>
              )}
            </td>
            <td className="p-3">
              {money(row.knownCostCents)}
              {row.hasIncompleteCosts && (
                <span className="block text-amber-700">
                  Custo incompleto: {row.unknownCostMinutes} min sem custo
                  cadastrado.
                </span>
              )}
            </td>
            <td className="p-3">
              {row.resultCents == null
                ? 'Resultado desconhecido'
                : money(row.resultCents)}
              {row.type === 'FIXED_PROJECT' && (
                <span className="block text-sm">
                  Saldo parcial do projeto. Sem previsão de custo restante, não
                  representa resultado final.
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </EzGridWrapper>
  );
}

interface CostRate {
  id: string;
  userId: string;
  effectiveFrom: string;
  hourlyCostCents: number;
  user: { id: string; name: string };
}
export function CommercialReport({
  contracts,
}: {
  contracts: { id: string; name?: string | null }[];
}) {
  const [contractId, setContractId] = useState('');
  const [month, setMonth] = useState('');
  const [userId, setUserId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [hourly, setHourly] = useState('');
  const [error, setError] = useState('');
  const client = useQueryClient();
  const report = useQuery({
    queryKey: ['reports', 'commercial', contractId, month],
    queryFn: async () =>
      (
        await api.get<CommercialResult[]>('/reports/commercial', {
          params: {
            contractId: contractId || undefined,
            month: month || undefined,
          },
        })
      ).data,
  });
  const costs = useQuery({
    queryKey: ['cost-rates'],
    queryFn: async () =>
      (await api.get<CostRate[]>('/contracts/cost-rates')).data,
  });
  const agents = useQuery({
    queryKey: ['agents'],
    queryFn: async () =>
      (await api.get<{ id: string; name: string }[]>('/users/agents')).data,
  });
  const save = useMutation({
    mutationFn: async () =>
      api.post('/contracts/cost-rates', {
        userId,
        effectiveFrom: brasiliaWallClockIso(
          effectiveFrom.slice(0, 10),
          effectiveFrom.slice(11, 16),
        ),
        hourlyCostCents: Math.round(Number(hourly) * 100),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['cost-rates'] });
      setHourly('');
      setError('');
    },
  });
  return (
    <div className="space-y-5">
      <EzAlert variant="info">
        Indicadores internos e informativos. Receita contratada não é
        recebimento; resultado operacional não inclui impostos ou despesas
        gerais. Custos ausentes deixam o resultado desconhecido. Preço de
        empreito e mensalidade entram uma vez, sem repetição por apontamento.
      </EzAlert>
      <div className="flex flex-wrap gap-4">
        <EzComboBox
          id="commercial-contract"
          label="Contrato gerencial"
          value={contractId}
          onChange={(event) => setContractId(event.target.value)}
        >
          <option value="">Todos</option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.name || contract.id}
            </option>
          ))}
        </EzComboBox>
        <EzTextInput
          id="commercial-month"
          label="Competência gerencial"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          message="Em branco: mês atual para contratos mensais/avulsos; empreito no total do projeto."
        />
      </div>
      {report.isLoading && <EzSpinner label="Carregando resultado..." />}
      {report.isError && (
        <EzAlert variant="error">
          Não foi possível carregar o resultado gerencial.
        </EzAlert>
      )}
      {report.data && <CommercialResultTable rows={report.data} />}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Custo por técnico e vigência</h2>
        <p className="text-sm">
          Alterações criam uma nova condição e preservam custos já registrados.
        </p>
        {costs.isError && (
          <EzAlert variant="error">Erro ao consultar custos.</EzAlert>
        )}
        <ul>
          {costs.data?.map((rate) => (
            <li key={rate.id}>
              {rate.user.name} · {money(rate.hourlyCostCents)}/h · desde{' '}
              {new Date(rate.effectiveFrom).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
              })}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              !userId ||
              !effectiveFrom ||
              hourly === '' ||
              !Number.isFinite(Number(hourly)) ||
              Number(hourly) < 0 ||
              !/^\d+(\.\d{1,2})?$/.test(hourly)
            ) {
              setError(
                'Informe técnico, vigência e custo válido com até duas casas decimais.',
              );
              return;
            }
            save.mutate(undefined, {
              onError: () =>
                setError(
                  'Não foi possível salvar o custo. Verifique a vigência.',
                ),
            });
          }}
        >
          <EzComboBox
            id="cost-user"
            label="Técnico"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Selecione</option>
            {agents.data?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </EzComboBox>
          <EzTextInput
            id="cost-effective"
            label="Custo vigente desde"
            message="Data e hora no horário de Brasília."
            type="datetime-local"
            required
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
          />
          <EzTextInput
            id="cost-hourly"
            label="Custo por hora (R$)"
            type="number"
            min="0"
            step="0.01"
            value={hourly}
            onChange={(event) => setHourly(event.target.value)}
          />
          <EzButton
            type="submit"
            label="Registrar custo"
            disabled={save.isPending}
          />
        </form>
        {error && <EzAlert variant="error">{error}</EzAlert>}
      </section>
    </div>
  );
}
