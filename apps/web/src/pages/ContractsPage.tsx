import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  EzComboBox,
  EzDynamicFilter,
  EzEntityScreenConfigModal,
  EzEntityToolbar,
  EzFilterDrawer,
  EzPageHeader,
  EzPageLayout,
  EzSpinner,
  EzTextInput,
} from '../components/ds';
import { applyDynamicFilters } from '../components/ds/EzDynamicFilter';
import type {
  EzDynamicFilterField,
  EzDynamicFilterRule,
} from '../components/ds/EzDynamicFilter';
import { useUserScreenConfig } from '../hooks/useUserScreenConfig';
import {
  ContractDetail,
  ContractForm,
  ContractList,
  modality,
} from '../components/contracts/ContractViews';

// Mesmo padrão de filtro dinâmico por coluna usado em Clientes (OrganizationsPage).
const CONTRACT_FILTER_FIELDS: EzDynamicFilterField[] = [
  {
    id: 'name',
    label: 'Contrato',
    getValue: (c: Contract) => c.name || 'Sem nome',
  },
  {
    id: 'organization',
    label: 'Empresa',
    getValue: (c: Contract) => c.organization?.name,
  },
  {
    id: 'modality',
    label: 'Modalidade',
    type: 'select',
    options: [
      { label: 'Empreito', value: 'Empreito' },
      { label: 'Horas Mensais + Excedente', value: 'Horas Mensais + Excedente' },
      { label: 'Horas Avulsas', value: 'Horas Avulsas' },
      { label: 'Cobertura', value: 'Cobertura' },
      { label: 'Pacote', value: 'Pacote' },
    ],
    getValue: (c: Contract) => modality(c),
  },
  {
    id: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Ativo', value: 'Ativo' },
      { label: 'Inativo', value: 'Inativo' },
    ],
    getValue: (c: Contract) => (c.active === false ? 'Inativo' : 'Ativo'),
  },
  {
    id: 'approved',
    label: 'Aprovação',
    type: 'select',
    options: [
      { label: 'Aprovado', value: 'Aprovado' },
      { label: 'Pendente', value: 'Pendente' },
    ],
    getValue: (c: Contract) => (c.approved ? 'Aprovado' : 'Pendente'),
  },
];

const CONTRACT_SCREEN_CONFIG_BASE_COLUMNS = [
  { id: 'contract', label: 'Contrato' },
  { id: 'organization', label: 'Empresa' },
  { id: 'modality', label: 'Modalidade' },
  { id: 'status', label: 'Status' },
];

