import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import {
  EzButton,
  EzCardItem,
  EzCheck,
  EzDoubleList,
  EzEmptyCard,
  EzListItem,
  EzModal,
  EzPageHeader,
  EzPageLayout,
  EzSpinner,
  EzTabs,
  EzTextArea,
  EzTextInput,
} from '../components/ds';
import { api } from '../lib/api';
import {
  usePermissionGroups,
  usePermissionGroup,
  usePermissionCatalog,
  useCreatePermissionGroup,
  useUpdatePermissionGroup,
  useUpdatePermissionGroupPermissions,
  usePermissionGroupUserMutations,
  usePermissionGroupTechnicalGroupMutations,
} from '../hooks/usePermissionGroups';

type DetailTab = 'info' | 'permissions' | 'links';

const CATEGORY_LABELS: Record<string, string> = {
  ADMINISTRATIVE: 'Permissões administrativas',
  CLIENT: 'Permissões de cliente',
  MANAGEMENT: 'Permissões de gestão',
  REPORTING: 'Permissões de relatório',
  TECHNICAL: 'Permissões técnicas',
};

interface SimpleUser {
  id: string;
  name: string;
  email: string;
}

interface SimpleRef {
  id: string;
  name: string;
}

function useAllUsers() {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const { data } = await api.get<SimpleUser[]>('/users');
      return data;
    },
  });
}

function useAllTechnicalGroups() {
  return useQuery({
    queryKey: ['technical-groups'],
    queryFn: async () => {
      const { data } = await api.get<SimpleRef[]>('/technical-groups');
      return data;
    },
  });
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreatePermissionGroup();

  const handleSubmit = () => {
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <EzModal isOpen onClose={onClose} title="Novo grupo de permissões">
      <div className="space-y-4">
        <EzTextInput id="pg-name" label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <EzTextArea
          id="pg-description"
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <EzButton variant="tertiary" onClick={onClose}>
            Cancelar
          </EzButton>
          <EzButton onClick={handleSubmit} disabled={createMutation.isPending}>
            Criar
          </EzButton>
        </div>
      </div>
    </EzModal>
  );
}

