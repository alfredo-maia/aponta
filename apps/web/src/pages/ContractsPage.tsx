import { Briefcase, Building, CheckCircle, Clock } from 'lucide-react';
import { useContracts } from '../hooks/useContracts';
import { useAuthStore } from '../stores/authStore';

export function ContractsPage() {
  const { data: contracts, isLoading, isError } = useContracts();
  const user = useAuthStore((s) => s.user);

  if (isLoading) return <div className="p-8 text-muted-foreground">Carregando contratos...</div>;
  if (isError) return <div className="p-8 text-destructive">Erro ao carregar os contratos.</div>;

  const showFinancial = user?.role === 'ADMIN' || user?.role === 'CLIENT_MASTER';
  const list = contracts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-8 w-8" /> Contratos
        </h1>
      </div>

      {!list.length && (
        <div className="text-muted-foreground border rounded-lg p-8 text-center bg-card">
          Nenhum contrato ativo para exibição.
        </div>
      )}

      {list.length > 0 && (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">Empresa</th>
                <th className="px-4 py-3 font-semibold text-foreground">Modalidade</th>
                <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                {showFinancial && (
                  <th className="px-4 py-3 font-semibold text-foreground">Aditivo / Global</th>
                )}
                {showFinancial && (
                  <th className="px-4 py-3 font-semibold text-foreground">Reajuste</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    {c.organization?.name || '---'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {c.type === 'HOURS_LIMIT' ? <Clock className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                      {c.type === 'HOURS_LIMIT' ? `Pacote: ${c.hoursLimit}h` : 'Cobertura'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Ativo
                    </span>
                  </td>
                  {showFinancial && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.monthlyValue ? `R$ ${c.monthlyValue.toLocaleString('pt-BR')}` : '---'}
                    </td>
                  )}
                  {showFinancial && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.adjustmentDate ? new Date(c.adjustmentDate).toLocaleDateString('pt-BR') : '---'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
