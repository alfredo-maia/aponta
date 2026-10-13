import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useState, useMemo, useRef } from 'react';
import { Search, Trash2, CreditCard, Plus, ExternalLink, RefreshCw, FilePlus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  EzAlert,
  EzButton,
  EzCheck,
  EzComboBox,
  EzDynamicFilter,
  EzEmptyCard,
  EzEntityGrid,
  EzEntityToolbar,
  EzEntityScreenConfigModal,
  EzFilterDrawer,
  EzModal,
  EzMultiSelect,
  EzPageHeader,
  EzPageLayout,
  EzSpinner,
  EzTabs,
  EzTextArea,
  EzTextEdit,
  EzTextInput,
} from '../components/ds';
import { applyDynamicFilters } from '../components/ds/EzDynamicFilter';
import type { EzDynamicFilterField, EzDynamicFilterRule } from '../components/ds/EzDynamicFilter';
import { cn } from '../components/ds/utils';
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
  billingEmails?: string | null;
  billingDueDay?: number | null;
  billingMethod?: string | null;
  billingNotes?: string | null;
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
  billingEmails: z.string().trim().optional(),
  billingDueDay: z.string().refine(
    (val) => !val || (!isNaN(Number(val)) && Number.isInteger(Number(val)) && Number(val) >= 1 && Number(val) <= 31),
    { message: 'Dia de vencimento deve ser entre 1 e 31' },
  ).optional(),
  billingMethod: z.string().optional(),
  billingNotes: z.string().trim().optional(),
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

