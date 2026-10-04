import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../lib/api';
import type { TicketPriority } from '../../hooks/useTickets';
import { priorityLabels } from './TicketCard';
import type { CatalogItem } from '../../pages/CreateTicketPage';
import { useAuthStore } from '../../stores/authStore';

// DS Components
import {
  EzButton,
  EzTextInput,
  EzSearch,
  EzComboBox,
  EzRichText,
  EzUpload,
  EzDateInput,
  EzMultiSelect,
  EzFileItem
} from '../ds';
import { useState } from 'react';
import { CalendarClock } from 'lucide-react';

interface ServiceDesk { id: string; name: string; }
interface Organization { id: string; name: string; active?: boolean }
interface UserData { id: string; name: string; organizationId?: string }

const priorities = Object.keys(priorityLabels) as TicketPriority[];

export const ticketFormSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  // NOTE: Issue #49 documents that Cliente/Solicitante are still backend
  // gaps — there's no ServiceDesk<->Organization link and no seeded
  // Organization data yet. Keeping these required here would make it
  // IMPOSSIBLE to create any ticket at all (the DTO doesn't even accept
  // these fields — see CreateTicketPage's mutationFn). They stay as
  // optional UI affordances until that backend work lands.
  organizationId: z.string().optional(),
  serviceDeskId: z.string().min(1, 'Mesa de Serviço é obrigatória'),
  requesterId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  parentId: z.string().optional(),
  followersIds: z.array(z.string()).optional(),
  scheduledDate: z.string().optional(),
  attachments: z.array(z.custom<File>()).optional(),
});

export type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface TicketFormProps {
  onSubmit: (values: TicketFormValues & { saveAndNew?: boolean }) => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  catalogOverride?: CatalogItem | null;
}

