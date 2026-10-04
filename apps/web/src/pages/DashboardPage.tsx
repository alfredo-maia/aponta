import { AlertTriangle, CheckCircle2, Clock, Inbox } from 'lucide-react';
import { useDashboardSummary } from '../hooks/useReports';
import { EzCardItem, EzSpinner, EzTile } from '../components/ds';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  PENDING_CUSTOMER: 'Aguardando Cliente',
  ON_HOLD: 'Aguardando Terceiros',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  ESCALATED: 'Escalonado',
};

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-gray-900">Dashboard</h1>

      {isLoading && (
        <div className="flex justify-center p-8">
          <EzSpinner label="Carregando métricas..." />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Falha ao carregar as métricas do dashboard.
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <EzTile
              icon={<Inbox className="h-6 w-6" />}
              iconVariant="brand"
              label="Chamados Abertos"
              value={data.openCount}
            />
            <EzTile
              icon={<CheckCircle2 className="h-6 w-6" />}
              iconVariant="green"
              label="Chamados Fechados"
              value={data.closedCount}
            />
            <EzTile
              icon={<AlertTriangle className="h-6 w-6" />}
              iconVariant="red"
              label="SLA Estourado"
              value={data.slaBreachedCount}
            />
            <EzTile
              icon={<Clock className="h-6 w-6" />}
              iconVariant="petroleum"
              label="Tempo Médio de Resolução"
              value={
                data.avgResolutionMinutes !== null
                  ? formatMinutes(data.avgResolutionMinutes)
                  : '—'
              }
            />
          </div>

          <EzCardItem className="p-5">
            <h2 className="mb-4 text-[16px] font-semibold text-gray-900">
              Chamados Abertos por Status
            </h2>
            {Object.keys(data.byStatus).length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum chamado aberto no momento.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <li
                    key={status}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-gray-700">
                      {STATUS_LABELS[status] ?? status}
                    </span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </EzCardItem>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
