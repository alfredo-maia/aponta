import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface ServiceDesk {
  id: string;
  name: string;
  createdAt: string;
}

const serviceDeskFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
});

type ServiceDeskFormValues = z.infer<typeof serviceDeskFormSchema>;

/**
 * ADMIN-only page for managing departments (API resource: "service desk").
 * The create-ticket form (TicketForm) reads its dropdown from
 * `GET /service-desks` but had no UI anywhere to populate that list — an
 * ADMIN previously had to call the API directly. This page closes that
 * gap: list existing departments and a form to create new ones, matching
 * the API's ADMIN-only `POST /service-desks` guard
 * (service-desks.controller.ts) on the client side too so non-admins get
 * an immediate, clear message instead of a silent 403 from a hidden form.
 */
export function ServiceDesksPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const { data: serviceDesks, isLoading } = useQuery({
    queryKey: ['service-desks'],
    queryFn: async () => {
      const { data } = await api.get<ServiceDesk[]>('/service-desks');
      return data;
    },
    enabled: isAdmin,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceDeskFormValues>({
    resolver: zodResolver(serviceDeskFormSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: ServiceDeskFormValues) => {
      const { data } = await api.post<ServiceDesk>('/service-desks', values);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-desks'] });
      reset();
    },
  });

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Departamentos</h1>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para ver esta página. Somente
          administradores podem gerenciar departamentos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Departamentos</h1>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="flex max-w-lg items-end gap-3 rounded-lg border p-4"
      >
        <div className="flex-1 space-y-1">
          <label htmlFor="service-desk-name" className="block text-sm font-medium">
            Nome
          </label>
          <input
            id="service-desk-name"
            type="text"
            className="w-full rounded border px-3 py-2"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          Criar
        </button>
      </form>
      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          Falha ao criar o departamento. Tente novamente.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="max-w-lg divide-y rounded-lg border">
          {(serviceDesks ?? []).map((desk) => (
            <li key={desk.id} className="px-4 py-3 text-sm">
              {desk.name}
            </li>
          ))}
          {serviceDesks?.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              Nenhum departamento cadastrado ainda.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default ServiceDesksPage;