const CONTRACT_SCREEN_CONFIG_FINANCIAL_COLUMNS = [
  { id: 'monthlyValue', label: 'Valor mensal' },
  { id: 'excessHourlyRate', label: 'Hora excedente' },
  { id: 'adjustmentDate', label: 'Reajuste' },
];

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
  // Sankhya parity (mesmo padrão de OrganizationsPage/ServiceDesksPage):
  // alternância Modo Grade (lista) / Modo Formulário (página cheia), sem
  // modal. `editing`/`creating` continuam distinguindo, dentro do modo
  // formulário, criação de um novo registro vs. visualização/edição de um
  // existente.
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedContracts, setSelectedContracts] = useState<Contract[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const contracts = useContracts('');
  const detail = useContract(selectedContractId);
  const organizations = useContractOrganizations(
    canManage && (creating || editing),
  );
  const save = useSaveContract();
  const deleteContract = useDeleteContract();

  // Padrão Sankhya (parity com Clientes/Parceiros): painel de filtros lateral
  // com filtro dinâmico por coluna e filtros salvos, além da configuração de
  // tela (colunas/densidade) por usuário.
  const {
    config: screenConfig,
    setColumnVisibility,
    setDensity,
    setFormLayout,
    saveFilter,
    deleteFilter,
    restoreDefaults,
  } = useUserScreenConfig('contracts', {
    grid: { columnVisibility: {}, density: 'compact' },
    form: { layout: 'CASCADE' },
    viewMode: 'GRID',
  });

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isScreenConfigModalOpen, setIsScreenConfigModalOpen] =
    useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [dynamicRules, setDynamicRules] = useState<EzDynamicFilterRule[]>([]);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<
    string | null
  >(null);

  const filteredContracts = useMemo(() => {
    const base = (contracts.data ?? []).filter((contract) => {
      if (filterStatus === 'ACTIVE' && !contract.active) return false;
      if (filterStatus === 'INACTIVE' && contract.active) return false;
      if (filterSearch.trim()) {
        const query = filterSearch.toLowerCase().trim();
        const matchesName = (contract.name || '')
          .toLowerCase()
          .includes(query);
        const matchesOrganization = (contract.organization?.name || '')
          .toLowerCase()
          .includes(query);
        if (!matchesName && !matchesOrganization) return false;
      }
      return true;
    });
    return applyDynamicFilters(base, dynamicRules, CONTRACT_FILTER_FIELDS);
  }, [contracts.data, filterStatus, filterSearch, dynamicRules]);

  const screenConfigColumns = useMemo(() => {
    const base = showFinancial
      ? [
          ...CONTRACT_SCREEN_CONFIG_BASE_COLUMNS,
          ...CONTRACT_SCREEN_CONFIG_FINANCIAL_COLUMNS,
        ]
      : CONTRACT_SCREEN_CONFIG_BASE_COLUMNS;
    return base.map((column) => ({
      ...column,
      isVisible: screenConfig.grid.columnVisibility[column.id] !== false,
    }));
  }, [showFinancial, screenConfig.grid.columnVisibility]);

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

  const openDetail = (id: string) => {
    const idx = filteredContracts.findIndex((contract) => contract.id === id);
    if (idx !== -1) {
      setFocusedIndex(idx);
      setSelectedContracts([filteredContracts[idx]]);
    }
    setEditing(false);
    setCreating(false);
    setSelectedContractId(id);
    setMode('form');
  };

  const backToList = () => {
    setMode('list');
    setSelectedContractId(null);
    setEditing(false);
    setCreating(false);
    save.reset();
  };

  const handleInsert = () => {
    save.reset();
    setCreating(true);
    setEditing(false);
    setSelectedContractId(null);
    setMode('form');
  };

  const handlePrevious = () => {
    if (focusedIndex > 0) {
      const newIdx = focusedIndex - 1;
      setFocusedIndex(newIdx);
      const target = filteredContracts[newIdx];
      if (target) {
        setSelectedContracts([target]);
        if (mode === 'form' && selectedContractId) {
          openDetail(target.id);
        }
      }
    }
  };

  const handleNext = () => {
    if (focusedIndex < filteredContracts.length - 1) {
      const newIdx = focusedIndex + 1;
      setFocusedIndex(newIdx);
      const target = filteredContracts[newIdx];
      if (target) {
        setSelectedContracts([target]);
        if (mode === 'form' && selectedContractId) {
          openDetail(target.id);
        }
      }
    }
  };

  const saved = () => {
    backToList();
  };

  return (
    <EzPageLayout
      header={
        <EzPageHeader
          title={
            mode === 'form'
              ? creating
                ? 'Novo contrato'
                : detail.data?.name || 'Detalhes do contrato'
              : 'Contratos'
          }
          showBackButton={mode === 'form'}
          onBack={backToList}
        />
      }
    >
    <div className="space-y-6">
      {deleteError && (
        <EzAlert variant="error" onClose={() => setDeleteError(null)}>
          {deleteError}
        </EzAlert>
      )}
      <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden shadow-xs flex flex-col">
        <EzEntityToolbar
          viewMode={mode === 'list' ? 'GRID' : 'FORM'}
          onToggleViewMode={(nextMode) => {
            if (nextMode === 'FORM') {
              const active =
                selectedContracts[0] ??
                filteredContracts[focusedIndex] ??
                filteredContracts[0];
              if (active) {
                openDetail(active.id);
              } else {
                handleInsert();
              }
            } else {
              backToList();
            }
          }}
          isFilterOpen={isFilterPanelOpen}
          onToggleFilter={() => setIsFilterPanelOpen((prev) => !prev)}
          onRefresh={() => {
            void queryClient.invalidateQueries({ queryKey: ['contracts'] });
          }}
          onInsert={canManage ? handleInsert : undefined}
          insertAriaLabel="Novo contrato"
          insertTooltip="Novo contrato"
          hasPrevious={focusedIndex > 0}
          onPrevious={handlePrevious}
          hasNext={focusedIndex < filteredContracts.length - 1}
          onNext={handleNext}
          selectedCount={selectedContracts.length}
          onDelete={canManage ? handleDelete : undefined}
          onOpenGridConfig={() => setIsScreenConfigModalOpen(true)}
          onOpenScreenConfig={() => setIsScreenConfigModalOpen(true)}
          recordCountText={
            mode === 'form' && selectedContractId
              ? `${focusedIndex >= 0 ? focusedIndex + 1 : 1} de ${filteredContracts.length}`
              : undefined
          }
        />

        {mode === 'form' && (
          <div className="p-4 md:p-6 space-y-6">
            {selectedContractId && detail.isLoading && (
              <EzSpinner label="Carregando contrato..." />
            )}
            {selectedContractId && detail.isError && (
              <EzAlert variant="error">Erro ao carregar o contrato.</EzAlert>
            )}
            {canManage && (creating || (editing && detail.data)) ? (
              <ContractForm
                key={creating ? 'new' : selectedContractId}
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
                onCancel={backToList}
                onSave={(values) =>
                  save.mutate(
                    {
                      id: creating ? undefined : selectedContractId || undefined,
                      values,
                    },
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
          </div>
        )}

        {mode === 'list' && (
        <div className="flex flex-1 overflow-hidden min-h-[420px]">
          <EzFilterDrawer
            isOpen={isFilterPanelOpen}
            onClose={() => setIsFilterPanelOpen(false)}
            onClear={() => {
              setFilterSearch('');
              setFilterStatus('ALL');
              setDynamicRules([]);
              setActiveSavedFilterId(null);
            }}
            title="Filtros de Contratos"
            savedFilters={screenConfig.savedFilters}
            activeSavedFilterId={activeSavedFilterId}
            onApplySavedFilter={(sf) => {
              setActiveSavedFilterId(sf.id);
              if (sf.criteria.search !== undefined)
                setFilterSearch(sf.criteria.search);
              if (sf.criteria.status !== undefined)
                setFilterStatus(sf.criteria.status);
              setDynamicRules(
                Array.isArray(sf.criteria.rules) ? sf.criteria.rules : [],
              );
            }}
            onSaveCurrentFilter={(name) => {
              saveFilter(name, {
                search: filterSearch,
                status: filterStatus,
                rules: dynamicRules,
              });
            }}
            onDeleteSavedFilter={(id) => {
              deleteFilter(id);
              if (activeSavedFilterId === id) setActiveSavedFilterId(null);
            }}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="contract-filter-search-input"
                  className="text-xs font-medium text-gray-700"
                >
                  Buscar Contrato/Empresa
                </label>
                <EzTextInput
                  id="contract-filter-search-input"
                  placeholder="Nome do contrato ou empresa…"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="contract-filter-status-select"
                  className="text-xs font-medium text-gray-700"
                >
                  Status
                </label>
                <EzComboBox
                  id="contract-filter-status-select"
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                  }
                >
                  <option value="ALL">Todos os status</option>
                  <option value="ACTIVE">Apenas Ativos</option>
                  <option value="INACTIVE">Apenas Inativos</option>
                </EzComboBox>
              </div>

              <EzDynamicFilter
                fields={CONTRACT_FILTER_FIELDS}
                rules={dynamicRules}
                onChange={setDynamicRules}
              />
            </div>
          </EzFilterDrawer>

          <div className="flex-1 p-3 overflow-x-auto min-w-0 flex flex-col">
            <ContractList
              contracts={filteredContracts}
              loading={contracts.isLoading}
              error={contracts.isError}
              showFinancial={showFinancial}
              onDetail={openDetail}
              selectable
              onSelectionChange={setSelectedContracts}
              density={screenConfig.grid.density}
              initialColumnVisibility={screenConfig.grid.columnVisibility}
            />
          </div>
        </div>
        )}
      </div>
      {isScreenConfigModalOpen && (
        <EzEntityScreenConfigModal
          columns={screenConfigColumns}
          onToggleColumn={(colId) =>
            setColumnVisibility((prev) => ({
              ...prev,
              [colId]: !prev[colId],
            }))
          }
          density={screenConfig.grid.density}
          onDensityChange={setDensity}
          formLayout={screenConfig.form.layout}
          onFormLayoutChange={setFormLayout}
          onRestoreDefaults={restoreDefaults}
          onClose={() => setIsScreenConfigModalOpen(false)}
          initialTab="grid"
        />
      )}
    </div>
    </EzPageLayout>
  );
}
