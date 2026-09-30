import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardMetrics {
  total: number;
  statusCounts: Record<string, number>;
  departmentCounts: Record<string, number>;
  avgResolutionTimeHours: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function ReportsPage() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard');
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="p-8">Carregando métricas...</div>;
  }

  if (!metrics) {
    return <div className="p-8">Falha ao carregar métricas.</div>;
  }

  // Format data for Recharts
  const statusData = Object.entries(metrics.statusCounts).map(([name, value]) => ({ name, value }));
  const deptData = Object.entries(metrics.departmentCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Relatórios e Métricas</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total de Chamados</h3>
          <p className="text-2xl font-bold mt-2">{metrics.total}</p>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Tempo Médio de Resolução</h3>
          <p className="text-2xl font-bold mt-2">{metrics.avgResolutionTimeHours.toFixed(1)} h</p>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Chamados Abertos</h3>
          <p className="text-2xl font-bold mt-2">{metrics.statusCounts['OPEN'] || 0}</p>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Chamados Concluídos</h3>
          <p className="text-2xl font-bold mt-2">{(metrics.statusCounts['RESOLVED'] || 0) + (metrics.statusCounts['CLOSED'] || 0)}</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 h-96">
          <h3 className="text-lg font-semibold mb-4">Volume por Status</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Chamados" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 h-96">
          <h3 className="text-lg font-semibold mb-4">Volume por Departamento</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deptData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {deptData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
