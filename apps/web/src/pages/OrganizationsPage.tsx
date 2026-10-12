import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useState, useMemo } from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  EzAlert,
  EzButton,
  EzCardItem,
  EzCheck,
  EzComboBox,
  EzEmptyCard,
  EzEntityGrid,
  EzEntityToolbar,
  EzEntityScreenConfigModal,
  EzFilterDrawer,
  EzMultiSelect,
  EzPageHeader,
  EzPageLayout,
  EzSpinner,
  EzTabs,
  EzTextArea,
  EzTextInput,
} from '../components/ds';
import { useUserScreenConfig } from '../hooks/useUserScreenConfig';

interface OrganizationAddress {
  id: string;
  zipCode?: string | null;
  street?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  complement?: string | null;
}

interface OrganizationContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
}

interface ServiceDeskRef {
  id: string;
  name: string;
}

interface AgentGroup {
  id: string;
  name: string;
  active: boolean;
  members: { id: string; name: string; email: string }[];
}

interface Organization {
  id: string;
  name: string;
  legalName?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  documentType?: 'CNPJ' | 'CPF' | null;
  municipalRegistration?: string | null;
  stateRegistration?: string | null;
  active?: boolean;
  serviceType?: string | null;
  healthStatus?: string | null;
  workFolder?: string | null;
  notes?: string | null;
  visibleToClients?: boolean;
  quarterlyBilling?: boolean;
  _count?: { users: number };
}

interface OrganizationDetail extends Organization {
  users: User[];
  addresses: OrganizationAddress[];
  contacts: OrganizationContact[];
  serviceDesks: ServiceDeskRef[];
  agentGroups: AgentGroup[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
}

interface CnpjLookupResult {
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  address: {
    zipCode: string | null;
    street: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    complement: string | null;
  };
}

const orgFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  legalName: z.string().trim().optional(),
  documentType: z.enum(['CNPJ', 'CPF']).optional(),
  cnpj: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  municipalRegistration: z.string().trim().optional(),
  stateRegistration: z.string().trim().optional(),
  workFolder: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  visibleToClients: z.boolean().optional(),
  quarterlyBilling: z.boolean().optional(),
});

type OrgFormValues = z.infer<typeof orgFormSchema>;

const addressFormSchema = z.object({
  zipCode: z.string().trim().optional(),
  street: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  complement: z.string().trim().optional(),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  type: z.string().trim().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const agentGroupFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
});

type AgentGroupFormValues = z.infer<typeof agentGroupFormSchema>;

function formatCnpj(value?: string | null) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

type DetailTab = 'users' | 'resources' | 'relationships' | 'billing';

