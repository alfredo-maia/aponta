import { useState } from 'react';
import {
  Clock,
  Save,
  ArrowLeft,
  User,
  Building,
} from 'lucide-react';
import { EzTabs } from '../ds/EzTabs';
import { EzTag } from '../ds/EzTag';
import { EzLayoutFormConfigLayout } from '../ds/EzLayoutFormConfig';
import type { Ticket, TicketStatus, TicketPriority } from '../../hooks/useTickets';
import {
  statusLabels,
  priorityLabels,
  statusTagVariants,
  priorityTagVariants,
} from './TicketCard';
import { TicketAttachments } from './TicketAttachments';
import { TicketChecklist } from './TicketChecklist';
import { TicketCsat } from './TicketCsat';
import { cn } from '../ds/utils';

export interface TicketFormModeProps {
  ticket: Ticket;
  layout: EzLayoutFormConfigLayout;
  onSave?: (updatedTicket: Partial<Ticket>) => Promise<void> | void;
  onBackToGrid: () => void;
  className?: string;
}

export function TicketFormMode({
  ticket,
  layout = 'CASCADE',
  onSave,
  onBackToGrid,
  className,
}: TicketFormModeProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'sla' | 'anexos' | 'csat'>('geral');
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description ?? '');
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [isSaving, setIsSaving] = useState(false);

  const isSideBySide = layout === 'SIDE_BY_SIDE';

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave({ title, description, status, priority });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (isoStr: string | null | undefined) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div
      data-testid="ticket-form-mode"
      className={cn('flex flex-col bg-white rounded-[10px] border border-gray-200 overflow-hidden shadow-xs', className)}
    >
      {/* Form Subheader / Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 bg-gray-50/70">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="ticket-form-back-button"
            onClick={onBackToGrid}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-[6px] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar à Grade
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[14px] font-bold text-brand-700">
              {ticket.protocol}
            </span>
            <EzTag
              label={statusLabels[status] ?? status}
              variant={statusTagVariants[status]}
            />
            <EzTag
              label={priorityLabels[priority] ?? priority}
              variant={priorityTagVariants[priority]}
            />
          </div>
        </div>

        {onSave && (
          <button
            type="button"
            data-testid="ticket-form-save-button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-[6px] shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="px-5 pt-2 border-b border-gray-200 bg-white">
        <EzTabs
          tabs={[
            { id: 'geral', label: 'Geral' },
            { id: 'sla', label: 'Atendimento & SLA' },
            { id: 'anexos', label: 'Anexos & Tarefas' },
            { id: 'csat', label: 'Avaliação CSAT' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as 'geral' | 'sla' | 'anexos' | 'csat')}
        />
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {activeTab === 'geral' && (
          <div className={cn(isSideBySide ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'flex flex-col gap-4')}>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-700">Protocolo</label>
              <input
                type="text"
                disabled
                value={ticket.protocol}
                className="w-full px-3 py-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-[6px] font-mono text-gray-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-700">Mesa / Fila</label>
              <div className="flex items-center gap-2 px-3 py-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-[6px] text-gray-700">
                <Building className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-mono">{ticket.serviceDeskId}</span>
              </div>
            </div>

            <div className={cn('space-y-1', isSideBySide && 'md:col-span-2')}>
              <label className="text-[12px] font-medium text-gray-700">Título</label>
              <input
                type="text"
                data-testid="ticket-form-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 font-medium text-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-700">Status</label>
              <select
                data-testid="ticket-form-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white text-gray-800"
              >
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="CLOSED">Fechado</option>
                <option value="PENDING_CUSTOMER">Pendente Cliente</option>
                <option value="ON_HOLD">Em Espera</option>
                <option value="ESCALATED">Escalado</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-700">Prioridade</label>
              <select
                data-testid="ticket-form-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-1.5 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 bg-white text-gray-800"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>

            <div className={cn('space-y-1', isSideBySide && 'md:col-span-2')}>
              <label className="text-[12px] font-medium text-gray-700">Descrição</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 text-gray-900"
              />
            </div>
          </div>
        )}

        {activeTab === 'sla' && (
          <div className={cn(isSideBySide ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'flex flex-col gap-4')}>
            <div className="p-3.5 rounded-[8px] bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Responsável</span>
              <div className="flex items-center gap-2 text-[13px] text-gray-900 font-medium">
                <User className="w-4 h-4 text-gray-400" />
                {ticket.agentId ? ticket.agentId : <span className="text-gray-400 italic">Não atribuído</span>}
              </div>
            </div>

            <div className="p-3.5 rounded-[8px] bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Solicitante</span>
              <div className="flex items-center gap-2 text-[13px] text-gray-900 font-medium">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-mono text-[12px]">{ticket.requesterId}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[8px] bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Prazo SLA de Resposta</span>
              <div className="flex items-center gap-2 text-[13px] text-gray-800">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatDate(ticket.responseDeadline)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[8px] bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Prazo SLA de Resolução</span>
              <div className="flex items-center gap-2 text-[13px] text-gray-800">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatDate(ticket.resolveDeadline)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-[8px] bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Data de Abertura</span>
              <div className="text-[13px] text-gray-700">{formatDate(ticket.createdAt)}</div>
            </div>

            <div className="p-3.5 rounded-[8px] bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Última Atualização</span>
              <div className="text-[13px] text-gray-700">{formatDate(ticket.updatedAt)}</div>
            </div>
          </div>
        )}

        {activeTab === 'anexos' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-[14px] font-semibold text-gray-900 mb-3">Anexos do Chamado</h4>
              <TicketAttachments ticketId={ticket.id} />
            </div>
            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-[14px] font-semibold text-gray-900 mb-3">Checklist de Tarefas</h4>
              <TicketChecklist ticketId={ticket.id} />
            </div>
          </div>
        )}

        {activeTab === 'csat' && (
          <div className="space-y-4">
            <TicketCsat ticket={ticket} />
          </div>
        )}
      </div>
    </div>
  );
}
