import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../lib/api';
import type { TicketPriority } from '../../hooks/useTickets';
import { priorityLabels } from './TicketCard';

interface ServiceDesk {
  id: string;
  name: string;
}

const priorities = Object.keys(priorityLabels) as TicketPriority[];

/**
 * Validation mirrors the API contract from Task 5: `title` and `description`
 * are required strings, `serviceDeskId` must be a selected uuid (empty-string
 * default from the unselected `<option>` is rejected as "required"), and
 * `priority` is one of the server's enum values. `protocol`, `status` and
 * `requesterId` are intentionally never part of this schema/form — the API's
 * `forbidNonWhitelisted` ValidationPipe would reject them anyway, and they
 * are server-assigned.
 */
export const ticketFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  serviceDeskId: z.string().min(1, 'Department is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface TicketFormProps {
  onSubmit: (values: TicketFormValues) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

/**
 * Shared create-ticket form. Priority defaults to MEDIUM (a sensible
 * mid-point default per the brief) so submitting without touching that
 * select still sends a valid value.
 */
export function TicketForm({
  onSubmit,
  isSubmitting,
  submitError,
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
      title: '',
      description: '',
      serviceDeskId: '',
      priority: 'MEDIUM',
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
          Title
        </label>
        <input
          id="ticket-title"
          type="text"
          className="w-full rounded border px-3 py-2"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ticket-description"
          className="block text-sm font-medium"
        >
          Description
        </label>
        <textarea
          id="ticket-description"
          rows={4}
          className="w-full rounded border px-3 py-2"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ticket-service-desk"
          className="block text-sm font-medium"
        >
          Department
        </label>
        <select
          id="ticket-service-desk"
          className="w-full rounded border bg-background px-3 py-2"
          {...register('serviceDeskId')}
        >
          <option value="">Select a department</option>
          {(serviceDesks ?? []).map((desk) => (
            <option key={desk.id} value={desk.id}>
              {desk.name}
            </option>
          ))}
        </select>
        {errors.serviceDeskId && (
          <p className="text-sm text-red-600">
            {errors.serviceDeskId.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="ticket-priority" className="block text-sm font-medium">
          Priority
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
        Create ticket
      </button>
    </form>
  );
}

export default TicketForm;
