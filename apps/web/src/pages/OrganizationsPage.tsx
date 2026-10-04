import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useState } from 'react';
import { EzButton, EzCardItem, EzEmptyCard, EzSpinner, EzTextInput } from '../components/ds';

interface Organization {
  id: string;
  name: string;
  _count?: { users: number };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
}

const orgFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
});

type OrgFormValues = z.infer<typeof orgFormSchema>;

export function OrganizationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const [associatingOrgId, setAssociatingOrgId] = useState<string | null>(null);

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: { name: '' },
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

  const attachUserMutation = useMutation({
    mutationFn: async ({ userId, orgId }: { userId: string; orgId: string | null }) => {
      await api.patch(`/users/${userId}`, { organizationId: orgId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-[20px] font-semibold text-gray-900">Empresas</h1>
        <p className="text-sm text-gray-500">Somente administradores podem gerenciar empresas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-gray-900">Empresas (Organizações)</h1>

      <form
        onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        noValidate
        className="flex max-w-lg items-end gap-3"
      >
        <EzCardItem flat className="flex-1 flex-row items-end gap-3 p-4">
          <div className="flex-1">
            <EzTextInput
              id="org-name"
              label="Nome da Empresa"
              hasError={!!errors.name}
              message={errors.name?.message}
              {...register('name')}
            />
          </div>
          <EzButton type="submit" disabled={createMutation.isPending}>
            Cadastrar
          </EzButton>
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
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="flex items-center gap-3">
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
                  <div className="mt-4 p-3 bg-gray-50 rounded-[12px] border border-gray-200">
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
    </div>
  );
}

export default OrganizationsPage;
