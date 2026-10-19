import { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  useVaultAudit,
  useVaultAgents,
  VaultAuditFilters,
  CredentialAction,
} from '../hooks/useVaultAudit';
import {
  EzAlert,
  EzButton,
  EzCardItem,
  EzDateInput,
  EzEmptyCard,
  EzMultiSelect,
  EzPagination,
  EzSpinner,
  EzTextInput,
} from '../components/ds';

const PAGE_SIZE = 20;

/**
 * Ação labels (pt-BR), Tiflux-parity. Only actions that have a real emitter
 * in the Aponta vault are listed — "Restaurou a senha" / "Viu o histórico" /
 * "Abriu um anexo" from the Tiflux reference screen have no backing feature
 * here (no version history/attachments) and are intentionally left out of
 * this select, per the spec's "fora do escopo" note.
 */
const ACTION_LABELS: Record<CredentialAction, string> = {
  CREATE_FOLDER: 'Criou a pasta',
  DELETE_FOLDER: 'Excluiu a pasta',
  CREATE_CREDENTIAL: 'Criou a senha',
  UPDATE_CREDENTIAL: 'Alterou a senha',
  DELETE_CREDENTIAL: 'Excluiu a senha',
  REVEAL_CREDENTIAL: 'Revelou a senha',
  COPY_USERNAME: 'Copiou o usuário',
  COPY_PASSWORD: 'Copiou a senha',
};

const ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }));

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export function VaultAuditPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actorIds, setActorIds] = useState<(string | number)[]>([]);
  const [actions, setActions] = useState<(string | number)[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  const filters: VaultAuditFilters = useMemo(
    () => ({
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      actorId: actorIds[0] ? String(actorIds[0]) : undefined,
      action: actions[0] ? (String(actions[0]) as CredentialAction) : undefined,
      query: query || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [from, to, actorIds, actions, query, page],
  );

  const agentsQuery = useVaultAgents();
  const auditQuery = useVaultAudit(filters, hasSearched);

  const agentOptions = (agentsQuery.data ?? []).map((agent) => ({ value: agent.id, label: agent.name }));

  const handleShow = () => {
    setPage(1);
    setHasSearched(true);
  };

  const logs = auditQuery.data?.data ?? [];
  const meta = auditQuery.data?.meta;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <ShieldCheck className="h-8 w-8" /> Auditoria do Cofre de Senhas
      </h1>

      <EzAlert variant="info">
        O endereço IP de origem e o horário exato de cada ação também são registrados, mesmo quando não exibidos
        diretamente na tabela abaixo.
      </EzAlert>

      <EzCardItem flat className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <EzDateInput label="Data e hora (de)" value={from} onChange={(e) => setFrom(e.target.value)} />
          <EzDateInput label="Data e hora (até)" value={to} onChange={(e) => setTo(e.target.value)} />
          <EzMultiSelect
            label="Atendente"
            options={agentOptions}
            value={actorIds}
            onChange={(values) => setActorIds(values.slice(-1))}
            placeholder="Todos os atendentes"
          />
          <EzMultiSelect
            label="Ação"
            options={ACTION_OPTIONS}
            value={actions}
            onChange={(values) => setActions(values.slice(-1))}
            placeholder="Todas as ações"
          />
          <EzTextInput
            id="vault-audit-query"
            label="Buscar (cofre, pasta ou senha)"
            placeholder="Nome do cofre, pasta ou senha..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md:col-span-2"
          />
          <div className="flex items-end">
            <EzButton label="Exibir" onClick={handleShow} className="w-full md:w-auto" />
          </div>
        </div>
      </EzCardItem>

      {!hasSearched && (
        <EzEmptyCard title="Defina os filtros e clique em Exibir para consultar a auditoria." />
      )}

      {hasSearched && auditQuery.isLoading && (
        <div className="flex justify-center p-8">
          <EzSpinner label="Carregando auditoria..." />
        </div>
      )}

      {hasSearched && auditQuery.isError && (
        <EzAlert variant="error">Erro ao carregar a auditoria do cofre.</EzAlert>
      )}

      {hasSearched && !auditQuery.isLoading && !auditQuery.isError && (
        <EzCardItem flat className="overflow-hidden">
          {!logs.length ? (
            <EzEmptyCard title="Nenhum registro de auditoria encontrado para os filtros selecionados." />
          ) : (
            <table className="w-full text-left text-[14px]">
              <thead className="bg-gray-90/60 text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Data/Hora</th>
                  <th className="px-4 py-2 font-medium">Atendente</th>
                  <th className="px-4 py-2 font-medium">Ação</th>
                  <th className="px-4 py-2 font-medium">Cofre / Pasta / Senha</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-90/40">
                    <td className="px-4 py-3 text-gray-700">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{log.actorName}</td>
                    <td className="px-4 py-3 text-gray-700">{ACTION_LABELS[log.action] ?? log.action}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{log.targetName}</td>
                    <td className="px-4 py-3 text-gray-500">{log.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-end border-t border-gray-100 px-4 py-3">
              <EzPagination currentPage={meta.page} totalPages={meta.totalPages} onChange={setPage} />
            </div>
          )}
        </EzCardItem>
      )}
    </div>
  );
}
