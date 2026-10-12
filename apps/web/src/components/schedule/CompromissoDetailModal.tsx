import { useState } from 'react';
import { Appointment } from '../../hooks/useAppointments';
import { EzModal } from '../ds';
import { Calendar, Bell, Pencil, Trash2 } from 'lucide-react';

interface CompromissoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => Promise<void>;
  canEdit?: boolean;
}

export function CompromissoDetailModal({
  isOpen,
  onClose,
  appointment,
  onEdit,
  onDelete,
  canEdit = true,
}: CompromissoDetailModalProps) {
  const [completed, setCompleted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!appointment) return null;

  const startDate = new Date(appointment.startTime);
  const endDate = new Date(appointment.endTime);

  const formatShortDate = (d: Date) => {
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTimeStr = (d: Date) => {
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const weekdayName = startDate.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateRangeStr = `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
  const timeRangeStr = `${weekdayName}, ${formatTimeStr(startDate)} até ${formatTimeStr(endDate)}`;

  const attendantName = appointment.user?.name || 'Técnico';
  const attendantInitials = attendantName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  // Ticket or title format
  const titleDisplay = appointment.ticket?.protocol
    ? `#${appointment.ticket.protocol} - ${appointment.title}`
    : appointment.title;

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja remover este compromisso?')) {
      setIsDeleting(true);
      try {
        await onDelete(appointment.id);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <EzModal
      isOpen={isOpen}
      onClose={onClose}
      title="Compromisso"
      className="max-w-md"
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="border border-gray-200 rounded-[12px] p-5 bg-white space-y-4 shadow-sm">
          {/* Ticket / Subject in Teal */}
          <div>
            <h3 className="text-[#00a884] font-bold text-sm tracking-wide leading-tight hover:underline cursor-pointer">
              {titleDisplay}
            </h3>
          </div>

          {/* Date & Time with Calendar Icon */}
          <div className="flex items-start gap-3">
            <div className="text-gray-800 shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 leading-tight">
                {dateRangeStr}
              </span>
              <span className="text-xs text-gray-600 capitalize mt-0.5">
                {timeRangeStr}
              </span>
            </div>
          </div>

          {/* Attendant User with Avatar */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-teal-200">
              {attendantInitials}
            </div>
            <span className="text-sm font-medium text-gray-800">
              {attendantName}
            </span>
          </div>

          {/* Reminder row */}
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <Bell className="w-4 h-4 text-gray-700 shrink-0" />
            <span>0 minutos antes</span>
          </div>

          {/* Description */}
          {appointment.description && (
            <div className="pt-2 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
              {appointment.description}
            </div>
          )}
        </div>

        {/* Footer actions: Concluído checkbox & Edit/Delete icons */}
        <div className="flex items-center justify-between pt-1 px-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700 font-medium">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Concluído</span>
          </label>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  type="button"
                  aria-label="Editar"
                  title="Editar"
                  onClick={() => {
                    onClose();
                    onEdit(appointment);
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Excluir"
                  title="Excluir"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </EzModal>
  );
}
