import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Appointment, AppointmentType, CreateAppointmentInput, UpdateAppointmentInput } from '../../hooks/useAppointments';
import { Ticket } from '../../hooks/useTickets';
import { useAuthStore } from '../../stores/authStore';
import { TicketSearchModal } from './TicketSearchModal';
import { EzButton, EzModal, EzTextInput, EzBadge, EzSearch, EzDateInput, EzTimeInput } from '../ds';
import { Search, Trash2, Unlink, User as UserIcon } from 'lucide-react';

interface OrganizationOption {
  id: string;
  name: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  initialDate?: string | null;
  initialType?: AppointmentType;
  onSave: (data: CreateAppointmentInput | UpdateAppointmentInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  canEdit?: boolean;
}

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: 'AGENDA', label: 'Agenda' },
  { value: 'ABSENCE', label: 'Ausência' },
  { value: 'VACATION', label: 'Férias' },
];

interface LinkedTicket {
  id: string;
  protocol: string;
  title: string;
  requesterName?: string;
}

export function AppointmentModal({
  isOpen,
  onClose,
  appointment,
  initialDate,
  initialType = 'AGENDA',
  onSave,
  onDelete,
  canEdit = true,
}: AppointmentModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<AppointmentType>('AGENDA');
  const [organizationId, setOrganizationId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [linkedTicket, setLinkedTicket] = useState<LinkedTicket | null>(null);
  const [isTicketSearchOpen, setIsTicketSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userRole = useAuthStore((state) => state.user?.role);

  const organizationsQuery = useQuery({
    queryKey: ['organizations', 'appointment-picker'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationOption[]>('/organizations');
      return data;
    },
    enabled: isOpen && !linkedTicket,
  });
  const organizationOptions = (Array.isArray(organizationsQuery.data) ? organizationsQuery.data : []).map((org) => ({
    label: org.name,
    value: org.id,
  }));

  useEffect(() => {
    if (appointment) {
      setTitle(appointment.title);
      setDescription(appointment.description || '');
      setType(appointment.type);
      setOrganizationId(appointment.organizationId || '');
      setOrganizationName(appointment.organization?.name || '');
      setLinkedTicket(
        appointment.ticket
          ? {
              id: appointment.ticket.id,
              protocol: appointment.ticket.protocol,
              title: appointment.ticket.title,
              requesterName: appointment.ticket.requester?.name,
            }
          : null,
      );

      const s = new Date(appointment.startTime);
      const e = new Date(appointment.endTime);
      setStartDate(s.toISOString().split('T')[0]);
      setStartTime(s.toTimeString().slice(0, 5));
      setEndDate(e.toISOString().split('T')[0]);
      setEndTime(e.toTimeString().slice(0, 5));
    } else {
      const defaultDate = initialDate || new Date().toISOString().split('T')[0];
      setTitle('');
      setDescription('');
      setType(initialType);
      setStartDate(defaultDate);
      setStartTime('09:00');
      setEndDate(defaultDate);
      setEndTime('10:00');
      setOrganizationId('');
      setOrganizationName('');
      setLinkedTicket(null);
    }
    setIsTicketSearchOpen(false);
    setError(null);
  }, [appointment, initialDate, initialType, isOpen]);

  const handleSelectTicket = (ticket: Ticket) => {
    setLinkedTicket({ id: ticket.id, protocol: ticket.protocol, title: ticket.title });
    // Título e organização são derivados do chamado no backend; refletimos
    // o título aqui de imediato para feedback visual antes de salvar.
    setTitle(ticket.title);
    if (!description.trim()) {
      setDescription(ticket.description.length > 160 ? `${ticket.description.slice(0, 160).trim()}…` : ticket.description);
    }
    setIsTicketSearchOpen(false);
  };

  const handleUnlinkTicket = () => {
    setLinkedTicket(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }

    const startISO = `${startDate}T${startTime}:00Z`;
    const endISO = `${endDate}T${endTime}:00Z`;

    if (new Date(endISO) <= new Date(startISO)) {
      setError('A data/hora de término deve ser posterior ao início');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      title,
      description: description || undefined,
      startTime: startISO,
      endTime: endISO,
      type,
      organizationId: linkedTicket ? undefined : organizationId || undefined,
      ticketId: linkedTicket?.id || undefined,
    };

    try {
      if (appointment) {
        await onSave({ id: appointment.id, ...payload });
      } else {
        await onSave(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar o compromisso';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment || !onDelete) return;
    if (window.confirm('Tem certeza que deseja remover este compromisso?')) {
      setIsSubmitting(true);
      try {
        await onDelete(appointment.id);
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao remover';
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <EzModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{appointment ? 'Editar Compromisso' : 'Novo Agendamento'}</span>
          {appointment && (
            <EzBadge size="small" colorClass="bg-blue-100 text-blue-800">
              {TYPE_OPTIONS.find((t) => t.value === appointment.type)?.label ?? appointment.type}
            </EzBadge>
          )}
        </div>
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {appointment && onDelete && canEdit ? (
            <EzButton
              variant="tertiary"
              size="small"
              leftIcon={Trash2}
              onClick={handleDelete}
              disabled={isSubmitting}
              label="Excluir"
              className="text-red-600 hover:text-red-800"
            />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <EzButton
              variant="secondary"
              size="small"
              onClick={onClose}
              disabled={isSubmitting}
              label="Cancelar"
            />
            {canEdit && (
              <EzButton
                variant="primary"
                size="small"
                onClick={handleSubmit}
                disabled={isSubmitting}
                label={isSubmitting ? 'Salvando...' : 'Salvar'}
              />
            )}
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
        {error && (
          <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Chamado vinculado (Opcional)</label>
          {linkedTicket ? (
            <div className="flex items-center justify-between gap-2 p-2.5 border border-brand-200 bg-brand-50 rounded-[8px]">
              <div className="min-w-0">
                <span className="text-xs font-bold text-brand-700">#{linkedTicket.protocol}</span>
                <p className="text-sm text-gray-800 truncate">{linkedTicket.title}</p>
                {linkedTicket.requesterName && (
                  <p className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                    <UserIcon className="w-3 h-3" /> {linkedTicket.requesterName}
                  </p>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleUnlinkTicket}
                  className="shrink-0 p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Desvincular chamado"
                  aria-label="Desvincular chamado"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsTicketSearchOpen(true)}
              disabled={!canEdit || isSubmitting}
              className="w-full flex items-center gap-2 px-3 h-[42px] text-sm text-gray-500 border border-gray-300 rounded-[8px] bg-white hover:border-gray-400 disabled:bg-gray-80 disabled:cursor-not-allowed transition-colors"
            >
              <Search className="w-4 h-4 shrink-0" />
              Buscar chamado por protocolo, título, cliente ou mesa...
            </button>
          )}
        </div>

        <EzTextInput
          label="Título"
          placeholder="Ex: Reunião com cliente, Atendimento remoto..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit || isSubmitting || !!linkedTicket}
          message={linkedTicket ? 'Derivado do título do chamado vinculado' : undefined}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Evento</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AppointmentType)}
              disabled={!canEdit || isSubmitting}
              className="w-full h-[42px] px-3 text-sm border border-gray-300 rounded-[8px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {linkedTicket ? (
            <EzTextInput
              label="Organização"
              value={organizationName || 'Definida automaticamente pelo chamado'}
              disabled
              message="Derivada do solicitante do chamado vinculado"
            />
          ) : (
            <EzSearch
              label="Organização (Opcional)"
              placeholder="Buscar cliente..."
              options={organizationOptions}
              value={organizationId || null}
              onChange={(value) => setOrganizationId(value ? String(value) : '')}
              disabled={!canEdit || isSubmitting}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Início</label>
            <div className="flex flex-col gap-2">
              <EzDateInput
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!canEdit || isSubmitting}
                required
              />
              <EzTimeInput
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!canEdit || isSubmitting}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Término</label>
            <div className="flex flex-col gap-2">
              <EzDateInput
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!canEdit || isSubmitting}
                required
              />
              <EzTimeInput
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!canEdit || isSubmitting}
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit || isSubmitting}
            placeholder="Detalhes ou pauta do compromisso..."
            className="w-full p-2.5 text-sm border border-gray-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </form>

      <TicketSearchModal
        isOpen={isTicketSearchOpen}
        onClose={() => setIsTicketSearchOpen(false)}
        onSelect={handleSelectTicket}
        showOrganizationFilter={userRole !== 'CLIENT_MASTER'}
      />
    </EzModal>
  );
}
