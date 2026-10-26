import { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import {
  EzCardItem,
  EzCheck,
  EzEmptyCard,
  EzPageHeader,
  EzPageLayout,
  EzPagination,
  EzSpinner,
  EzTabs,
  EzTag,
  EzTextInput,
} from '../components/ds';
import { useUsersList, useUser, useSetUserActive, UserListItem } from '../hooks/useUsers';

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENT_MASTER: 'Gerente de Atendimento',
  AGENT: 'Atendente',
  CLIENT_MASTER: 'Cliente Master',
  CLIENT: 'Cliente',
};

type DetailTab = 'profile' | 'security';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
          : 'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600'
      }
    >
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function UserDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { data: user, isLoading } = useUser(userId);
  const [tab, setTab] = useState<DetailTab>('profile');
  const setActiveMutation = useSetUserActive();

  if (isLoading || !user) {
    return (
      <div className="p-8">
        <EzSpinner label="Carregando usuário…" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-gray-900">{user.name}</h2>
        <StatusBadge active={user.active} />
      </div>

      <EzTabs
        tabs={[
          { id: 'profile', label: 'Perfil' },
          { id: 'security', label: 'Segurança' },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as DetailTab)}
      />

      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5 text-sm md:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500">Nome</span>
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500">E-mail</span>
              <div className="text-sm font-medium text-gray-900">{user.email}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500">Tipo</span>
              <div className="text-sm font-medium text-gray-900">
                {ROLE_LABELS[user.role] ?? user.role}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500">Grupo de atendentes</span>
              <div className="text-sm text-gray-900">
                {user.technicalGroup ? (
                  <EzTag label={user.technicalGroup.name} variant="petroleum" />
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div className="col-span-1 space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-gray-500">Grupos de permissões</span>
              <div className="flex flex-wrap gap-1.5">
                {user.permissionGroups.length === 0 ? (
                  <span className="text-sm text-gray-500">—</span>
                ) : (
                  user.permissionGroups.map((group) => (
                    <EzTag key={group.id} label={group.name} />
                  ))
                )}
              </div>
            </div>
          </div>

          <EzCheck
            id="user-active-toggle"
            label="Usuário ativo"
            checked={user.active}
            disabled={setActiveMutation.isPending}
            onChange={(e) =>
              setActiveMutation.mutate({ id: user.id, active: e.target.checked })
            }
          />
        </div>
      )}

      {tab === 'security' && (
        <p className="text-sm text-gray-500">
          Autenticação em dois fatores e sessões ativas ficam fora do escopo desta entrega
          (DMTE-84, Tarefa 4) — aba reservada para a paridade futura com o Tiflux.
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a lista
        </button>
      </div>
    </div>
  );
}

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data, isLoading, isError } = useUsersList({
    q: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <EzPageLayout
      header={
        <EzPageHeader
          title="Usuários"
          showBackButton={!!selectedUserId}
          onBack={() => setSelectedUserId(null)}
        />
      }
    >
      {selectedUserId ? (
        <EzCardItem flat className="p-0">
          <UserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
        </EzCardItem>
      ) : (
        <EzCardItem flat className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <EzTextInput
              type="search"
              placeholder="Buscar usuário por nome ou e-mail…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
              className="max-w-xs"
            />
          </div>

          {isLoading ? (
            <div className="p-8">
              <EzSpinner label="Carregando usuários…" />
            </div>
          ) : isError ? (
            <div className="p-4">
              <EzEmptyCard title="Erro ao carregar usuários." />
            </div>
          ) : users.length === 0 ? (
            <EzEmptyCard title="Nenhum usuário encontrado." />
          ) : (
            <table className="w-full text-left text-[14px]">
              <thead className="bg-gray-90/60 text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Grupos de permissões</th>
                  <th className="px-4 py-2 font-medium">Grupo de atendentes</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u: UserListItem) => (
                  <tr key={u.id} className="hover:bg-gray-90/40">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {u.name}
                      </button>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.permissionGroups.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          u.permissionGroups.map((g) => <EzTag key={g.id} label={g.name} />)
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.technicalGroup ? (
                        <EzTag label={u.technicalGroup.name} variant="petroleum" />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={u.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <EzPagination currentPage={meta.page} totalPages={meta.totalPages} onChange={setPage} />
            </div>
          )}
        </EzCardItem>
      )}
    </EzPageLayout>
  );
}

export default UsersPage;
