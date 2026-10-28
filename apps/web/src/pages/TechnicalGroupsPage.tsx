import { useState } from 'react';
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
  useTechnicalGroups,
  useTechnicalGroup,
  useCreateTechnicalGroup,
  useUpdateTechnicalGroup,
  useTechnicalGroupMemberMutations,
  useTechnicalGroupOrganizationMutations,
  useTechnicalGroupServiceDeskMutations,
} from '../hooks/useTechnicalGroups';

type DetailTab = 'info' | 'team' | 'access';

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

function useAllOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'all'],
    queryFn: async () => {
      const { data } = await api.get<SimpleRef[]>('/organizations');
      return data;
    },
  });
}

function useAllServiceDesks() {
  return useQuery({
    queryKey: ['service-desks', 'all'],
    queryFn: async () => {
      const { data } = await api.get<SimpleRef[]>('/service-desks');
      return data;
    },
  });
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateTechnicalGroup();

  const handleSubmit = () => {
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <EzModal isOpen onClose={onClose} title="Novo grupo de atendentes">
      <div className="space-y-4">
        <EzTextInput id="tg-name" label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <EzTextArea
          id="tg-description"
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
  const { data: group, isLoading } = useTechnicalGroup(groupId);
  const [tab, setTab] = useState<DetailTab>('info');
  const updateMutation = useUpdateTechnicalGroup(groupId);
  const { addMember, removeMember } = useTechnicalGroupMemberMutations(groupId);
  const { addOrganization, removeOrganization } = useTechnicalGroupOrganizationMutations(groupId);
  const { addServiceDesk, removeServiceDesk } = useTechnicalGroupServiceDeskMutations(groupId);

  const { data: allUsers } = useAllUsers();
  const { data: allOrganizations } = useAllOrganizations();
  const { data: allServiceDesks } = useAllServiceDesks();

  const [infoDraft, setInfoDraft] = useState<{ name: string; description: string } | null>(null);

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

  const memberIds = new Set(group.members.map((m) => m.id));
  const availableUsers = (allUsers ?? []).filter((u) => !memberIds.has(u.id));

  const orgIds = new Set(group.organizationLinks.map((l) => l.organization.id));
  const availableOrganizations = (allOrganizations ?? []).filter((o) => !orgIds.has(o.id));

  const deskIds = new Set(group.serviceDeskLinks.map((l) => l.serviceDesk.id));
  const availableServiceDesks = (allServiceDesks ?? []).filter((d) => !deskIds.has(d.id));

  return (
    <div className="space-y-5 p-5">
      <h2 className="text-[18px] font-semibold text-gray-900">{group.name}</h2>

      <EzTabs
        tabs={[
          { id: 'info', label: 'Informações' },
          { id: 'team', label: 'Equipe' },
          { id: 'access', label: 'Acessos' },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as DetailTab)}
      />

      {tab === 'info' && infoDraft && (
        <div className="space-y-4">
          <EzTextInput
            id="tg-detail-name"
            label="Nome"
            value={infoDraft.name}
            onChange={(e) => setInfoDraft({ ...infoDraft, name: e.target.value })}
          />
          <EzTextArea
            id="tg-detail-description"
            label="Descrição"
            value={infoDraft.description}
            onChange={(e) => setInfoDraft({ ...infoDraft, description: e.target.value })}
          />
          <EzCheck
            id="tg-daily-worklog"
            label="Enviar e-mail diário de apontamentos"
            checked={group.dailyWorklogEmailEnabled}
            onChange={(e) => updateMutation.mutate({ dailyWorklogEmailEnabled: e.target.checked })}
          />
          <EzCheck
            id="tg-schedule-enabled"
            label="Agenda habilitada"
            checked={group.scheduleEnabled}
            onChange={(e) => updateMutation.mutate({ scheduleEnabled: e.target.checked })}
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

      {tab === 'team' && (
        <EzDoubleList
          availableLabel="Usuários disponíveis"
          selectedLabel="Membros da equipe"
          available={availableUsers.map((u) => ({ id: u.id, label: u.name, description: u.email }))}
          selected={group.members.map((m) => ({ id: m.id, label: m.name, description: m.email }))}
          onAdd={(item) => addMember.mutate(String(item.id))}
          onRemove={(item) => removeMember.mutate(String(item.id))}
        />
      )}

      {tab === 'access' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Clientes</h3>
            <EzDoubleList
              availableLabel="Clientes disponíveis"
              selectedLabel="Clientes vinculados"
              available={availableOrganizations.map((o) => ({ id: o.id, label: o.name }))}
              selected={group.organizationLinks.map((l) => ({
                id: l.organization.id,
                label: l.organization.name,
              }))}
              onAdd={(item) => addOrganization.mutate(String(item.id))}
              onRemove={(item) => removeOrganization.mutate(String(item.id))}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Mesas de serviço</h3>
            <EzDoubleList
              availableLabel="Mesas disponíveis"
              selectedLabel="Mesas vinculadas"
              available={availableServiceDesks.map((d) => ({ id: d.id, label: d.name }))}
              selected={group.serviceDeskLinks.map((l) => ({
                id: l.serviceDesk.id,
                label: l.serviceDesk.name,
              }))}
              onAdd={(item) => addServiceDesk.mutate(String(item.id))}
              onRemove={(item) => removeServiceDesk.mutate(String(item.id))}
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

export function TechnicalGroupsPage() {
  const { data: groups, isLoading } = useTechnicalGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <EzPageLayout
      header={
        <EzPageHeader
          title="Grupos de atendentes"
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
            <EzEmptyCard title="Nenhum grupo de atendentes cadastrado." />
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

export default TechnicalGroupsPage;
