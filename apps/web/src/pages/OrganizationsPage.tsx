import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import {
  EzAlert,
  EzButton,
  EzCardItem,
  EzCheck,
  EzComboBox,
  EzEmptyCard,
  EzModal,
  EzSpinner,
  EzTabs,
  EzTextInput,
} from '../components/ds';

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
  _count?: { users: number };
}

interface OrganizationDetail extends Organization {
  users: User[];
  addresses: OrganizationAddress[];
  contacts: OrganizationContact[];
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

function formatCnpj(value?: string | null) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return value;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function OrganizationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const [associatingOrgId, setAssociatingOrgId] = useState<string | null>(null);
  const [detailOrgId, setDetailOrgId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'profile' | 'addresses' | 'contacts'>('info');
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<{ serviceType: string; healthStatus: string } | null>(null);

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
    enabled: isAdmin && !!associatingOrgId,
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
    defaultValues: { name: '', legalName: '', documentType: 'CNPJ', cnpj: '', cpf: '', municipalRegistration: '', stateRegistration: '' },
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

  const createMutation = useMutation({
    mutationFn: async (values: OrgFormValues) => {
      const { data } = await api.post<Organization>('/organizations', values);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      reset();
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

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-[20px] font-semibold text-gray-900">Empresas</h1>
        <p className="text-sm text-gray-500">Somente administradores podem gerenciar empresas.</p>
      </div>
    );
  }

  const openDetail = (orgId: string) => {
    setDetailTab('info');
    setDetailOrgId(orgId);
    setProfileDraft(null);
  };

  if (orgDetail && profileDraft === null) {
    setProfileDraft({
      serviceType: orgDetail.serviceType ?? '',
      healthStatus: orgDetail.healthStatus ?? '',
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-gray-900">Empresas (Organizações)</h1>

      <form
        onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        noValidate
        className="max-w-2xl"
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
                <EzTextInput
                  id="org-cpf"
                  label="CPF"
                  placeholder="000.000.000-00"
                  {...register('cpf')}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <EzTextInput
                  id="org-cnpj"
                  label="CNPJ"
                  placeholder="00.000.000/0000-00"
                  {...register('cnpj')}
                />
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
            <EzTextInput
              id="org-legal-name"
              label="Razão Social"
              {...register('legalName')}
            />
            <EzTextInput
              id="org-name"
              label="Nome Fantasia"
              hasError={!!errors.name}
              message={errors.name?.message}
              {...register('name')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <EzTextInput
              id="org-municipal-registration"
              label="Inscrição Municipal"
              {...register('municipalRegistration')}
            />
            <EzTextInput
              id="org-state-registration"
              label="Inscrição Estadual"
              {...register('stateRegistration')}
            />
          </div>

          <div className="flex justify-end">
            <EzButton type="submit" disabled={createMutation.isPending}>
              Cadastrar
            </EzButton>
          </div>
        </EzCardItem>
      </form>

      {isLoadingOrgs ? (
        <EzSpinner label="Carregando…" />
      ) : (
        <EzCardItem flat className="max-w-3xl overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {(orgs ?? []).map((org) => (
              <li key={org.id} className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => openDetail(org.id)}
                    className="text-left font-medium text-brand-700 hover:underline"
                  >
                    {org.name}
                  </button>
                  <div className="flex items-center gap-3">
                    {org.active === false && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-90 px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                    <span className="text-xs text-gray-500">Clientes: {org._count?.users || 0}</span>
                    <EzButton
                      variant="tertiary"
                      size="small"
                      onClick={() => setAssociatingOrgId(associatingOrgId === org.id ? null : org.id)}
                    >
                      Vincular Usuários
                    </EzButton>
                  </div>
                </div>

                {associatingOrgId === org.id && (
                  <div className="mt-4 p-3 bg-gray-90 rounded-[12px] border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Vincular/Desvincular Usuários</h4>
                    {isLoadingUsers ? <span className="text-xs text-gray-500">Carregando usuários...</span> : (
                      <div className="max-h-60 overflow-y-auto space-y-2">
                         {(usersList ?? []).filter(u => u.role.includes('CLIENT')).map(u => {
                           const isPinned = u.organizationId === org.id;
                           return (
                             <div key={u.id} className="flex justify-between items-center text-sm p-1 hover:bg-white rounded-[8px]">
                               <div>
                                 <span className="text-gray-900">{u.name}</span>{' '}
                                 <span className="text-gray-500">({u.email})</span>
                               </div>
                               <EzButton
                                 variant="tertiary"
                                 size="x-small"
                                 disabled={attachUserMutation.isPending}
                                 onClick={() => attachUserMutation.mutate({ userId: u.id, orgId: isPinned ? null : org.id })}
                                 className={isPinned ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                               >
                                 {isPinned ? 'Remover' : 'Adicionar'}
                               </EzButton>
                             </div>
                           );
                         })}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {orgs?.length === 0 && (
            <div className="p-4">
              <EzEmptyCard title="Nenhuma empresa cadastrada ainda." />
            </div>
          )}
        </EzCardItem>
      )}

      <EzModal
        isOpen={!!detailOrgId}
        onClose={() => setDetailOrgId(null)}
        title={orgDetail?.name ?? 'Detalhes da Empresa'}
        maxWidth="lg"
      >
        {isLoadingDetail || !orgDetail ? (
          <EzSpinner label="Carregando…" />
        ) : (
          <div className="space-y-4">
            <EzTabs
              tabs={[
                { id: 'info', label: 'Dados Cadastrais' },
                { id: 'profile', label: 'Perfil do Cliente' },
                { id: 'addresses', label: `Endereços (${orgDetail.addresses?.length ?? 0})` },
                { id: 'contacts', label: `Contatos (${orgDetail.contacts?.length ?? 0})` },
              ]}
              activeTab={detailTab}
              onChange={(tabId) => setDetailTab(tabId as typeof detailTab)}
            />

            <div className="flex items-center justify-between p-3 bg-gray-90 rounded-[12px] border border-gray-200">
              <div>
                <div className="text-sm font-medium text-gray-900">Cliente ativo</div>
                <div className="text-xs text-gray-500">
                  Clientes inativos não aparecem como opção ao abrir novos tickets.
                </div>
              </div>
              <EzCheck
                id="org-active-toggle"
                checked={orgDetail.active !== false}
                disabled={updateOrgMutation.isPending}
                onChange={(e) => updateOrgMutation.mutate({ active: e.target.checked })}
              />
            </div>

            {detailTab === 'info' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Razão Social</div>
                  <div className="text-gray-900 font-medium">{orgDetail.legalName || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Nome Fantasia</div>
                  <div className="text-gray-900 font-medium">{orgDetail.name || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">CNPJ</div>
                  <div className="text-gray-900 font-medium">{formatCnpj(orgDetail.cnpj) || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">CPF</div>
                  <div className="text-gray-900 font-medium">{orgDetail.cpf || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Inscrição Municipal</div>
                  <div className="text-gray-900 font-medium">{orgDetail.municipalRegistration || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Inscrição Estadual</div>
                  <div className="text-gray-900 font-medium">{orgDetail.stateRegistration || '—'}</div>
                </div>
              </div>
            )}

            {detailTab === 'profile' && profileDraft && (
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

            {detailTab === 'addresses' && (
              <div className="space-y-4">
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
              </div>
            )}

            {detailTab === 'contacts' && (
              <div className="space-y-4">
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
          </div>
        )}
      </EzModal>
    </div>
  );
}

export default OrganizationsPage;
