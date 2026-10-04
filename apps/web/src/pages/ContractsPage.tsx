import { Briefcase, Building, CheckCircle, Clock } from 'lucide-react';
import { useContracts } from '../hooks/useContracts';
import { useAuthStore } from '../stores/authStore';
import { EzAlert, EzEmptyCard, EzGridWrapper, EzSpinner } from '../components/ds';

export function ContractsPage() {
  const { data: contracts, isLoading, isError } = useContracts();
  const user = useAuthStore((s) => s.user);

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <EzSpinner label="Carregando contratos..." />
      </div>
    );
  if (isError)
    return (
      <div className="p-8">
        <EzAlert variant="error">Erro ao carregar os contratos.</EzAlert>
      </div>
    );

  const showFinancial = user?.role === 'ADMIN' || user?.role === 'CLIENT_MASTER';
  const list = contracts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-8 w-8" /> Contratos
        </h1>
      </div>

      {!list.length && <EzEmptyCard title="Nenhum contrato ativo para exibição." />}

      {list.length > 0 && (
        <EzGridWrapper>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Empresa</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Modalidade</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
              {showFinancial && (
                <th className="px-4 py-3 font-semibold text-gray-700">Aditivo / Global</th>
              )}
              {showFinancial && (
                <th className="px-4 py-3 font-semibold text-gray-700">Reajuste</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2 text-gray-900">
                  <Building className="w-4 h-4 text-gray-400" />
                  {c.organization?.name || '---'}
                </td>
                <td className="px-4 py-3 text-gray-900">
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
                  <td className="px-4 py-3 text-gray-500">
                    {c.monthlyValue ? `R$ ${c.monthlyValue.toLocaleString('pt-BR')}` : '---'}
                  </td>
                )}
                {showFinancial && (
                  <td className="px-4 py-3 text-gray-500">
                    {c.adjustmentDate ? new Date(c.adjustmentDate).toLocaleDateString('pt-BR') : '---'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </EzGridWrapper>
      )}
    </div>
  );
}