// Campos filtráveis dinamicamente (um por coluna da grade) - padrão Sankhya.
const ORG_FILTER_FIELDS: EzDynamicFilterField[] = [
  { id: 'name', label: 'Nome', getValue: (o: Organization) => o.name },
  { id: 'legalName', label: 'Razão Social', getValue: (o: Organization) => o.legalName },
  {
    id: 'document',
    label: 'CPF / CNPJ',
    getValue: (o: Organization) => (o.documentType === 'CPF' ? o.cpf : o.cnpj),
  },
  {
    id: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Ativo', value: 'Ativo' },
      { label: 'Inativo', value: 'Inativo' },
    ],
    getValue: (o: Organization) => (o.active === false ? 'Inativo' : 'Ativo'),
  },
  { id: 'clientes', label: 'Clientes', type: 'number', getValue: (o: Organization) => o._count?.users ?? 0 },
  { id: 'stateRegistration', label: 'Inscrição Estadual', getValue: (o: Organization) => o.stateRegistration },
  { id: 'municipalRegistration', label: 'Inscrição Municipal', getValue: (o: Organization) => o.municipalRegistration },
  { id: 'workFolder', label: 'Pasta de Trabalho', getValue: (o: Organization) => o.workFolder },
  { id: 'serviceType', label: 'Perfil', getValue: (o: Organization) => o.serviceType },
  { id: 'healthStatus', label: 'Saúde', getValue: (o: Organization) => o.healthStatus },
];

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
  // Formulário (EzEntityToolbar), substituindo o antigo modal único.
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [detailOrgId, setDetailOrgId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('users');
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<{ serviceType: string; healthStatus: string } | null>(null);
  const [billingDraft, setBillingDraft] = useState<{
    quarterlyBilling?: boolean;
    billingEmails?: string;
    billingDueDay?: number | string;
    billingMethod?: string;
    billingNotes?: string;
  } | null>(null);
  const [linkDeskId, setLinkDeskId] = useState<string>('');
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<(string | number)[]>([]);

  // Sankhya Parity (br.com.sankhya.core.cad.parceiros): toolbar, drawer, personalização por usuário
  const {
    config: screenConfig,
    setColumnVisibility,
    setColumnOrder,
    setDensity,
    setFormLayout,
    saveFilter,
    deleteFilter,
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
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterDocType, setFilterDocType] = useState<'ALL' | 'CNPJ' | 'CPF'>('ALL');
  const [dynamicRules, setDynamicRules] = useState<EzDynamicFilterRule[]>([]);
  const [isScreenConfigModalOpen, setIsScreenConfigModalOpen] = useState(false);
  const [screenConfigInitialTab, setScreenConfigInitialTab] = useState<'grid' | 'form'>('grid');
  const [selectedOrgs, setSelectedOrgs] = useState<Organization[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Modal para cadastro automático via CNPJ (Sankhya / Receita Federal)
  const [isCnpjModalOpen, setIsCnpjModalOpen] = useState(false);
  const [cnpjModalInput, setCnpjModalInput] = useState('');
  const [cnpjModalError, setCnpjModalError] = useState<string | null>(null);
  const [isLookingUpCnpjModal, setIsLookingUpCnpjModal] = useState(false);

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

  const pendingAddressRef = useRef<AddressFormValues | null>(null);

  const createMutation = useMutation({
    mutationFn: async (values: OrgFormValues) => {
      const payload = {
        ...values,
        billingDueDay: values.billingDueDay ? parseInt(values.billingDueDay, 10) : undefined,
      };
      const { data } = await api.post<Organization>('/organizations', payload);
      const pendingAddress = pendingAddressRef.current;
      pendingAddressRef.current = null;
      if (pendingAddress && (pendingAddress.zipCode || pendingAddress.street)) {
        try {
          await api.post(`/organizations/${data.id}/addresses`, pendingAddress);
        } catch {
          // endereço é complementar: não bloqueia o cadastro
        }
      }
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

  const inlinePatchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Organization> }) => {
      const res = await api.patch<Organization>(`/organizations/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      if (detailOrgId) {
        void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
      }
    },
  });

  const handleCnpjModalSubmit = async () => {
    const rawDigits = cnpjModalInput.replace(/\D/g, '');
    if (rawDigits.length !== 14) {
      setCnpjModalError('CNPJ deve conter 14 dígitos.');
      return;
    }
    setIsLookingUpCnpjModal(true);
    setCnpjModalError(null);
    try {
      const { data } = await api.get<CnpjLookupResult>('/organizations/cnpj-lookup', {
        params: { cnpj: rawDigits },
      });
      reset();
      setValue('documentType', 'CNPJ');
      setValue('cnpj', data.cnpj);
      setValue('legalName', data.legalName);
      setValue('name', data.tradeName || data.legalName);
      if (data.address) {
        pendingAddressRef.current = {
          zipCode: data.address.zipCode ?? '',
          street: data.address.street ?? '',
          neighborhood: data.address.neighborhood ?? '',
          city: data.address.city ?? '',
          state: data.address.state ?? '',
          complement: data.address.complement ?? '',
        };
        resetAddressForm({
          zipCode: data.address.zipCode ?? '',
          street: data.address.street ?? '',
          neighborhood: data.address.neighborhood ?? '',
          city: data.address.city ?? '',
          state: data.address.state ?? '',
          complement: data.address.complement ?? '',
        });
      }
      setIsCnpjModalOpen(false);
      setDetailOrgId(null);
      setMode('form');
    } catch {
      setCnpjModalError('CNPJ não encontrado ou inválido na Receita Federal.');
    } finally {
      setIsLookingUpCnpjModal(false);
    }
  };

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
    const idx = filteredOrgs.findIndex((o) => o.id === orgId);
    if (idx !== -1) {
      setFocusedIndex(idx);
      setSelectedOrgs([filteredOrgs[idx]]);
    }
    setDetailTab('users');
    setDetailOrgId(orgId);
    setProfileDraft(null);
    setBillingDraft(null);
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
          <div className="flex items-center gap-1.5">
            <EzTextEdit
              value={row.original.name || ''}
              placeholder="Nome"
              className="text-xs font-medium text-brand-700"
              onChange={(val) => {
                const next = val.trim();
                if (next && next !== (row.original.name || '')) {
                  inlinePatchMutation.mutate({ id: row.original.id, data: { name: next } });
                }
              }}
            />
            <button
              type="button"
              aria-label={`Abrir cadastro de ${row.original.name}`}
              title="Abrir cadastro (modo formulário)"
              onClick={() => openDetail(row.original.id)}
              className="text-gray-400 hover:text-brand-700 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
      {
        accessorKey: 'legalName',
        header: 'Razão Social',
        cell: ({ row }) => (
          <EzTextEdit
            value={row.original.legalName || ''}
            placeholder="Razão Social"
            className="text-xs text-gray-900"
            onChange={(val) => {
              if (val !== (row.original.legalName || '')) {
                inlinePatchMutation.mutate({ id: row.original.id, data: { legalName: val.trim() } });
              }
            }}
          />
        ),
      },
      {
        id: 'document',
        header: 'CPF / CNPJ',
        cell: ({ row }) => {
          const isCpf = row.original.documentType === 'CPF';
          const doc = isCpf ? row.original.cpf : row.original.cnpj;
          return (
            <EzTextEdit
              value={doc ? (isCpf ? doc : formatCnpj(doc)) : ''}
              placeholder={isCpf ? 'CPF' : 'CNPJ'}
              className="font-mono text-xs text-gray-700"
              onChange={(val) => {
                const digits = val.replace(/\D/g, '');
                if (digits !== (doc || '').replace(/\D/g, '')) {
                  inlinePatchMutation.mutate({
                    id: row.original.id,
                    data: isCpf ? { cpf: digits } : { cnpj: digits },
                  });
                }
              }}
            />
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (org) => (org.active === false ? 'Inativo' : 'Ativo'),
        cell: ({ row }) => (
          <button
            type="button"
            title="Alternar status (Ativo/Inativo)"
            onClick={() => {
              inlinePatchMutation.mutate({
                id: row.original.id,
                data: { active: row.original.active === false },
              });
            }}
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors',
              row.original.active === false
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            )}
          >
            {row.original.active === false ? 'Inativo' : 'Ativo'}
          </button>
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
          <EzTextEdit
            value={row.original.stateRegistration || ''}
            placeholder="IE"
            className="text-xs text-gray-600"
            onChange={(val) => {
              if (val !== (row.original.stateRegistration || '')) {
                inlinePatchMutation.mutate({ id: row.original.id, data: { stateRegistration: val.trim() } });
              }
            }}
          />
        ),
      },
      {
        accessorKey: 'municipalRegistration',
        header: 'Inscrição Municipal',
        cell: ({ row }) => (
          <EzTextEdit
            value={row.original.municipalRegistration || ''}
            placeholder="IM"
            className="text-xs text-gray-600"
            onChange={(val) => {
              if (val !== (row.original.municipalRegistration || '')) {
                inlinePatchMutation.mutate({ id: row.original.id, data: { municipalRegistration: val.trim() } });
              }
            }}
          />
        ),
      },
      {
        accessorKey: 'workFolder',
        header: 'Pasta de Trabalho',
        cell: ({ row }) => (
          <EzTextEdit
            value={row.original.workFolder || ''}
            placeholder="/pasta"
            className="text-xs font-mono text-gray-500"
            onChange={(val) => {
              if (val !== (row.original.workFolder || '')) {
                inlinePatchMutation.mutate({ id: row.original.id, data: { workFolder: val.trim() } });
              }
            }}
          />
        ),
      },
      {
        accessorKey: 'serviceType',
        header: 'Perfil',
        cell: ({ row }) => (
          <EzTextEdit
            value={row.original.serviceType || ''}
            placeholder="Perfil"
            className="text-xs text-gray-600"
            onChange={(val) => {
              if (val !== (row.original.serviceType || '')) {
                inlinePatchMutation.mutate({ id: row.original.id, data: { serviceType: val.trim() } });
              }
            }}
          />
        ),
      },
      {
        accessorKey: 'healthStatus',
        header: 'Saúde',
        cell: ({ row }) => (
          <EzTextEdit
            value={row.original.healthStatus || ''}
            placeholder="Saúde"
            className="text-xs text-gray-600"
            onChange={(val) => {
              if (val !== (row.original.healthStatus || '')) {
                inlinePatchMutation.mutate({ id: row.original.id, data: { healthStatus: val.trim() } });
              }
            }}
          />
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
    const base = (orgs ?? []).filter((org) => {
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
    return applyDynamicFilters(base, dynamicRules, ORG_FILTER_FIELDS);
  }, [orgs, filterStatus, filterDocType, filterSearch, dynamicRules]);

  const handlePrevious = () => {
    if (focusedIndex > 0) {
      const newIdx = focusedIndex - 1;
      setFocusedIndex(newIdx);
      const target = filteredOrgs[newIdx];
      if (target) {
        setSelectedOrgs([target]);
        if (mode === 'form' && detailOrgId) {
          openDetail(target.id);
        }
      }
    }
  };

  const handleNext = () => {
    if (focusedIndex < filteredOrgs.length - 1) {
      const newIdx = focusedIndex + 1;
      setFocusedIndex(newIdx);
      const target = filteredOrgs[newIdx];
      if (target) {
        setSelectedOrgs([target]);
        if (mode === 'form' && detailOrgId) {
          openDetail(target.id);
        }
      }
    }
  };

  const handleDelete = () => {
    const targets = selectedOrgs.length > 0 ? selectedOrgs : (detailOrgId && orgDetail ? [orgDetail] : []);
    if (targets.length === 0) return;
    const confirmMsg = `Deseja inativar ${targets.length} empresa(s) selecionada(s)?`;
    if (window.confirm(confirmMsg)) {
      targets.forEach((o) => {
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
      label: 'Cadastrar manualmente',
      icon: FilePlus,
      onClick: () => {
        reset();
        setDetailOrgId(null);
        setMode('form');
      },
    },
    {
      label: 'Cadastrar por CNPJ',
      icon: Plus,
      onClick: () => {
        setCnpjModalInput('');
        setCnpjModalError(null);
        setIsCnpjModalOpen(true);
      },
    },
    {
      label: 'Consultar CNPJ na Receita',
      icon: Search,
      onClick: () => {
        const active = selectedOrgs[0] ?? filteredOrgs[focusedIndex];
        if (active?.cnpj) {
          cnpjLookupMutation.mutate(active.cnpj);
        }
      },
    },
    {
      label: 'Atualizar dados pela Receita',
      icon: RefreshCw,
      onClick: () => {
        const active = selectedOrgs[0] ?? filteredOrgs[focusedIndex];
        if (!active?.cnpj) return;
        api
          .get<CnpjLookupResult>('/organizations/cnpj-lookup', { params: { cnpj: active.cnpj } })
          .then(({ data }) =>
            inlinePatchMutation.mutate({
              id: active.id,
              data: { legalName: data.legalName, ...(data.tradeName ? { name: data.tradeName } : {}) },
            }),
          )
          .catch(() => setCnpjLookupError('CNPJ não encontrado ou inválido. Verifique e tente novamente.'));
      },
    },
  ];

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-[18px] font-semibold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500">Somente administradores podem gerenciar empresas.</p>
      </div>
    );
  }

  return (
    <EzPageLayout
      header={
        <EzPageHeader
          title="Clientes"
          showBackButton={mode === 'form'}
          onBack={backToList}
        />
      }
    >
      <div className="space-y-6">
        {isLoadingOrgs ? (
          <EzSpinner label="Carregando…" />
        ) : (
          <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden shadow-xs flex flex-col">
            {/* Sankhya Standard Entity Toolbar */}
            <EzEntityToolbar
              viewMode={mode === 'list' ? 'GRID' : 'FORM'}
              showViewModeToggle={false}
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
                } else {
                  backToList();
                }
              }}
              isFilterOpen={isFilterPanelOpen}
              onToggleFilter={() => setIsFilterPanelOpen((prev) => !prev)}
              hasPrevious={focusedIndex > 0}
              onPrevious={handlePrevious}
              hasNext={focusedIndex < filteredOrgs.length - 1}
              onNext={handleNext}
              selectedCount={selectedOrgs.length || (detailOrgId ? 1 : 0)}
              onDelete={handleDelete}
              onClone={handleClone}
              onRefresh={() => {
                void queryClient.invalidateQueries({ queryKey: ['organizations'] });
                if (detailOrgId) {
                  void queryClient.invalidateQueries({ queryKey: ['organizations', detailOrgId] });
                }
              }}
              onOpenGridConfig={() => {
                setScreenConfigInitialTab('grid');
                setIsScreenConfigModalOpen(true);
              }}
              onOpenFormConfig={() => {
                setScreenConfigInitialTab('form');
                setIsScreenConfigModalOpen(true);
              }}
              onOpenScreenConfig={() => {
                setScreenConfigInitialTab(mode === 'form' ? 'form' : 'grid');
                setIsScreenConfigModalOpen(true);
              }}
              recordCountText={
                mode === 'form' && detailOrgId
                  ? `${focusedIndex >= 0 ? focusedIndex + 1 : 1} de ${filteredOrgs.length}`
                  : undefined
              }
              actions={toolbarActions}
            />

            {mode === 'list' && (
              <div className="flex flex-1 overflow-hidden min-h-[420px]">
                {/* Lateral Filter Drawer com Filtros Dinâmicos e Filtros Salvos */}
                <EzFilterDrawer
                  isOpen={isFilterPanelOpen}
                  onClose={() => setIsFilterPanelOpen(false)}
                  onClear={() => {
                    setFilterSearch('');
                    setFilterStatus('ALL');
                    setFilterDocType('ALL');
                    setDynamicRules([]);
                    setActiveSavedFilterId(null);
                  }}
                  title="Filtros de Clientes"
                  savedFilters={screenConfig.savedFilters}
                  activeSavedFilterId={activeSavedFilterId}
                  onApplySavedFilter={(sf) => {
                    setActiveSavedFilterId(sf.id);
                    if (sf.criteria.search !== undefined) setFilterSearch(sf.criteria.search);
                    if (sf.criteria.status !== undefined) setFilterStatus(sf.criteria.status);
                    if (sf.criteria.docType !== undefined) setFilterDocType(sf.criteria.docType);
                    setDynamicRules(Array.isArray(sf.criteria.rules) ? sf.criteria.rules : []);
                  }}
                  onSaveCurrentFilter={(name) => {
                    saveFilter(name, {
                      search: filterSearch,
                      status: filterStatus,
                      docType: filterDocType,
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

                    <EzDynamicFilter
                      fields={ORG_FILTER_FIELDS}
                      rules={dynamicRules}
                      onChange={setDynamicRules}
                    />
                  </div>
                </EzFilterDrawer>

                {/* Grid Content */}
                <div className="flex-1 p-3 overflow-x-auto min-w-0 flex flex-col">
                  {orgs?.length === 0 ? (
                    <div className="p-4">
                      <EzEmptyCard title="Nenhuma empresa cadastrada ainda." />
                    </div>
                  ) : (
                    <EzEntityGrid
                      columns={orgColumns}
                      data={filteredOrgs}
                      showRowNumbers
                      rowNumberLabel="Código"
                      enableColumnGrouping={false}
                      selectable
                      showGridCornerMenu
                      enableColumnMenu
                      enableColumnFilters
                      zebraStriping
                      density={screenConfig.grid.density}
                      initialColumnVisibility={screenConfig.grid.columnVisibility}
                      showStatusBar={false}
                      enableColumnReorder
                      columnOrder={screenConfig.grid.columnOrder}
                      onColumnOrderChange={setColumnOrder}
                      pageSize={10}
                      onSelectionChange={(selected) => {
                        setSelectedOrgs(selected);
                        if (selected.length > 0) {
                          const idx = filteredOrgs.findIndex((o) => o.id === selected[0].id);
                          if (idx !== -1) setFocusedIndex(idx);
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            {mode === 'form' && !detailOrgId && (
              <form
                onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                noValidate
                className="p-5 space-y-5"
              >
                <div className="bg-white rounded-[8px] border border-gray-200 p-4 space-y-4">
                  <div className="border-b border-gray-100 pb-2.5 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Nova Empresa</h2>
                      <p className="text-xs text-gray-500">Preencha os campos cadastrais conforme padrão Sankhya ERP.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <EzComboBox
                      id="org-document-type"
                      label="Tipo de Documento"
                      {...register('documentType')}
                    >
                      <option value="CNPJ">CNPJ (Pessoa Jurídica)</option>
                      <option value="CPF">CPF (Pessoa Física)</option>
                    </EzComboBox>

                    {documentType === 'CPF' ? (
                      <EzTextInput id="org-cpf" label="CPF" placeholder="000.000.000-00" {...register('cpf')} />
                    ) : (
                      <div className="flex items-end gap-2">
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

                    <EzTextInput
                      id="org-name"
                      label="Nome Fantasia"
                      hasError={!!errors.name}
                      message={errors.name?.message}
                      {...register('name')}
                    />

                    <EzTextInput id="org-legal-name" label="Razão Social" {...register('legalName')} />
                    <EzTextInput id="org-state-registration" label="Inscrição Estadual" {...register('stateRegistration')} />
                    <EzTextInput id="org-municipal-registration" label="Inscrição Municipal" {...register('municipalRegistration')} />
                    <EzTextInput id="org-work-folder" label="Pasta de Trabalho" {...register('workFolder')} />
                  </div>

                  {cnpjLookupError && (
                    <EzAlert variant="error" onClose={() => setCnpjLookupError(null)}>
                      {cnpjLookupError}
                    </EzAlert>
                  )}
                </div>

                <div className="bg-white rounded-[8px] border border-gray-200 p-4 space-y-4">
                  <div className="border-b border-gray-100 pb-2.5">
                    <h3 className="text-sm font-semibold text-gray-900">Parâmetros & Faturamento</h3>
                    <p className="text-xs text-gray-500">Configurações de visibilidade, cobrança e observações do cliente.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <EzTextInput id="org-billing-emails-create" label="E-mails de Faturamento" placeholder="ex: financeiro@cliente.com" {...register('billingEmails')} />
                    <EzTextInput id="org-billing-due-day-create" label="Dia de Vencimento" type="number" min="1" max="31" placeholder="ex: 10" {...register('billingDueDay')} />
                    <div className="flex flex-col justify-center space-y-2 pt-2">
                      <EzCheck id="org-visible" label="Visível para clientes" {...register('visibleToClients')} />
                      <EzCheck id="org-quarterly" label="Faturamento quarteirizado" {...register('quarterlyBilling')} />
                    </div>
                  </div>

                  <EzTextArea id="org-notes" label="Anotações" rows={3} {...register('notes')} />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <EzButton type="button" variant="tertiary" onClick={backToList}>
                    Cancelar
                  </EzButton>
                  <EzButton type="submit" disabled={createMutation.isPending}>
                    Cadastrar
                  </EzButton>
                </div>
              </form>
            )}

            {mode === 'form' && detailOrgId && (
              isLoadingDetail || !orgDetail ? (
                <div className="p-8">
                  <EzSpinner label="Carregando…" />
                </div>
              ) : (
                <div className="p-5 space-y-5">
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

                  {/* Painel principal padronizado (Sankhya ERP Form Mode) */}
                  <div className="bg-white rounded-[8px] border border-gray-200 p-4 space-y-4">
                    <div className="border-b border-gray-100 pb-2.5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Dados do Parceiro / Cliente</h3>
                        <p className="text-xs text-gray-500">Campos cadastrais principais padronizados no padrão Sankhya ERP.</p>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        ID: {orgDetail.id}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-sm">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500">Nome Fantasia</span>
                        <div className="text-gray-900 font-medium text-sm">{orgDetail.name || '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500">Razão Social</span>
                        <div className="text-gray-900 font-medium text-sm">{orgDetail.legalName || '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500">CPF/CNPJ</span>
                        <div className="text-gray-900 font-medium text-sm font-mono">
                          {orgDetail.documentType === 'CPF' ? (orgDetail.cpf || '—') : (formatCnpj(orgDetail.cnpj) || '—')}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500">Inscrição Estadual</span>
                        <div className="text-gray-900 font-medium text-sm">{orgDetail.stateRegistration || '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500">Inscrição Municipal</span>
                        <div className="text-gray-900 font-medium text-sm">{orgDetail.municipalRegistration || '—'}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500">Recursos cadastrados</span>
                        <div className="text-gray-900 font-medium text-sm">-- / 0 disponíveis / 0 em uso</div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500">Pasta de Trabalho</span>
                        <div className="text-gray-900 font-medium text-sm">{orgDetail.workFolder || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2 pt-3">
                        <EzCheck
                          id="org-visible-toggle"
                          label="Visível para clientes"
                          checked={orgDetail.visibleToClients !== false}
                          disabled={updateOrgMutation.isPending}
                          onChange={(e) => updateOrgMutation.mutate({ visibleToClients: e.target.checked })}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500">Agentes inteligentes</span>
                        <div className="text-gray-900 font-medium text-sm">-- / 0 disponíveis / 0 em uso</div>
                      </div>

                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <span className="text-xs font-medium text-gray-500">Anotações</span>
                        <div className="text-gray-900 font-medium text-sm">{orgDetail.notes || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2 pt-3">
                        <EzCheck
                          id="org-quarterly-toggle"
                          label="Faturamento quarteirizado"
                          checked={orgDetail.quarterlyBilling === true}
                          disabled={updateOrgMutation.isPending}
                          onChange={(e) => updateOrgMutation.mutate({ quarterlyBilling: e.target.checked })}
                        />
                      </div>
                    </div>
                  </div>

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
                <div className="space-y-6" data-testid="org-billing-tab-content">
                  <div className="bg-white p-5 rounded-[12px] border border-gray-200 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-brand-600" />
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Preferências de Faturamento & Cobrança (Tiflux-parity)
                          </h4>
                          <p className="text-xs text-gray-500">
                            Configurações de regime financeiro, faturamento quarteirizado e canais de cobrança.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-500">Regime atual:</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            (billingDraft?.quarterlyBilling ?? orgDetail.quarterlyBilling)
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {(billingDraft?.quarterlyBilling ?? orgDetail.quarterlyBilling)
                            ? 'Faturamento Quarteirizado'
                            : 'Faturamento Direto'}
                        </span>
                      </div>
                    </div>

                    {/* Faturamento Quarteirizado card */}
                    <div className="p-4 rounded-[8px] bg-gray-50 border border-gray-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <EzCheck
                          id="org-billing-quarterly-checkbox"
                          label="Habilitar faturamento quarteirizado"
                          checked={billingDraft?.quarterlyBilling ?? (orgDetail.quarterlyBilling === true)}
                          disabled={updateOrgMutation.isPending}
                          onChange={(e) =>
                            setBillingDraft((prev) => ({
                              ...prev,
                              quarterlyBilling: e.target.checked,
                            }))
                          }
                        />
                      </div>
                      <p className="text-[12px] text-gray-600 pl-6">
                        Quando ativado, os apontamentos de horas e ordens de serviço deste cliente serão direcionados para o regime de faturamento quarteirizado por organização / parceiro.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <EzTextInput
                          id="org-billing-emails"
                          label="E-mails para Envio de Cobrança / Faturas"
                          placeholder="ex: financeiro@empresa.com.br, faturas@empresa.com.br"
                          value={billingDraft?.billingEmails ?? (orgDetail.billingEmails || '')}
                          onChange={(e) =>
                            setBillingDraft((prev) => ({
                              ...prev,
                              billingEmails: e.target.value,
                            }))
                          }
                        />
                        <span className="text-[11px] text-gray-400 block">
                          E-mails que receberão as notificações e relatórios de faturamento (separados por vírgula).
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <EzTextInput
                            id="org-billing-due-day"
                            label="Dia de Vencimento"
                            type="number"
                            min="1"
                            max="31"
                            placeholder="ex: 10"
                            value={
                              billingDraft?.billingDueDay !== undefined
                                ? String(billingDraft.billingDueDay)
                                : (orgDetail.billingDueDay ? String(orgDetail.billingDueDay) : '')
                            }
                            onChange={(e) =>
                              setBillingDraft((prev) => ({
                                ...prev,
                                billingDueDay: e.target.value ? parseInt(e.target.value, 10) : '',
                              }))
                            }
                          />
                          <span className="text-[11px] text-gray-400 block">
                            Dia do mês (1 a 31).
                          </span>
                        </div>

                        <div className="space-y-1">
                          <EzComboBox
                            id="org-billing-method"
                            label="Forma de Pagamento"
                            value={billingDraft?.billingMethod ?? (orgDetail.billingMethod || 'BOLETO')}
                            onChange={(e) =>
                              setBillingDraft((prev) => ({
                                ...prev,
                                billingMethod: e.target.value,
                              }))
                            }
                          >
                            <option value="BOLETO">Boleto Bancário</option>
                            <option value="PIX">PIX</option>
                            <option value="TRANSFERENCIA">Transferência</option>
                            <option value="CARTAO">Cartão de Crédito</option>
                          </EzComboBox>
                          <span className="text-[11px] text-gray-400 block">
                            Método preferencial.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <EzTextArea
                        id="org-billing-notes"
                        label="Instruções e Observações de Faturamento"
                        placeholder="Ex: Emissão de nota com ordem de compra específica; chave PIX CNPJ; faturamento consolidado mensal..."
                        rows={3}
                        value={billingDraft?.billingNotes ?? (orgDetail.billingNotes || '')}
                        onChange={(e) =>
                          setBillingDraft((prev) => ({
                            ...prev,
                            billingNotes: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <EzButton
                        size="small"
                        disabled={updateOrgMutation.isPending}
                        onClick={() => {
                          const payload: Partial<Organization> = {
                            ...(billingDraft?.quarterlyBilling !== undefined
                              ? { quarterlyBilling: billingDraft.quarterlyBilling }
                              : {}),
                            ...(billingDraft?.billingEmails !== undefined
                              ? { billingEmails: billingDraft.billingEmails }
                              : {}),
                            ...(billingDraft?.billingDueDay !== undefined
                              ? {
                                  billingDueDay:
                                    typeof billingDraft.billingDueDay === 'number'
                                      ? billingDraft.billingDueDay
                                      : null,
                                }
                              : {}),
                            ...(billingDraft?.billingMethod !== undefined
                              ? { billingMethod: billingDraft.billingMethod }
                              : {}),
                            ...(billingDraft?.billingNotes !== undefined
                              ? { billingNotes: billingDraft.billingNotes }
                              : {}),
                          };
                          updateOrgMutation.mutate(payload, {
                            onSuccess: () => setBillingDraft(null),
                          });
                        }}
                      >
                        Salvar Preferências de Faturamento
                      </EzButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}
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
          initialTab={screenConfigInitialTab}
        />
      )}

      {/* Modal: Cadastrar Parceiro por CNPJ (Sankhya / Receita Federal parity) */}
      <EzModal
        isOpen={isCnpjModalOpen}
        onClose={() => {
          setIsCnpjModalOpen(false);
          setCnpjModalError(null);
        }}
        title="Cadastrar Parceiro por CNPJ"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <EzButton
              variant="secondary"
              size="small"
              onClick={() => setIsCnpjModalOpen(false)}
            >
              Cancelar
            </EzButton>
            <EzButton
              variant="primary"
              size="small"
              disabled={isLookingUpCnpjModal || !cnpjModalInput.trim()}
              onClick={handleCnpjModalSubmit}
            >
              {isLookingUpCnpjModal ? 'Consultando…' : 'Consultar e Abrir Cadastro'}
            </EzButton>
          </div>
        }
      >
        <div className="space-y-3 p-1">
          <p className="text-xs text-gray-600">
            Informe o CNPJ da empresa. Os dados cadastrais (Razão Social, Nome Fantasia, Endereço) serão consultados automaticamente na Receita Federal para pré-preenchimento do formulário.
          </p>
          <div className="space-y-1">
            <label htmlFor="cnpj-modal-input" className="text-xs font-medium text-gray-700">
              CNPJ
            </label>
            <EzTextInput
              id="cnpj-modal-input"
              placeholder="00.000.000/0000-00"
              value={cnpjModalInput}
              onChange={(e) => setCnpjModalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCnpjModalSubmit();
              }}
              autoFocus
            />
          </div>
          {cnpjModalError && (
            <EzAlert variant="error" onClose={() => setCnpjModalError(null)}>
              {cnpjModalError}
            </EzAlert>
          )}
        </div>
      </EzModal>
    </EzPageLayout>
  );
}

export default OrganizationsPage;
