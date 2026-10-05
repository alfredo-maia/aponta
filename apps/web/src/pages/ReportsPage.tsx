import { useState } from 'react';
import { BarChart, Users, DollarSign, Clock } from 'lucide-react';
import { useReportWorkload, useReportBilling } from '../hooks/useReports';
import { useAuthStore } from '../stores/authStore';
import { EzEmptyCard, EzGridWrapper, EzSpinner, EzTabs } from '../components/ds';

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'WORKLOAD' | 'BILLING'>('WORKLOAD');

  const canSeeBilling = user ? ['ADMIN', 'CLIENT_MASTER'].includes(user.role) : false;

  const workloadQ = useReportWorkload();
  const billingQ = useReportBilling(canSeeBilling);

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
