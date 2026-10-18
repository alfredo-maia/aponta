import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import {
  Contract,
  useContract,
  useContractOrganizations,
  useContracts,
  useDeleteContract,
  useSaveContract,
} from '../hooks/useContracts';
import { useAuthStore } from '../stores/authStore';
import {
  EzAlert,
  EzButton,
  EzEntityToolbar,
  EzModal,
  EzSpinner,
  EzTextInput,
} from '../components/ds';
import {
  ContractDetail,
  ContractForm,
  ContractList,
} from '../components/contracts/ContractViews';

function extractErrorMessage(error: unknown, fallback: string): string {
  const message = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
}

export function ContractsPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === 'ADMIN';
  const showFinancial = canManage || role === 'CLIENT_MASTER';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<Contract[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const contracts = useContracts(query);
  const detail = useContract(detailId);
  const organizations = useContractOrganizations(
    canManage && (creating || editing),
  );
  const save = useSaveContract();
  const deleteContract = useDeleteContract();
  const handleDelete = () => {
    if (selectedContracts.length === 0) return;
    const confirmMsg = `Deseja excluir ${selectedContracts.length} contrato(s) selecionado(s)?`;
    if (!window.confirm(confirmMsg)) return;
    setDeleteError(null);
    selectedContracts.forEach((contract) => {
      deleteContract.mutate(contract.id, {
        onError: (error) => {
          setDeleteError(
            extractErrorMessage(
              error,
              'Não foi possível excluir o contrato. Tente novamente.',
            ),
          );
        },
      });
    });
    setSelectedContracts([]);
  };
  const close = () => {
    if (save.isPending) return;
    setDetailId(null);
    setEditing(false);
    setCreating(false);
    save.reset();
  };
  const saved = () => {
    setDetailId(null);
    setEditing(false);
    setCreating(false);
    save.reset();
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Briefcase className="h-8 w-8" />
          Contratos
        </h1>
      </div>
      <EzEntityToolbar
        viewMode="GRID"
        showViewModeToggle={false}
        onToggleViewMode={() => {
          // Grid-only screen: there is no FORM mode to switch to.
        }}
        onRefresh={() => {
          void queryClient.invalidateQueries({ queryKey: ['contracts'] });
        }}
        onInsert={
          canManage
            ? () => {
                save.reset();
                setCreating(true);
              }
            : undefined
        }
        insertAriaLabel="Novo contrato"
        insertTooltip="Novo contrato"
        selectedCount={selectedContracts.length}
        onDelete={canManage ? handleDelete : undefined}
      />
      {deleteError && (
        <EzAlert variant="error" onClose={() => setDeleteError(null)}>
          {deleteError}
        </EzAlert>
      )}
      <form
        className="flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search.trim());
        }}
      >
        <EzTextInput
          id="contract-search"
          label="Pesquisar contratos"
          placeholder="Nome ou empresa"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <EzButton type="submit" variant="secondary" label="Pesquisar" />
      </form>
      <ContractList
        contracts={contracts.data}
        loading={contracts.isLoading}
        error={contracts.isError}
        showFinancial={showFinancial}
        onDetail={setDetailId}
        selectable
        onSelectionChange={setSelectedContracts}
      />
      <EzModal
        isOpen={creating || !!detailId}
        onClose={close}
        preventOutsideClose={save.isPending}
        title={
          creating
            ? 'Novo contrato'
            : editing
              ? 'Editar contrato'
              : 'Detalhes do contrato'
        }
        maxWidth="2xl"
        aria-label={creating ? 'Novo contrato' : 'Detalhes do contrato'}
      >
        {detailId && detail.isLoading && (
          <EzSpinner label="Carregando contrato..." />
        )}
        {detailId && detail.isError && (
          <EzAlert variant="error">Erro ao carregar o contrato.</EzAlert>
        )}
        {canManage && (creating || (editing && detail.data)) ? (
          <ContractForm
            key={creating ? 'new' : detailId}
            contract={creating ? undefined : detail.data}
            organizations={organizations.data || []}
            organizationsLoading={organizations.isLoading}
            organizationsError={organizations.isError}
            pending={save.isPending}
            error={
              save.isError
                ? extractErrorMessage(
                    save.error,
                    'Não foi possível salvar o contrato. Verifique os dados e tente novamente.',
                  )
                : undefined
            }
            onCancel={close}
            onSave={(values) =>
              save.mutate(
                { id: creating ? undefined : detailId || undefined, values },
                { onSuccess: saved },
              )
            }
          />
        ) : (
          detail.data && (
            <div className="space-y-6">
              <ContractDetail
                contract={detail.data}
                showFinancial={showFinancial}
              />
              {canManage && (
                <EzButton
                  label="Editar contrato"
                  onClick={() => {
                    save.reset();
                    setEditing(true);
                  }}
                />
              )}
            </div>
          )
        )}
      </EzModal>
    </div>
  );
}
