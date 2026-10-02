import { Lock, Copy, Trash } from 'lucide-react';
import { useVault } from '../hooks/useVault';
import { useAuthStore } from '../stores/authStore';

export function VaultPage() {
  const { query, removeMutation } = useVault();
  const user = useAuthStore((s) => s.user);

  if (query.isLoading) return <div className="p-8 text-muted-foreground">Carregando cofre...</div>;
  if (query.isError) return <div className="p-8 text-destructive">Erro ao carregar o cofre de senhas.</div>;

  const credentials = query.data || [];
  const canEdit = user && ['ADMIN', 'CLIENT_MASTER'].includes(user.role);

  // Group by Organization, simulating Tiflux Root structure
  const grouped = credentials.reduce((acc, cred) => {
    const orgName = cred.organization?.name || 'Geral';
    if (!acc[orgName]) acc[orgName] = [];
    acc[orgName].push(cred);
    return acc;
  }, {} as Record<string, typeof credentials>);

  const handleCopy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Lock className="h-8 w-8" /> Cofre de Senhas
        </h1>
      </div>

      {!credentials.length && (
        <div className="text-muted-foreground border rounded-lg p-8 text-center bg-card">
          Nenhuma credencial liberada para esta operação.
        </div>
      )}

      {Object.entries(grouped).map(([org, creds]) => (
        <div key={org} className="border rounded-lg bg-card overflow-hidden">
          <div className="bg-muted px-4 py-3 font-semibold text-foreground flex justify-between">
            <span>{org}</span>
            <span className="text-sm font-normal text-muted-foreground">{creds.length} pastas/senhas</span>
          </div>
          <ul className="divide-y">
            {creds.map((cred) => (
              <li key={cred.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                <div>
                  <h3 className="font-medium">{cred.name}</h3>
                  <div className="text-sm text-muted-foreground mt-1 space-x-4">
                    {cred.username && (
                      <span>
                        <span className="font-semibold">User:</span> {cred.username}{' '}
                        <button onClick={() => handleCopy(cred.username!)}><Copy className="w-3 h-3 inline" /></button>
                      </span>
                    )}
                    <span>
                      <span className="font-semibold">Pass:</span> ********{' '}
                      <button onClick={() => handleCopy(cred.password!)}><Copy className="w-3 h-3 inline" /></button>
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => { if(confirm('Excluir senha definitivamente?')) removeMutation.mutate(cred.id); }}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-full"
                    title="Excluir"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