export function OrganizationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  // Tiflux-parity (#57): padrão Sankhya de alternância Modo Lista / Modo
  // Formulário (EzPageHeader), substituindo o antigo modal único.
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [groupByStatus, setGroupByStatus] = useState(false);
  const [detailOrgId, setDetailOrgId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('users');
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<{ serviceType: string; healthStatus: string } | null>(null);
  const [linkDeskId, setLinkDeskId] = useState<string>('');
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<(string | number)[]>([]);

  // Sankhya Parity (br.com.sankhya.core.cad.parceiros): toolbar, drawer, personalização por usuário
  const {
    config: screenConfig,
    setColumnVisibility,
    setDensity,
    setFormLayout,
    restoreDefaults,
  } = useUserScreenConfig('organizations', {
    grid: {
      columnVisibility: {
        legalName: true,
        document: true,
        stateRegistration: false,
        municipalRegistration: false,
        workFolder: false,
        serviceType: false,
        healthStatus: false,
      },
      density: 'compact',
    },
    form: {
      layout: 'CASCADE',
    },
    viewMode: 'GRID',
  });

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterDocType, setFilterDocType] = useState<'ALL' | 'CNPJ' | 'CPF'>('ALL');
  const [isScreenConfigModalOpen, setIsScreenConfigModalOpen] = useState(false);
  const [screenConfigInitialTab, setScreenConfigInitialTab] = useState<'grid' | 'form'>('grid');
  const [selectedOrgs, setSelectedOrgs] = useState<Organization[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: orgs, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get<Organization[]>('/organizations');
      return data;
    },
    enabled: isAdmin,
  });

  const { data: usersList, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/users');
      return data;
    },
    enabled: isAdmin,
  });

  const { data: serviceDesks } = useQuery({
    queryKey: ['service-desks', 'all-for-org-link'],
    queryFn: async () => {
      const { data } = await api.get<ServiceDeskRef[]>('/service-desks');
      return data;
    },
    enabled: isAdmin && mode === 'form' && !!detailOrgId,
  });

  const { data: orgDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['organizations', detailOrgId],
    queryFn: async () => {
      const { data } = await api.get<OrganizationDetail>(`/organizations/${detailOrgId}`);
      return data;
    },
    enabled: isAdmin && !!detailOrgId,
  });

  const { register, handleSubmit, reset, setValue, getValues, watch, formState: { errors } } = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: {
      name: '', legalName: '', documentType: 'CNPJ', cnpj: '', cpf: '',
      municipalRegistration: '', stateRegistration: '', workFolder: '', notes: '',
      visibleToClients: true, quarterlyBilling: false,
    },
  });

  const documentType = watch('documentType');

  const {
    register: registerAddress,
    handleSubmit: handleAddressSubmit,
    reset: resetAddressForm,
    formState: { errors: addressErrors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: { zipCode: '', street: '', neighborhood: '', city: '', state: '', complement: '' },
  });

  const {
    register: registerContact,
    handleSubmit: handleContactSubmit,
    reset: resetContactForm,
    formState: { errors: contactErrors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: '', email: '', phone: '', type: '' },
  });

  const {
    register: registerAgentGroup,
    handleSubmit: handleAgentGroupSubmit,
    reset: resetAgentGroupForm,
    formState: { errors: agentGroupErrors },
  } = useForm<AgentGroupFormValues>({
    resolver: zodResolver(agentGroupFormSchema),
    defaultValues: { name: '' },
  });

  const createMutation = useMutation({
    mutationFn: async (values: OrgFormValues) => {
      const { data } = await api.post<Organization>('/organizations', values);
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      reset();
      setMode('list');
      openDetail(data.id);
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async (values: Partial<Organization>) => {
      const { data } = await api.patch<Organization>(`/organizations/${detailOrgId}`, values);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
    },
  });

  const attachUserMutation = useMutation({
    mutationFn: async ({ userId, orgId }: { userId: string; orgId: string | null }) => {
      await api.patch(`/users/${userId}`, { organizationId: orgId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
    }
  });

  const cnpjLookupMutation = useMutation({
    mutationFn: async (cnpj: string) => {
      const { data } = await api.get<CnpjLookupResult>('/organizations/cnpj-lookup', { params: { cnpj } });
      return data;
    },
    onSuccess: (data) => {
      setCnpjLookupError(null);
      setValue('documentType', 'CNPJ');
      setValue('cnpj', data.cnpj);
      setValue('legalName', data.legalName);
      if (data.tradeName) setValue('name', data.tradeName);
    },
    onError: () => {
      setCnpjLookupError('CNPJ não encontrado ou inválido. Verifique e tente novamente.');
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      const { data } = await api.post(`/organizations/${detailOrgId}/addresses`, values);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
      resetAddressForm();
    },
  });

  const removeAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await api.delete(`/organizations/${detailOrgId}/addresses/${addressId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (values: ContactFormValues) => {
      const { data } = await api.post(`/organizations/${detailOrgId}/contacts`, values);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
      resetContactForm();
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await api.delete(`/organizations/${detailOrgId}/contacts/${contactId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
    },
  });

  // Tiflux-parity (#57): aba "Relacionamentos" — Mesa<->Cliente N:N.
  const linkDeskMutation = useMutation({
    mutationFn: async (deskId: string) => {
      await api.post(`/organizations/${detailOrgId}/service-desks/${deskId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
      setLinkDeskId('');
    },
  });

  const unlinkDeskMutation = useMutation({
    mutationFn: async (deskId: string) => {
      await api.delete(`/organizations/${detailOrgId}/service-desks/${deskId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
    },
  });

  // Tiflux-parity (#57): Grupo de Atendentes — entidade por cliente.
  const createAgentGroupMutation = useMutation({
    mutationFn: async (values: AgentGroupFormValues) => {
      const { data } = await api.post(`/organizations/${detailOrgId}/agent-groups`, {
        ...values,
        memberIds: newGroupMemberIds,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
      resetAgentGroupForm();
      setNewGroupMemberIds([]);
    },
  });

  const removeAgentGroupMutation = useMutation({
    mutationFn: async (agentGroupId: string) => {
      await api.delete(`/organizations/${detailOrgId}/agent-groups/${agentGroupId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
    },
  });

  const openDetail = (orgId: string) => {
    setDetailTab('users');
    setDetailOrgId(orgId);
    setProfileDraft(null);
    setMode('form');
  };

  const backToList = () => {
    setMode('list');
    setDetailOrgId(null);
  };

  if (orgDetail && profileDraft === null) {
    setProfileDraft({
      serviceType: orgDetail.serviceType ?? '',
      healthStatus: orgDetail.healthStatus ?? '',
    });
  }

  const linkedDeskIds = new Set((orgDetail?.serviceDesks ?? []).map((d) => d.id));
  const availableDesksToLink = (serviceDesks ?? []).filter((d) => !linkedDeskIds.has(d.id));

  const userOptions = (usersList ?? []).map((u) => ({ label: `${u.name} (${u.email})`, value: u.id }));

  const orgColumns = useMemo<ColumnDef<Organization>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openDetail(row.original.id)}
            className="text-left font-medium text-brand-700 hover:underline cursor-pointer"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'legalName',
        header: 'Razão Social',
        cell: ({ row }) => (
          <span className="text-gray-900 text-xs">
            {row.original.legalName || '—'}
          </span>
        ),
      },
      {
        id: 'document',
        header: 'CPF / CNPJ',
        cell: ({ row }) => {
          const doc = row.original.documentType === 'CPF' ? row.original.cpf : row.original.cnpj;
          if (!doc) return <span className="text-gray-400 text-xs">—</span>;
          return (
            <span className="font-mono text-xs text-gray-700">
              {row.original.documentType === 'CPF' ? doc : formatCnpj(doc)}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        // accessorFn dá ao EzEntityGrid um valor textual real para agrupar (groupBy=['status']);
        accessorFn: (org) => (org.active === false ? 'Inativo' : 'Ativo'),
        cell: ({ row }) =>
          row.original.active === false ? (
            <span className="text-xs font-medium text-gray-500 bg-gray-90 px-2 py-0.5 rounded-full">
              Inativo
            </span>
          ) : (
            <span className="text-xs text-gray-500">Ativo</span>
          ),
      },
      {
        id: 'clientes',
        header: 'Clientes',
        cell: ({ row }) => <span className="text-xs text-gray-500">{row.original._count?.users || 0}</span>,
      },
      {
        accessorKey: 'stateRegistration',
        header: 'Inscrição Estadual',
        cell: ({ row }) => (
          <span className="text-gray-600 text-xs">
            {row.original.stateRegistration || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'municipalRegistration',
        header: 'Inscrição Municipal',
        cell: ({ row }) => (
          <span className="text-gray-600 text-xs">
            {row.original.municipalRegistration || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'workFolder',
        header: 'Pasta de Trabalho',
        cell: ({ row }) => (
          <span className="text-gray-500 font-mono text-xs truncate max-w-xs block">
            {row.original.workFolder || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'serviceType',
        header: 'Perfil',
        cell: ({ row }) => (
          <span className="text-gray-600 text-xs">
            {row.original.serviceType || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'healthStatus',
        header: 'Saúde',
        cell: ({ row }) => (
          <span className="text-gray-600 text-xs">
            {row.original.healthStatus || '—'}
          </span>
        ),
      },
    ],
    []
  );

  const screenConfigColumns = useMemo(() => {
    return orgColumns.map((c) => {
      const colId = (c as any).accessorKey ?? c.id ?? '';
      const label = typeof c.header === 'string' ? c.header : colId;
      const isVisible = screenConfig.grid.columnVisibility[colId] !== false;
      return { id: colId, label, isVisible };
    });
  }, [orgColumns, screenConfig.grid.columnVisibility]);

  const filteredOrgs = useMemo(() => {
    return (orgs ?? []).filter((org) => {
      if (filterStatus === 'ACTIVE' && org.active === false) return false;
      if (filterStatus === 'INACTIVE' && org.active !== false) return false;
      if (filterDocType === 'CNPJ' && org.documentType === 'CPF') return false;
      if (filterDocType === 'CPF' && org.documentType !== 'CPF') return false;
      if (filterSearch.trim()) {
        const query = filterSearch.toLowerCase().trim();
        const matchesName = org.name.toLowerCase().includes(query);
        const matchesLegal = org.legalName?.toLowerCase().includes(query);
        const matchesCnpj = org.cnpj?.includes(query);
        const matchesCpf = org.cpf?.includes(query);
        if (!matchesName && !matchesLegal && !matchesCnpj && !matchesCpf) return false;
      }
      return true;
    });
  }, [orgs, filterStatus, filterDocType, filterSearch]);

  const handlePrevious = () => {
    if (focusedIndex > 0) {
      setFocusedIndex((prev) => prev - 1);
      setSelectedOrgs([filteredOrgs[focusedIndex - 1]]);
    }
  };

  const handleNext = () => {
    if (focusedIndex < filteredOrgs.length - 1) {
      setFocusedIndex((prev) => prev + 1);
      setSelectedOrgs([filteredOrgs[focusedIndex + 1]]);
    }
  };

  const handleDelete = () => {
    if (selectedOrgs.length === 0) return;
    const confirmMsg = `Deseja inativar ${selectedOrgs.length} empresa(s) selecionada(s)?`;
    if (window.confirm(confirmMsg)) {
      selectedOrgs.forEach((o) => {
        updateOrgMutation.mutate({ active: false });
      });
      setSelectedOrgs([]);
    }
  };

  const handleClone = () => {
    const active = selectedOrgs[0] ?? filteredOrgs[focusedIndex];
    if (!active) return;
    setValue('name', `${active.name} (Cópia)`);
    setValue('legalName', active.legalName ?? '');
    setValue('documentType', active.documentType ?? 'CNPJ');
    setValue('workFolder', active.workFolder ?? '');
    setDetailOrgId(null);
    setMode('form');
  };

  const toolbarActions = [
    {
      label: 'Consultar CNPJ na Receita',
      onClick: () => {
        const active = selectedOrgs[0] ?? filteredOrgs[focusedIndex];
        if (active?.cnpj) {
          cnpjLookupMutation.mutate(active.cnpj);
        }
      },
    },
  ];

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-[20px] font-semibold text-gray-900">Empresas</h1>
        <p className="text-sm text-gray-500">Somente administradores podem gerenciar empresas.</p>
      </div>
    );
  }

  return (
    <EzPageLayout
      header={
        <EzPageHeader
          title="Empresas (Organizações)"
          showBackButton={mode === 'form'}
          onBack={backToList}
          actions={
            mode === 'list' ? (
              <EzButton size="small" onClick={() => { reset(); setDetailOrgId(null); setMode('form'); }}>
                Novo Cliente
              </EzButton>
            ) : undefined
          }
          activeMode={mode === 'list' || !detailOrgId ? mode : undefined}
          onModeChange={!detailOrgId ? setMode : undefined}
        />
      }
    >
      <div className="space-y-6">
        {mode === 'list' && (
          isLoadingOrgs ? (
            <EzSpinner label="Carregando…" />
          ) : (
            <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden shadow-xs flex flex-col">
              {/* Sankhya Standard Entity Toolbar */}
              <EzEntityToolbar
                viewMode="GRID"
                onToggleViewMode={(nextMode) => {
                  if (nextMode === 'FORM') {
                    const active = selectedOrgs[0] ?? filteredOrgs[focusedIndex] ?? filteredOrgs[0];
                    if (active) {
                      openDetail(active.id);
                    } else {
                      reset();
                      setDetailOrgId(null);
                      setMode('form');
                    }
                  }
                }}
                isFilterOpen={isFilterPanelOpen}
                onToggleFilter={() => setIsFilterPanelOpen((prev) => !prev)}
                onInsert={() => {
                  reset();
                  setDetailOrgId(null);
                  setMode('form');
                }}
                hasPrevious={focusedIndex > 0}
                onPrevious={handlePrevious}
                hasNext={focusedIndex < filteredOrgs.length - 1}
                onNext={handleNext}
                selectedCount={selectedOrgs.length}
                onDelete={handleDelete}
                onClone={handleClone}
                onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['organizations'] })}
                onOpenGridConfig={() => {
                  setScreenConfigInitialTab('grid');
                  setIsScreenConfigModalOpen(true);
                }}
                onOpenFormConfig={() => {
                  setScreenConfigInitialTab('form');
                  setIsScreenConfigModalOpen(true);
                }}
                onOpenScreenConfig={() => {
                  setScreenConfigInitialTab('grid');
                  setIsScreenConfigModalOpen(true);
                }}
                recordCountText={`${filteredOrgs.length === 0 ? 0 : 1} - ${filteredOrgs.length} de ${filteredOrgs.length}`}
                actions={toolbarActions}
              />

              <div className="flex flex-1 overflow-hidden min-h-[420px]">
                {/* Lateral Filter Drawer */}
                <EzFilterDrawer
                  isOpen={isFilterPanelOpen}
                  onClose={() => setIsFilterPanelOpen(false)}
                  onClear={() => {
                    setFilterSearch('');
                    setFilterStatus('ALL');
                    setFilterDocType('ALL');
                  }}
                  title="Filtros de Clientes"
                >
                  <div className="p-4 space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="filter-search-input" className="text-xs font-medium text-gray-700">
                        Buscar Parceiro
                      </label>
                      <EzTextInput
                        id="filter-search-input"
                        placeholder="Nome, Razão Social, CNPJ…"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="filter-status-select" className="text-xs font-medium text-gray-700">
                        Status
                      </label>
                      <EzComboBox
                        id="filter-status-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                      >
                        <option value="ALL">Todos os status</option>
                        <option value="ACTIVE">Apenas Ativos</option>
                        <option value="INACTIVE">Apenas Inativos</option>
                      </EzComboBox>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="filter-doctype-select" className="text-xs font-medium text-gray-700">
                        Tipo de Documento
                      </label>
                      <EzComboBox
                        id="filter-doctype-select"
                        value={filterDocType}
                        onChange={(e) => setFilterDocType(e.target.value as any)}
                      >
                        <option value="ALL">Todos os documentos</option>
                        <option value="CNPJ">Pessoa Jurídica (CNPJ)</option>
                        <option value="CPF">Pessoa Física (CPF)</option>
                      </EzComboBox>
                    </div>
                  </div>
                </EzFilterDrawer>

                {/* Grid Content */}
                <div className="flex-1 p-3 overflow-x-auto min-w-0 flex flex-col">
                  {orgs?.length === 0 ? (
                    <div className="p-4">
                      <EzEmptyCard title="Nenhuma empresa cadastrada ainda." />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-end gap-2 px-2 py-1.5 border-b border-gray-100 mb-2">
                        <EzCheck
                          id="org-group-by-status"
                          label="Agrupar por status"
                          checked={groupByStatus}
                          onChange={(e) => setGroupByStatus(e.target.checked)}
                        />
                      </div>
                      <EzEntityGrid
                        columns={orgColumns}
                        data={filteredOrgs}
                        showRowNumbers
                        selectable
                        showGridCornerMenu
                        enableColumnMenu
                        enableColumnFilters
                        zebraStriping
                        density={screenConfig.grid.density}
                        initialColumnVisibility={screenConfig.grid.columnVisibility}
                        showStatusBar
                        groupBy={groupByStatus ? ['status'] : undefined}
                        pageSize={groupByStatus ? undefined : 10}
                        onSelectionChange={(selected) => {
                          setSelectedOrgs(selected);
                          if (selected.length > 0) {
                            const idx = filteredOrgs.findIndex((o) => o.id === selected[0].id);
                            if (idx !== -1) setFocusedIndex(idx);
                          }
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {mode === 'form' && !detailOrgId && (
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            noValidate
            className="max-w-3xl"
          >
            <EzCardItem flat className="p-4 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Nova Empresa</h2>

              <div className="grid grid-cols-2 gap-3">
                <EzComboBox
                  id="org-document-type"
                  label="Tipo de Documento"
                  {...register('documentType')}
                >
                  <option value="CNPJ">CNPJ (Pessoa Jurídica)</option>
                  <option value="CPF">CPF (Pessoa Física)</option>
                </EzComboBox>
              </div>

              {documentType === 'CPF' ? (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <EzTextInput id="org-cpf" label="CPF" placeholder="000.000.000-00" {...register('cpf')} />
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <EzTextInput id="org-cnpj" label="CNPJ" placeholder="00.000.000/0000-00" {...register('cnpj')} />
                  </div>
                  <EzButton
                    type="button"
                    variant="secondary"
                    leftIcon={Search}
                    disabled={cnpjLookupMutation.isPending}
                    onClick={() => {
                      const cnpj = getValues('cnpj');
                      if (cnpj) cnpjLookupMutation.mutate(cnpj);
                    }}
                  >
                    Buscar CNPJ
                  </EzButton>
                </div>
              )}

              {cnpjLookupError && (
                <EzAlert variant="error" onClose={() => setCnpjLookupError(null)}>
                  {cnpjLookupError}
                </EzAlert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <EzTextInput id="org-legal-name" label="Razão Social" {...register('legalName')} />
                <EzTextInput
                  id="org-name"
                  label="Nome Fantasia"
                  hasError={!!errors.name}
                  message={errors.name?.message}
                  {...register('name')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <EzTextInput id="org-state-registration" label="Inscrição Estadual" {...register('stateRegistration')} />
                <EzTextInput id="org-municipal-registration" label="Inscrição Municipal" {...register('municipalRegistration')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <EzTextInput id="org-work-folder" label="Pasta de Trabalho" {...register('workFolder')} />
                <div className="flex items-center gap-3 pt-6">
                  <EzCheck id="org-visible" label="Visível para clientes" {...register('visibleToClients')} />
                  <EzCheck id="org-quarterly" label="Faturamento quarteirizado" {...register('quarterlyBilling')} />
                </div>
              </div>

              <EzTextArea id="org-notes" label="Anotações" rows={3} {...register('notes')} />

              <div className="flex justify-end">
                <EzButton type="submit" disabled={createMutation.isPending}>
                  Cadastrar
                </EzButton>
              </div>
            </EzCardItem>
          </form>
        )}

        {mode === 'form' && detailOrgId && (
          isLoadingDetail || !orgDetail ? (
            <EzSpinner label="Carregando…" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-gray-900">{orgDetail.name}</h2>
                <div className="flex items-center gap-2 text-sm">
                  <EzCheck
                    id="org-active-toggle"
                    label="Cliente ativo"
                    checked={orgDetail.active !== false}
                    disabled={updateOrgMutation.isPending}
                    onChange={(e) => updateOrgMutation.mutate({ active: e.target.checked })}
                  />
                </div>
              </div>

              {/* Painel principal (Tiflux-parity, aba "Informações" do cliente real) */}
              <EzCardItem flat className="p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Nome Fantasia</div>
                    <div className="text-gray-900 font-medium">{orgDetail.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Razão Social</div>
                    <div className="text-gray-900 font-medium">{orgDetail.legalName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">CPF/CNPJ</div>
                    <div className="text-gray-900 font-medium">
                      {orgDetail.documentType === 'CPF' ? (orgDetail.cpf || '—') : (formatCnpj(orgDetail.cnpj) || '—')}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">Inscrição Estadual</div>
                    <div className="text-gray-900 font-medium">{orgDetail.stateRegistration || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Inscrição Municipal</div>
                    <div className="text-gray-900 font-medium">{orgDetail.municipalRegistration || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Recursos cadastrados</div>
                    <div className="text-gray-900 font-medium">-- / 0 disponíveis / 0 em uso</div>
                  </div>

                  <div>
                    <div className="text-gray-500">Pasta de Trabalho</div>
                    <div className="text-gray-900 font-medium">{orgDetail.workFolder || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EzCheck
                      id="org-visible-toggle"
                      label="Visível para clientes"
                      checked={orgDetail.visibleToClients !== false}
                      disabled={updateOrgMutation.isPending}
                      onChange={(e) => updateOrgMutation.mutate({ visibleToClients: e.target.checked })}
                    />
                  </div>
                  <div>
                    <div className="text-gray-500">Agentes inteligentes</div>
                    <div className="text-gray-900 font-medium">-- / 0 disponíveis / 0 em uso</div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-gray-500">Anotações</div>
                    <div className="text-gray-900 font-medium">{orgDetail.notes || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EzCheck
                      id="org-quarterly-toggle"
                      label="Faturamento quarteirizado"
                      checked={orgDetail.quarterlyBilling === true}
                      disabled={updateOrgMutation.isPending}
                      onChange={(e) => updateOrgMutation.mutate({ quarterlyBilling: e.target.checked })}
                    />
                  </div>
                </div>
              </EzCardItem>

              <EzTabs
                tabs={[
                  { id: 'users', label: 'Usuários' },
                  { id: 'resources', label: 'Recursos' },
                  { id: 'relationships', label: 'Relacionamentos' },
                  { id: 'billing', label: 'Faturamento' },
                ]}
                activeTab={detailTab}
                onChange={(tabId) => setDetailTab(tabId as DetailTab)}
              />

              {detailTab === 'users' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <EzTextInput id="org-legal-name-edit" label="Razão Social" defaultValue={orgDetail.legalName ?? ''}
                      onBlur={(e) => { if (e.target.value !== (orgDetail.legalName ?? '')) updateOrgMutation.mutate({ legalName: e.target.value }); }} />
                    <EzTextInput id="org-name-edit" label="Nome Fantasia" defaultValue={orgDetail.name ?? ''}
                      onBlur={(e) => { if (e.target.value !== orgDetail.name) updateOrgMutation.mutate({ name: e.target.value }); }} />
                  </div>

                  <h4 className="text-sm font-semibold text-gray-900">Usuários vinculados</h4>
                  {isLoadingUsers ? <EzSpinner label="Carregando usuários…" /> : (
                    <div className="max-h-72 overflow-y-auto space-y-2 border border-gray-200 rounded-[12px] p-3">
                      {(usersList ?? []).filter(u => u.role.includes('CLIENT')).map(u => {
                        const isPinned = u.organizationId === detailOrgId;
                        return (
                          <div key={u.id} className="flex justify-between items-center text-sm p-1 hover:bg-gray-90 rounded-[8px]">
                            <div>
                              <span className="text-gray-900">{u.name}</span>{' '}
                              <span className="text-gray-500">({u.email})</span>
                            </div>
                            <EzButton
                              variant="tertiary"
                              size="x-small"
                              disabled={attachUserMutation.isPending}
                              onClick={() => attachUserMutation.mutate({ userId: u.id, orgId: isPinned ? null : detailOrgId })}
                              className={isPinned ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                            >
                              {isPinned ? 'Remover' : 'Adicionar'}
                            </EzButton>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <h4 className="text-sm font-semibold text-gray-900 pt-2">Perfil do Cliente</h4>
                  {profileDraft && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <EzComboBox
                          id="org-service-type"
                          label="Tipo de Atendimento"
                          value={profileDraft.serviceType}
                          onChange={(e) => setProfileDraft({ ...profileDraft, serviceType: e.target.value })}
                        >
                          <option value="">Sem dados</option>
                          <option value="SUPORTE">Suporte</option>
                          <option value="CONSULTORIA">Consultoria</option>
                          <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                        </EzComboBox>
                        <EzComboBox
                          id="org-health-status"
                          label="Saúde"
                          value={profileDraft.healthStatus}
                          onChange={(e) => setProfileDraft({ ...profileDraft, healthStatus: e.target.value })}
                        >
                          <option value="">Sem dados</option>
                          <option value="SAUDAVEL">Saudável</option>
                          <option value="ATENCAO">Atenção</option>
                          <option value="RISCO">Risco</option>
                        </EzComboBox>
                      </div>
                      <div className="flex justify-end">
                        <EzButton
                          size="small"
                          disabled={updateOrgMutation.isPending}
                          onClick={() => updateOrgMutation.mutate(profileDraft)}
                        >
                          Salvar Perfil
                        </EzButton>
                      </div>
                    </div>
                  )}

                  <h4 className="text-sm font-semibold text-gray-900 pt-2">Endereços</h4>
                  <ul className="divide-y divide-gray-100 border border-gray-200 rounded-[12px]">
                    {(orgDetail.addresses ?? []).map((addr) => (
                      <li key={addr.id} className="flex justify-between items-start px-3 py-2 text-sm">
                        <div>
                          <div className="text-gray-900">
                            {addr.street || '—'}{addr.complement ? `, ${addr.complement}` : ''}
                          </div>
                          <div className="text-gray-500">
                            {[addr.neighborhood, addr.city, addr.state, addr.zipCode].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <EzButton
                          variant="tertiary"
                          size="x-small"
                          onClick={() => removeAddressMutation.mutate(addr.id)}
                          disabled={removeAddressMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </EzButton>
                      </li>
                    ))}
                    {(orgDetail.addresses ?? []).length === 0 && (
                      <li className="px-3 py-3 text-sm text-gray-500">Nenhum endereço cadastrado.</li>
                    )}
                  </ul>
                  <form
                    onSubmit={handleAddressSubmit((values) => addAddressMutation.mutate(values))}
                    noValidate
                    className="grid grid-cols-2 gap-3 p-3 bg-gray-90 rounded-[12px] border border-gray-200"
                  >
                    <EzTextInput id="addr-zip" label="CEP" {...registerAddress('zipCode')} />
                    <EzTextInput id="addr-street" label="Logradouro" {...registerAddress('street')} />
                    <EzTextInput id="addr-neighborhood" label="Bairro" {...registerAddress('neighborhood')} />
                    <EzTextInput id="addr-city" label="Cidade" {...registerAddress('city')} />
                    <EzTextInput id="addr-state" label="Estado" {...registerAddress('state')} />
                    <EzTextInput id="addr-complement" label="Complemento" {...registerAddress('complement')} />
                    <div className="col-span-2 flex justify-end">
                      <EzButton type="submit" size="small" disabled={addAddressMutation.isPending}>
                        Adicionar Endereço
                      </EzButton>
                    </div>
                    {addressErrors.street && (
                      <p className="col-span-2 text-xs text-red-600">{addressErrors.street.message}</p>
                    )}
                  </form>

                  <h4 className="text-sm font-semibold text-gray-900 pt-2">Contatos</h4>
                  <ul className="divide-y divide-gray-100 border border-gray-200 rounded-[12px]">
                    {(orgDetail.contacts ?? []).map((contact) => (
                      <li key={contact.id} className="flex justify-between items-start px-3 py-2 text-sm">
                        <div>
                          <div className="text-gray-900">
                            {contact.name}{contact.type ? ` · ${contact.type}` : ''}
                          </div>
                          <div className="text-gray-500">
                            {[contact.email, contact.phone].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <EzButton
                          variant="tertiary"
                          size="x-small"
                          onClick={() => removeContactMutation.mutate(contact.id)}
                          disabled={removeContactMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </EzButton>
                      </li>
                    ))}
                    {(orgDetail.contacts ?? []).length === 0 && (
                      <li className="px-3 py-3 text-sm text-gray-500">Nenhum contato cadastrado.</li>
                    )}
                  </ul>
                  <form
                    onSubmit={handleContactSubmit((values) => addContactMutation.mutate(values))}
                    noValidate
                    className="grid grid-cols-2 gap-3 p-3 bg-gray-90 rounded-[12px] border border-gray-200"
                  >
                    <EzTextInput
                      id="contact-name"
                      label="Nome"
                      hasError={!!contactErrors.name}
                      message={contactErrors.name?.message}
                      {...registerContact('name')}
                    />
                    <EzTextInput id="contact-type" label="Tipo de Contato" {...registerContact('type')} />
                    <EzTextInput id="contact-email" label="E-mail" {...registerContact('email')} />
                    <EzTextInput id="contact-phone" label="Telefone" {...registerContact('phone')} />
                    <div className="col-span-2 flex justify-end">
                      <EzButton type="submit" size="small" disabled={addContactMutation.isPending}>
                        Adicionar Contato
                      </EzButton>
                    </div>
                  </form>
                </div>
              )}

              {detailTab === 'resources' && (
                <EzEmptyCard
                  title="Nenhum recurso cadastrado"
                  description="O Aponta ainda não possui um módulo de Recursos (ativos/equipamentos) por cliente. Esta aba existe no Tiflux real mas não tem funcionalidade implementada no Aponta ainda."
                />
              )}

              {detailTab === 'relationships' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Mesas (Tiflux-parity: Mesa↔Cliente é N:N)
                    </h4>
                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-[12px]">
                      {(orgDetail.serviceDesks ?? []).map((desk) => (
                        <li key={desk.id} className="flex justify-between items-center px-3 py-2 text-sm">
                          <span className="text-gray-900">{desk.name}</span>
                          <EzButton
                            variant="tertiary"
                            size="x-small"
                            onClick={() => unlinkDeskMutation.mutate(desk.id)}
                            disabled={unlinkDeskMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            Desvincular
                          </EzButton>
                        </li>
                      ))}
                      {(orgDetail.serviceDesks ?? []).length === 0 && (
                        <li className="px-3 py-3 text-sm text-gray-500">Nenhuma mesa vinculada.</li>
                      )}
                    </ul>
                    <div className="flex items-end gap-2 mt-2">
                      <div className="flex-1">
                        <EzComboBox
                          id="link-desk"
                          label="Adicionar mesa de serviço"
                          value={linkDeskId}
                          onChange={(e) => setLinkDeskId(e.target.value)}
                        >
                          <option value="">Selecione uma mesa…</option>
                          {availableDesksToLink.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </EzComboBox>
                      </div>
                      <EzButton
                        size="small"
                        disabled={!linkDeskId || linkDeskMutation.isPending}
                        onClick={() => linkDeskId && linkDeskMutation.mutate(linkDeskId)}
                      >
                        Vincular
                      </EzButton>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Grupo de atendentes (entidade por cliente, Tiflux-parity)
                    </h4>
                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-[12px]">
                      {(orgDetail.agentGroups ?? []).map((group) => (
                        <li key={group.id} className="flex justify-between items-start px-3 py-2 text-sm">
                          <div>
                            <div className="text-gray-900 font-medium">{group.name}</div>
                            <div className="text-gray-500">
                              {group.members.map((m) => m.name).join(', ') || 'Sem atendentes'}
                            </div>
                          </div>
                          <EzButton
                            variant="tertiary"
                            size="x-small"
                            onClick={() => removeAgentGroupMutation.mutate(group.id)}
                            disabled={removeAgentGroupMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </EzButton>
                        </li>
                      ))}
                      {(orgDetail.agentGroups ?? []).length === 0 && (
                        <li className="px-3 py-3 text-sm text-gray-500">Nenhum grupo de atendentes cadastrado.</li>
                      )}
                    </ul>
                    <form
                      onSubmit={handleAgentGroupSubmit((values) => createAgentGroupMutation.mutate(values))}
                      noValidate
                      className="grid grid-cols-1 gap-3 p-3 bg-gray-90 rounded-[12px] border border-gray-200 mt-2"
                    >
                      <EzTextInput
                        id="agent-group-name"
                        label="Nome do grupo"
                        hasError={!!agentGroupErrors.name}
                        message={agentGroupErrors.name?.message}
                        {...registerAgentGroup('name')}
                      />
                      <EzMultiSelect
                        id="agent-group-members"
                        label="Atendentes"
                        value={newGroupMemberIds}
                        onChange={setNewGroupMemberIds}
                        options={userOptions}
                      />
                      <div className="flex justify-end">
                        <EzButton type="submit" size="small" disabled={createAgentGroupMutation.isPending}>
                          Adicionar grupo de atendentes
                        </EzButton>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {detailTab === 'billing' && (
                <EzEmptyCard
                  title="Módulo de Faturamento (escopo da issue #58)"
                  description="SMS/e-mail de cobrança, integração Asaas/ContaAzul, faturamento em lote por dia de vencimento. O toggle 'Faturamento quarteirizado' já está disponível no painel acima."
                />
              )}
            </div>
          )
        )}
      </div>

      {isScreenConfigModalOpen && (
        <EzEntityScreenConfigModal
          columns={screenConfigColumns}
          onToggleColumn={(colId) =>
            setColumnVisibility(colId, !screenConfig.grid.columnVisibility[colId])
          }
          density={screenConfig.grid.density}
          onDensityChange={setDensity}
          formLayout={screenConfig.form.layout}
          onFormLayoutChange={setFormLayout}
          onRestoreDefaults={restoreDefaults}
          onClose={() => setIsScreenConfigModalOpen(false)}
          initialTab={screenConfigInitialTab}
        />
      )}
    </EzPageLayout>
  );
}

export default OrganizationsPage;