function GroupDetail({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const { data: group, isLoading } = usePermissionGroup(groupId);
  const { data: catalog } = usePermissionCatalog();
  const [tab, setTab] = useState<DetailTab>('info');
  const updateMutation = useUpdatePermissionGroup(groupId);
  const updatePermissionsMutation = useUpdatePermissionGroupPermissions(groupId);
  const { addUser, removeUser } = usePermissionGroupUserMutations(groupId);
  const { addTechnicalGroup, removeTechnicalGroup } = usePermissionGroupTechnicalGroupMutations(groupId);

  const { data: allUsers } = useAllUsers();
  const { data: allTechnicalGroups } = useAllTechnicalGroups();

  const [infoDraft, setInfoDraft] = useState<{ name: string; description: string } | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string> | null>(null);

  const categories = useMemo(() => {
    const byCategory = new Map<string, { key: string; label: string }[]>();
    for (const entry of catalog ?? []) {
      const list = byCategory.get(entry.category) ?? [];
      list.push({ key: entry.key, label: entry.label });
      byCategory.set(entry.category, list);
    }
    return Array.from(byCategory.entries());
  }, [catalog]);

  if (isLoading || !group) {
    return (
      <div className="p-8">
        <EzSpinner label="Carregando grupo…" />
      </div>
    );
  }

  if (infoDraft === null) {
    setInfoDraft({ name: group.name, description: group.description ?? '' });
  }
  if (selectedKeys === null) {
    setSelectedKeys(new Set(group.permissions));
  }

  const toggleKey = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev ?? []);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleCategory = (keys: string[], checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev ?? []);
      for (const key of keys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const linkedUserIds = new Set(group.userMembers.map((m) => m.user.id));
  const availableUsers = (allUsers ?? []).filter((u) => !linkedUserIds.has(u.id));

  const linkedTechnicalGroupIds = new Set(group.technicalGroupLinks.map((l) => l.technicalGroup.id));
  const availableTechnicalGroups = (allTechnicalGroups ?? []).filter(
    (g) => !linkedTechnicalGroupIds.has(g.id),
  );

  return (
    <div className="space-y-5 p-5">
      <h2 className="text-[18px] font-semibold text-gray-900">{group.name}</h2>

      <EzTabs
        tabs={[
          { id: 'info', label: 'Informações' },
          { id: 'permissions', label: 'Permissões' },
          { id: 'links', label: 'Vínculos' },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as DetailTab)}
      />

      {tab === 'info' && infoDraft && (
        <div className="space-y-4">
          <EzTextInput
            id="pg-detail-name"
            label="Nome"
            value={infoDraft.name}
            onChange={(e) => setInfoDraft({ ...infoDraft, name: e.target.value })}
          />
          <EzTextArea
            id="pg-detail-description"
            label="Descrição"
            value={infoDraft.description}
            onChange={(e) => setInfoDraft({ ...infoDraft, description: e.target.value })}
          />
          <div className="flex justify-end">
            <EzButton
              size="small"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(infoDraft)}
            >
              Salvar
            </EzButton>
          </div>
        </div>
      )}

      {tab === 'permissions' && selectedKeys && (
        <div className="space-y-6">
          {categories.map(([category, entries]) => {
            const categoryKeys = entries.map((e) => e.key);
            const allSelected = categoryKeys.every((key) => selectedKeys.has(key));
            return (
              <div key={category} className="space-y-2 rounded-[8px] border border-gray-200 p-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {CATEGORY_LABELS[category] ?? category}
                  </h3>
                  <EzCheck
                    id={`pg-select-all-${category}`}
                    label={`Selecionar todos (${CATEGORY_LABELS[category] ?? category})`}
                    checked={allSelected}
                    onChange={(e) => toggleCategory(categoryKeys, e.target.checked)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {entries.map((entry) => (
                    <EzCheck
                      key={entry.key}
                      id={`pg-permission-${entry.key}`}
                      label={entry.label}
                      checked={selectedKeys.has(entry.key)}
                      onChange={(e) => toggleKey(entry.key, e.target.checked)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end">
            <EzButton
              disabled={updatePermissionsMutation.isPending}
              onClick={() => updatePermissionsMutation.mutate(Array.from(selectedKeys))}
            >
              Salvar permissões
            </EzButton>
          </div>
        </div>
      )}

      {tab === 'links' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Usuários vinculados diretamente</h3>
            <EzDoubleList
              availableLabel="Usuários disponíveis"
              selectedLabel="Vinculados"
              available={availableUsers.map((u) => ({ id: u.id, label: u.name, description: u.email }))}
              selected={group.userMembers.map((m) => ({
                id: m.user.id,
                label: m.user.name,
                description: m.user.email,
              }))}
              onAdd={(item) => addUser.mutate(String(item.id))}
              onRemove={(item) => removeUser.mutate(String(item.id))}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Grupos de atendentes vinculados</h3>
            <EzDoubleList
              availableLabel="Grupos disponíveis"
              selectedLabel="Vinculados"
              available={availableTechnicalGroups.map((g) => ({ id: g.id, label: g.name }))}
              selected={group.technicalGroupLinks.map((l) => ({
                id: l.technicalGroup.id,
                label: l.technicalGroup.name,
              }))}
              onAdd={(item) => addTechnicalGroup.mutate(String(item.id))}
              onRemove={(item) => removeTechnicalGroup.mutate(String(item.id))}
            />
          </div>
        </div>
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

export function PermissionGroupsPage() {
  const { data: groups, isLoading } = usePermissionGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <EzPageLayout
      header={
        <EzPageHeader
          title="Grupos de permissões"
          showBackButton={!!selectedGroupId}
          onBack={() => setSelectedGroupId(null)}
        />
      }
    >
      {selectedGroupId ? (
        <EzCardItem flat className="p-0">
          <GroupDetail groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />
        </EzCardItem>
      ) : (
        <EzCardItem flat className="overflow-hidden p-0">
          <div className="flex items-center justify-end gap-3 border-b border-gray-100 px-4 py-3">
            <EzButton size="small" leftIcon={Plus} onClick={() => setIsCreateOpen(true)}>
              Novo grupo
            </EzButton>
          </div>

          {isLoading ? (
            <div className="p-8">
              <EzSpinner label="Carregando grupos…" />
            </div>
          ) : !groups || groups.length === 0 ? (
            <EzEmptyCard title="Nenhum grupo de permissões cadastrado." />
          ) : (
            <div className="divide-y divide-gray-100 p-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className="block w-full text-left"
                >
                  <EzListItem description={group.description ?? undefined} className="rounded-[8px]">
                    {group.name}
                  </EzListItem>
                </button>
              ))}
            </div>
          )}
        </EzCardItem>
      )}

      {isCreateOpen && <CreateGroupModal onClose={() => setIsCreateOpen(false)} />}
    </EzPageLayout>
  );
}

export default PermissionGroupsPage;
