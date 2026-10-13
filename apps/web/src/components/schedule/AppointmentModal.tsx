import { useEffect, useRef, useState } from 'react';
import { Appointment, AppointmentType, CreateAppointmentInput, UpdateAppointmentInput } from '../../hooks/useAppointments';
import { useTickets } from '../../hooks/useTickets';
import { EzButton, EzModal, EzTextInput, EzBadge } from '../ds';
import { Search, Trash2, Unlink, User as UserIcon } from 'lucide-react';

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
  const [ticketSearch, setTicketSearch] = useState('');
  const [debouncedTicketSearch, setDebouncedTicketSearch] = useState('');
  const [isTicketSearchOpen, setIsTicketSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ticketSearchRef = useRef<HTMLDivElement>(null);

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
    setTicketSearch('');
    setIsTicketSearchOpen(false);
    setError(null);
  }, [appointment, initialDate, initialType, isOpen]);

  // Debounce the ticket search term so we don't query on every keystroke
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTicketSearch(ticketSearch.trim()), 300);
    return () => clearTimeout(handle);
  }, [ticketSearch]);

  // Close the ticket search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ticketSearchRef.current && !ticketSearchRef.current.contains(event.target as Node)) {
        setIsTicketSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ticketResults = useTickets({
    search: debouncedTicketSearch.length >= 2 ? debouncedTicketSearch : undefined,
    notClosed: true,
    page: 1,
  });

  const handleSelectTicket = (ticket: { id: string; protocol: string; title: string; description: string }) => {
    setLinkedTicket({ id: ticket.id, protocol: ticket.protocol, title: ticket.title });
    // Título e organização são derivados do chamado no backend; refletimos
    // o título aqui de imediato para feedback visual antes de salvar.
    setTitle(ticket.title);
    if (!description.trim()) {
      setDescription(ticket.description.length > 160 ? `${ticket.description.slice(0, 160).trim()}…` : ticket.description);
    }
    setTicketSearch('');
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

  const ticketMatches = ticketResults.data?.data ?? [];

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
            <div className="relative" ref={ticketSearchRef}>
              <EzTextInput
                placeholder="Buscar por protocolo ou título do chamado..."
                leftIcon={<Search className="w-4 h-4" />}
                value={ticketSearch}
                onChange={(e) => {
                  setTicketSearch(e.target.value);
                  setIsTicketSearchOpen(true);
                }}
                onFocus={() => setIsTicketSearchOpen(true)}
                disabled={!canEdit || isSubmitting}
              />
              {isTicketSearchOpen && debouncedTicketSearch.length >= 2 && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-[8px] shadow-lg">
                  {ticketResults.isLoading ? (
                    <div className="p-3 text-xs text-gray-500">Buscando chamados não fechados...</div>
                  ) : ticketMatches.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500">Nenhum chamado não fechado encontrado.</div>
                  ) : (
                    ticketMatches.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTicket(t)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <span className="text-xs font-bold text-brand-600">#{t.protocol}</span>
                        <p className="text-sm text-gray-800 truncate">{t.title}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
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
            <EzTextInput
              label="ID da Organização (Opcional)"
              placeholder="UUID da Organização"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              disabled={!canEdit || isSubmitting}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Início</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!canEdit || isSubmitting}
                className="w-2/3 h-[42px] px-2 text-sm border border-gray-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!canEdit || isSubmitting}
                className="w-1/3 h-[42px] px-2 text-sm border border-gray-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Término</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!canEdit || isSubmitting}
                className="w-2/3 h-[42px] px-2 text-sm border border-gray-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!canEdit || isSubmitting}
                className="w-1/3 h-[42px] px-2 text-sm border border-gray-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand-500"
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
    </EzModal>
  );
}
