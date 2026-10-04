import { Lock, Copy, Trash } from 'lucide-react';
import { useVault } from '../hooks/useVault';
import { useAuthStore } from '../stores/authStore';
import { EzAlert, EzButton, EzCardItem, EzEmptyCard, EzSpinner } from '../components/ds';

export function VaultPage() {
  const { query, removeMutation } = useVault();
  const user = useAuthStore((s) => s.user);

  if (query.isLoading)
    return (
      <div className="flex justify-center p-8">
        <EzSpinner label="Carregando cofre..." />
      </div>
    );
  if (query.isError)
    return (
      <div className="p-8">
        <EzAlert variant="error">Erro ao carregar o cofre de senhas.</EzAlert>
      </div>
    );

  const credentials = query.data || [];
  const canEdit = user && user.role === 'ADMIN';

  // Group by Organization, simulating Tiflux Root structure
  const grouped = credentials.reduce((acc, cred) => {
    const orgName = cred.organization?.name || 'Geral';
    if (!acc[orgName]) acc[orgName] = [];
    acc[orgName].push(cred);
    return acc;
  }, {} as Record<string, typeof credentials>);

  const handleCopy = (text?: string) => {
    if (text) navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Lock className="h-8 w-8" /> Cofre de Senhas
        </h1>
      </div>

      {!credentials.length && (
        <EzEmptyCard title="Nenhuma credencial liberada para esta operação." />
      )}

      {Object.entries(grouped).map(([org, creds]) => (
        <EzCardItem key={org} flat className="overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-900 flex justify-between">
            <span>{org}</span>
            <span className="text-sm font-normal text-gray-500">{creds.length} pastas/senhas</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {creds.map((cred) => (
              <li key={cred.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <h3 className="font-medium text-gray-900">{cred.name}</h3>
                  <div className="text-sm text-gray-500 mt-1 space-x-4">
                    {cred.username && (
                      <span>
                        <span className="font-semibold">User:</span> {cred.username}{' '}
                        <button onClick={() => handleCopy(cred.username)}>
                          <Copy className="w-3 h-3 inline" />
                        </button>
                      </span>
                    )}
                    <span>
                      <span className="font-semibold">Pass:</span> ********{' '}
                      <button onClick={() => handleCopy(cred.password)}>
                        <Copy className="w-3 h-3 inline" />
                      </button>
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <EzButton
                    variant="tertiary"
                    size="small"
                    onClick={() => {
                      if (window.confirm('Excluir senha definitivamente?')) removeMutation.mutate(cred.id);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100/50"
                    title="Excluir"
                    rightIcon={Trash}
                  />
                )}
              </li>
            ))}
          </ul>
        </EzCardItem>
      ))}
    </div>
  );
}