export function TicketForm({ onSubmit, isSubmitting, submitError, catalogOverride }: TicketFormProps) {
  const currentUser = useAuthStore((state) => state.user);

  // Queries (Mocking relations missing in Prisma for UI completion)
  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get<Organization[]>('/organizations');
      return data;
    },
  });

  const { data: serviceDesks = [] } = useQuery({
    queryKey: ['service-desks'],
    queryFn: async () => {
      const { data } = await api.get<ServiceDesk[]>('/service-desks');
      return data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Endpoint to ideally list all users
      const { data } = await api.get<UserData[]>('/users').catch(() => ({ data: [] }));
      return data.length ? data : currentUser ? [{ id: currentUser.sub, name: currentUser.email }] : [];
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets-list'],
    queryFn: async () => {
      const { data } = await api.get<any[]>('/tickets').catch(() => ({ data: [] }));
      return data.map(t => ({ id: t.id, title: t.title }));
    }
  });

  const isClientBase = currentUser?.role === 'CLIENT' || currentUser?.role === 'CLIENT_MASTER';

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: catalogOverride?.title || '',
      description: '',
      organizationId: isClientBase ? currentUser?.organizationId || '' : '',
      serviceDeskId: catalogOverride?.defaultServiceDeskId || '',
      requesterId: currentUser?.role === 'CLIENT' ? currentUser?.sub || '' : '',
      priority: catalogOverride?.defaultPriority || 'MEDIUM',
      followersIds: [],
    },
  });

  const watchOrgId = watch('organizationId');
  const [showSchedule, setShowSchedule] = useState(false);

  const availableDesks = serviceDesks; 

  const availableRequesters = users.filter(u => {
    if (currentUser?.role === 'CLIENT') return u.id === currentUser?.sub;
    if (watchOrgId) return u.organizationId === watchOrgId || u.id === currentUser?.sub;
    return true;
  });

  const orgOptions = orgs.map(o => ({ label: o.name, value: o.id }));
  const requesterOptions = availableRequesters.map(u => ({ label: u.name, value: u.id }));
  const ticketOptions = tickets.map((t: any) => ({ label: `${t.id.split('-')[0]} - ${t.title}`, value: t.id }));
  const followerOptions = users.map(u => ({ label: u.name, value: u.id }));

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data))}
      noValidate
      className="w-full space-y-6 bg-white p-6 md:p-8 rounded-[16px] border border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
        <Controller
          name="organizationId"
          control={control}
          render={({ field }) => (
            <EzSearch
              id="ticket-organization"
              label="Cliente"
              placeholder="Buscar cliente..."
              options={orgOptions}
              value={field.value}
              onChange={field.onChange}
              hasError={!!errors.organizationId}
              message={errors.organizationId?.message}
              disabled={currentUser?.role === 'CLIENT'}
            />
          )}
        />

        <Controller
          name="serviceDeskId"
          control={control}
          render={({ field }) => (
            <EzComboBox
              id="ticket-service-desk"
              label="Mesa de Serviço"
              value={field.value}
              onChange={field.onChange}
              hasError={!!errors.serviceDeskId}
              message={errors.serviceDeskId?.message}
              required
              disabled={!!catalogOverride}
            >
              <option value="">Selecione uma mesa</option>
              {availableDesks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </EzComboBox>
          )}
        />

        <Controller
          name="requesterId"
          control={control}
          render={({ field }) => (
            <EzSearch
              id="ticket-requester"
              label="Solicitante"
              placeholder="Buscar usuário..."
              options={requesterOptions}
              value={field.value}
              onChange={field.onChange}
              hasError={!!errors.requesterId}
              message={errors.requesterId?.message}
              disabled={currentUser?.role === 'CLIENT'}
            />
          )}
        />

        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <EzComboBox
              id="ticket-priority"
              label="Prioridade"
              value={field.value}
              onChange={field.onChange}
              hasError={!!errors.priority}
              message={errors.priority?.message}
              disabled={!!catalogOverride}
            >
              {priorities.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}
            </EzComboBox>
          )}
        />
      </div>

      <div className="space-y-6 pb-6 border-b border-gray-100">
        <EzTextInput
          id="ticket-title"
          label="Título (Assunto)"
          {...register('title')}
          hasError={!!errors.title}
          message={errors.title?.message}
          readOnly={!!catalogOverride}
          disabled={!!catalogOverride}
          required
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <EzRichText
              testId="ticket-description"
              label="Descrição Detalhada"
              value={field.value}
              onChange={field.onChange}
              hasError={!!errors.description}
              message={errors.description?.message}
            />
          )}
        />

        <Controller
          name="attachments"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <EzUpload
                label="Anexar arquivos (Imagens, PDF, Docs)"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={(files) => field.onChange([...(field.value || []), ...files])}
              />
              {field.value && field.value.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {field.value.map((f, i) => (
                    <EzFileItem 
                      key={i} 
                      file={f} 
                      onRemove={() => {
                        const newFiles = [...field.value!];
                        newFiles.splice(i, 1);
                        field.onChange(newFiles);
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
        <Controller
          name="parentId"
          control={control}
          render={({ field }) => (
            <EzSearch
              label="Ticket Pai (Opcional)"
              placeholder="Buscar ticket existente..."
              options={ticketOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          name="followersIds"
          control={control}
          render={({ field }) => (
            <EzMultiSelect
              label="Seguidores"
              placeholder="Adicionar seguidores..."
              options={followerOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {showSchedule && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 pb-4">
          <Controller
            name="scheduledDate"
            control={control}
            render={({ field }) => (
              <EzDateInput
                label="Data para Agendamento"
                className="max-w-[200px]"
                {...field}
              />
            )}
          />
        </div>
      )}

      {submitError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-[8px] text-[13px] font-medium border border-red-200">
          {submitError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div>
          <EzButton
            type="button"
            variant="tertiary"
            leftIcon={CalendarClock}
            onClick={() => setShowSchedule(!showSchedule)}
            label={showSchedule ? "Cancelar Agendamento" : "Agendar Ticket"}
          />
        </div>
        
        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <EzButton
            type="button"
            variant="secondary"
            onClick={handleSubmit((data) => onSubmit({ ...data, saveAndNew: true }))}
            disabled={isSubmitting}
            label="Salvar e criar novo"
            className="w-full sm:w-auto"
          />
          <EzButton
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            label={isSubmitting ? "Enviando..." : "Abrir Ticket"}
            className="w-full sm:w-auto"
          />
        </div>
      </div>
    </form>
  );
}

export default TicketForm;
