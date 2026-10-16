import { useState } from 'react';
import { BarChart, Users, DollarSign, Clock } from 'lucide-react';
import { useReportWorkload, useReportBilling } from '../hooks/useReports';
import { useAuthStore } from '../stores/authStore';
import { EzComboBox, EzEmptyCard, EzGridWrapper, EzTextInput, EzSpinner, EzTabs } from '../components/ds';
import { useContracts } from '../hooks/useContracts';
import { billingMonthStartIso } from '../lib/billingTime';

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'WORKLOAD' | 'BILLING'>('WORKLOAD');

  const canSeeBilling = user ? ['ADMIN', 'CLIENT_MASTER'].includes(user.role) : false;
  const [contractId, setContractId] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const contractsQ = useContracts();

  const workloadQ = useReportWorkload();
  const billingQ = useReportBilling(canSeeBilling, {
    contractId: contractId || undefined,
    startDate: startMonth ? billingMonthStartIso(startMonth) : undefined,
    endDate: endMonth ? billingMonthStartIso(endMonth) : undefined,
  });

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const tabs = [
    { id: 'WORKLOAD' as const, label: 'Carga de Trabalho' },
    ...(canSeeBilling ? [{ id: 'BILLING' as const, label: 'Faturamento Base' }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart className="h-8 w-8" /> Relatórios
        </h1>
      </div>

      <EzTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'WORKLOAD' | 'BILLING')}
      />

      {activeTab === 'WORKLOAD' && (
        <>
          {workloadQ.isLoading && (
            <div className="flex justify-center p-4">
              <EzSpinner label="Carregando..." />
            </div>
          )}
          {!workloadQ.isLoading && workloadQ.data?.length === 0 && (
            <EzEmptyCard title="Nenhum apontamento registrado." />
          )}
          {workloadQ.data && workloadQ.data.length > 0 && (
            <EzGridWrapper>
              <thead className="bg-gray-90">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    <Users className="h-4 w-4 inline mr-1" /> Atendente
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-right">Tempo Apontado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workloadQ.data.map((item) => (
                  <tr key={item.agentId} className="hover:bg-gray-90">
                    <td className="px-4 py-3 font-medium flex items-center gap-2 text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {item.agentName}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatHours(item.totalMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </EzGridWrapper>
          )}
        </>
      )}

      {activeTab === 'BILLING' && canSeeBilling && (
        <>
          <p className="text-sm text-gray-600">Valores informativos dos apontamentos, sem emissão de cobrança ou mensalidade. Ciclos mensais em America/Sao_Paulo; valores históricos preservados.</p>
          <div className="flex flex-wrap gap-4">
              <EzComboBox id="billing-contract" label="Contrato" value={contractId} onChange={(event) => setContractId(event.target.value)}>
                <option value="">Todos os contratos</option>
                {contractsQ.data?.map((contract) => <option key={contract.id} value={contract.id}>{contract.name || contract.organization?.name || contract.id}</option>)}
              </EzComboBox>
            <EzTextInput id="billing-start-month" label="Ciclos desde" type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} />
            <EzTextInput id="billing-end-month" label="Ciclos até (exclusivo)" type="month" value={endMonth} onChange={(event) => setEndMonth(event.target.value)} />
          </div>
          {billingQ.isError && <p role="alert">Não foi possível carregar o relatório. Verifique o período selecionado.</p>}
          {billingQ.isLoading && (
            <div className="flex justify-center p-4">
              <EzSpinner label="Carregando faturamento..." />
            </div>
          )}
          {!billingQ.isLoading && billingQ.data?.length === 0 && (
            <EzEmptyCard title="Nenhum dado financeiro processado." />
          )}
          {billingQ.data && billingQ.data.length > 0 && (
            <EzGridWrapper>
              <thead className="bg-gray-90">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">
                    <DollarSign className="h-4 w-4 inline mr-1" /> Cliente / Organização
                  </th>
                  <th className="px-4 py-3 font-semibold text-green-600 text-right">Horas Faturáveis</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-right">Horas Não Faturáveis</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-right">Total Trabalhado</th>
                  <th className="px-4 py-3 font-semibold text-right">Coberto / Excedente</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor conhecido</th>
                  <th className="px-4 py-3 font-semibold text-right">Sem valorização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billingQ.data.map((item) => (
                  <tr key={item.organizationId} className="hover:bg-gray-90">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.organizationName}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatHours(item.billableMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatHours(item.nonBillableMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatHours(item.billableMinutes + item.nonBillableMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatHours(item.coveredMinutes)} / {formatHours(item.excessMinutes)}</td>
                    <td className="px-4 py-3 text-right">{(item.totalValueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-4 py-3 text-right">{item.unknownValuationCount}</td>
                  </tr>
                ))}
              </tbody>
            </EzGridWrapper>
          )}
        </>
      )}
    </div>
  );
}
