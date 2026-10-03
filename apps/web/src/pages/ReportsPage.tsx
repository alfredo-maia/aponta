import { useState } from 'react';
import { BarChart, Users, DollarSign, Clock } from 'lucide-react';
import { useReportWorkload, useReportBilling } from '../hooks/useReports';
import { useAuthStore } from '../stores/authStore';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart className="h-8 w-8" /> Relatórios
        </h1>
      </div>

      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('WORKLOAD')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'WORKLOAD' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" /> Carga de Trabalho
          </button>
          
          {canSeeBilling && (
            <button
              onClick={() => setActiveTab('BILLING')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'BILLING' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <DollarSign className="h-4 w-4" /> Faturamento Base
            </button>
          )}
        </nav>
      </div>

      {activeTab === 'WORKLOAD' && (
        <div className="border rounded-lg bg-card overflow-hidden">
          {workloadQ.isLoading && <div className="p-4">Carregando...</div>}
          {!workloadQ.isLoading && workloadQ.data?.length === 0 && <div className="p-4">Nenhum apontamento registrado.</div>}
          {workloadQ.data && workloadQ.data.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">Atendente</th>
                  <th className="px-4 py-3 font-semibold text-foreground text-right">Tempo Apontado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {workloadQ.data.map((item) => (
                  <tr key={item.agentId} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {item.agentName}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatHours(item.totalMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'BILLING' && canSeeBilling && (
        <div className="border rounded-lg bg-card overflow-hidden">
          {billingQ.isLoading && <div className="p-4">Carregando faturamento...</div>}
          {!billingQ.isLoading && billingQ.data?.length === 0 && <div className="p-4">Nenhum dado financeiro processado.</div>}
          {billingQ.data && billingQ.data.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">Cliente / Organização</th>
                  <th className="px-4 py-3 font-semibold text-foreground text-right text-green-600">Horas Faturáveis</th>
                  <th className="px-4 py-3 font-semibold text-foreground text-right text-muted-foreground">Horas Não Faturáveis</th>
                  <th className="px-4 py-3 font-semibold text-foreground text-right">Total Trabalhado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {billingQ.data.map((item) => (
                  <tr key={item.organizationId} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{item.organizationName}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatHours(item.billableMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatHours(item.nonBillableMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatHours(item.billableMinutes + item.nonBillableMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
