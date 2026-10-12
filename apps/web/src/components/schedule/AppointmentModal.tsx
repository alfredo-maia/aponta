import { useEffect, useState } from 'react';
import { Appointment, AppointmentType, CreateAppointmentInput, UpdateAppointmentInput } from '../../hooks/useAppointments';
import { EzButton, EzModal, EzTextInput, EzBadge } from '../ds';
import { Trash2 } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  initialDate?: string | null;
  onSave: (data: CreateAppointmentInput | UpdateAppointmentInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  canEdit?: boolean;
}

export function AppointmentModal({
  isOpen,
  onClose,
  appointment,
  initialDate,
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
  const [type, setType] = useState<AppointmentType>('APPOINTMENT');
  const [organizationId, setOrganizationId] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      setTitle(appointment.title);
      setDescription(appointment.description || '');
      setType(appointment.type);
      setOrganizationId(appointment.organizationId || '');
      setTicketId(appointment.ticketId || '');

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
      setType('APPOINTMENT');
      setStartDate(defaultDate);
      setStartTime('09:00');
      setEndDate(defaultDate);
      setEndTime('10:00');
      setOrganizationId('');
      setTicketId('');
    }
    setError(null);
  }, [appointment, initialDate, isOpen]);

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

    try {
      if (appointment) {
        await onSave({
          id: appointment.id,
          title,
          description: description || undefined,
          startTime: startISO,
          endTime: endISO,
          type,
          organizationId: organizationId || undefined,
          ticketId: ticketId || undefined,
        });
      } else {
        await onSave({
          title,
          description: description || undefined,
          startTime: startISO,
          endTime: endISO,
          type,
          organizationId: organizationId || undefined,
          ticketId: ticketId || undefined,
        });
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
              {appointment.type}
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

        <EzTextInput
          label="Título"
          placeholder="Ex: Reunião com cliente, Atendimento remoto..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit || isSubmitting}
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
              <option value="APPOINTMENT">Compromisso (Geral)</option>
              <option value="ALLOCATION">Alocação Técnica (Chamado/Cliente)</option>
              <option value="ABSENCE">Ausência / Férias / Folga</option>
            </select>
          </div>

          <EzTextInput
            label="ID da Organização (Opcional)"
            placeholder="UUID da Organização"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            disabled={!canEdit || isSubmitting}
          />
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

        <EzTextInput
          label="ID do Chamado (Opcional)"
          placeholder="UUID do Ticket vinculado"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          disabled={!canEdit || isSubmitting}
        />

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
