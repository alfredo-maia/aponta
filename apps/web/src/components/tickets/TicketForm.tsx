import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../lib/api';
import type { TicketPriority } from '../../hooks/useTickets';
import { priorityLabels } from './TicketCard';
import type { CatalogItem } from '../../pages/CreateTicketPage';

interface ServiceDesk {
  id: string;
  name: string;
}

const priorities = Object.keys(priorityLabels) as TicketPriority[];

export const ticketFormSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  serviceDeskId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
}).superRefine((data, ctx) => {
  if (!data.serviceDeskId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Departamento é obrigatório', path: ['serviceDeskId'] });
  }
});

export type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface TicketFormProps {
  onSubmit: (values: TicketFormValues) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  catalogOverride?: CatalogItem | null;
}

export function TicketForm({
  onSubmit,
  isSubmitting,
  submitError,
  catalogOverride,
}: TicketFormProps) {
  const { data: serviceDesks } = useQuery({
    queryKey: ['service-desks'],
    queryFn: async () => {
      const { data } = await api.get<ServiceDesk[]>('/service-desks');
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: catalogOverride?.title || '',
      description: '',
      serviceDeskId: catalogOverride?.defaultServiceDeskId || '',
      priority: catalogOverride?.defaultPriority || 'MEDIUM',
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="w-full max-w-lg space-y-4 rounded-lg border p-6"
    >
      <div className="space-y-1">
        <label htmlFor="ticket-title" className="block text-sm font-medium">
          Título
        </label>
        <input
          id="ticket-title"
          readOnly={!!catalogOverride}
          type="text"
          className="w-full rounded border px-3 py-2 disabled:bg-muted disabled:text-muted-foreground outline-none"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="ticket-description" className="block text-sm font-medium">
          Descrição detalhada
        </label>
        <textarea
          id="ticket-description"
          rows={4}
          className="w-full rounded border px-3 py-2"
          placeholder="Forneça os detalhes da sua solicitação..."
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {catalogOverride && (
        <>
          <input type="hidden" {...register('serviceDeskId')} />
          <input type="hidden" {...register('priority')} />
        </>
      )}
      {!catalogOverride && (
        <>
          <div className="space-y-1">
            <label htmlFor="ticket-service-desk" className="block text-sm font-medium">
              Departamento
            </label>
            <select
              id="ticket-service-desk"
              className="w-full rounded border bg-background px-3 py-2"
              {...register('serviceDeskId')}
            >
              <option value="">Selecione um departamento</option>
              {(serviceDesks ?? []).map((desk) => (
                <option key={desk.id} value={desk.id}>
                  {desk.name}
                </option>
              ))}
            </select>
            {errors.serviceDeskId && (
              <p className="text-sm text-red-600">{errors.serviceDeskId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="ticket-priority" className="block text-sm font-medium">
              Prioridade
            </label>
            <select
              id="ticket-priority"
              className="w-full rounded border bg-background px-3 py-2"
              {...register('priority')}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
            </select>
            {errors.priority && (
              <p className="text-sm text-red-600">{errors.priority.message}</p>
            )}
          </div>
        </>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        Submeter Solicitação
      </button>
    </form>
  );
}

export default TicketForm;
