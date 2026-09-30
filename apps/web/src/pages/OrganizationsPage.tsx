import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useState } from 'react';

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
        <h1 className="text-2xl font-bold">Empresas</h1>
        <p className="text-sm text-muted-foreground">Somente administradores podem gerenciar empresas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Empresas (Organizações)</h1>

      <form
        onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        noValidate
        className="flex max-w-lg items-end gap-3 rounded-lg border p-4"
      >
        <div className="flex-1 space-y-1">
          <label htmlFor="org-name" className="block text-sm font-medium">
            Nome da Empresa
          </label>
          <input
            id="org-name"
            type="text"
            className="w-full rounded border px-3 py-2"
            {...register('name')}
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          Cadastrar
        </button>
      </form>

      {isLoadingOrgs ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="max-w-3xl divide-y rounded-lg border">
          {(orgs ?? []).map((org) => (
            <li key={org.id} className="px-4 py-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">{org.name}</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Clientes: {org._count?.users || 0}</span>
                  <button
                    onClick={() => setAssociatingOrgId(associatingOrgId === org.id ? null : org.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Vincular Usuários
                  </button>
                </div>
              </div>
              
              {associatingOrgId === org.id && (
                <div className="mt-4 p-3 bg-gray-50 rounded border">
                  <h4 className="text-sm font-semibold mb-2">Vincular/Desvincular Usuários</h4>
                  {isLoadingUsers ? <span className="text-xs">Carregando usuários...</span> : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                       {(usersList ?? []).filter(u => u.role.includes('CLIENT')).map(user => {
                         const isPinned = user.organizationId === org.id;
                         return (
                           <div key={user.id} className="flex justify-between items-center text-sm p-1 hover:bg-white rounded">
                             <div>
                               <span>{user.name}</span> <span className="text-muted-foreground">({user.email})</span>
                             </div>
                             <button
                               disabled={attachUserMutation.isPending}
                               onClick={() => attachUserMutation.mutate({ userId: user.id, orgId: isPinned ? null : org.id })}
                               className={`px-2 py-1 text-xs rounded ${isPinned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                             >
                               {isPinned ? 'Remover' : 'Adicionar'}
                             </button>
                           </div>
                         );
                       })}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
          {orgs?.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              Nenhuma empresa cadastrada ainda.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default OrganizationsPage;
