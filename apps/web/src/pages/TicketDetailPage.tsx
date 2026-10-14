import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CommentForm } from '../components/tickets/CommentForm';
import { TicketComments } from '../components/tickets/TicketComments';
import { TicketDetail } from '../components/tickets/TicketDetail';
import { TicketAttachments } from '../components/tickets/TicketAttachments';
import { TicketCsat } from '../components/tickets/TicketCsat';
import { TicketWorklogs } from '../components/tickets/TicketWorklogs';
import { useTicket } from '../hooks/useTicket';
import { useAuthStore } from '../stores/authStore';
import { EzSpinner, EzAlert, EzTabs, EzTabItem } from '../components/ds';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: ticket, isLoading, isError } = useTicket(id);
  const user = useAuthStore((state) => state.user);

  const initialTab = searchParams.get('tab') || 'geral';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isWorklogModalOpen, setIsWorklogModalOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div role="status">
        <EzSpinner label="Carregando chamado…" />
      </div>
    );
  }

  // The API returns 404 both for unknown ids and for tickets a CLIENT does
  // not own, so the error copy covers both cases without distinguishing them.
  if (isError || !ticket) {
    return (
      <EzAlert variant="error">
        Falha ao carregar o chamado. Ele pode não existir ou você pode não
        ter acesso a ele.
      </EzAlert>
    );
  }

  const isClient = user?.role === 'CLIENT';

  const tabs: EzTabItem[] = isClient
    ? [
        { id: 'geral', label: 'Informações gerais' },
        { id: 'comunicacao', label: 'Comunicação' },
      ]
    : [
        { id: 'geral', label: 'Informações gerais' },
        { id: 'categoria', label: 'Categoria' },
        { id: 'tipo_atendimento', label: 'Tipo de Atendimento' },
        { id: 'apontamentos', label: 'Apontamentos' },
        { id: 'comunicacao', label: 'Comunicação' },
        { id: 'compromissos', label: 'Compromissos' },
        { id: 'valorizacao', label: 'Valorização' },
        { id: 'assinatura', label: 'Assinatura eletrônica' },
        { id: 'github', label: 'GitHub' },
        { id: 'historico', label: 'Histórico' },
      ];

  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden shadow-xs">
        {/* Card Header with Protocol, Title, Status, and Actions (TiFlux Parity) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[15px] font-bold text-gray-800">
              #{ticket.protocol} - {ticket.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Action buttons if any */}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 border-b border-gray-200 bg-white">
          <EzTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(String(tabId))}
          />
        </div>

        {/* Tab Panels */}
        <div className="p-6">
          {/* Tab: Informações gerais */}
          <div className={activeTab === 'geral' ? 'space-y-6' : 'hidden'} data-testid="tab-panel-geral">
            <TicketDetail ticket={ticket} />
            <TicketCsat ticket={ticket} />
            <TicketAttachments ticketId={ticket.id} />
          </div>

          {/* Tab: Categoria */}
          {!isClient && (
            <div className={activeTab === 'categoria' ? 'space-y-4' : 'hidden'} data-testid="tab-panel-categoria">
              <h3 className="text-[16px] font-semibold text-gray-900 border-b border-gray-100 pb-3">Categoria</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div>
                  <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider block">Tipo de Atendimento</span>
                  <span className="text-[14px] text-gray-900 mt-1 block font-medium">Remoto</span>
                </div>
                <div>
                  <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider block">Previsão de Entrega</span>
                  <span className="text-[14px] text-gray-900 mt-1 block">
                    {ticket.resolveDeadline ? new Date(ticket.resolveDeadline).toLocaleDateString('pt-BR') : 'Sem dados'}
                  </span>
                </div>
                <div>
                  <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider block">Estimativa</span>
                  <span className="text-[14px] text-gray-900 mt-1 block text-gray-500">Sem dados</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Tipo de Atendimento */}
          {!isClient && (
            <div className={activeTab === 'tipo_atendimento' ? 'space-y-4' : 'hidden'} data-testid="tab-panel-tipo-atendimento">
              <h3 className="text-[16px] font-semibold text-gray-900 border-b border-gray-100 pb-3">Tipo de Atendimento</h3>
              <div className="p-4 rounded-[8px] bg-gray-50 border border-gray-200">
                <span className="text-[14px] text-gray-900 font-medium">Atendimento Remoto</span>
                <p className="text-[13px] text-gray-500 mt-1">Chamado executado remotamente através do portal de Helpdesk DM Tecnologia.</p>
              </div>
            </div>
          )}

          {/* Tab: Apontamentos (Worklog) */}
          {!isClient && (
            <div className={activeTab === 'apontamentos' ? 'block' : 'hidden'} data-testid="tab-panel-apontamentos">
              <TicketWorklogs
                ticketId={ticket.id}
                isModalOpen={isWorklogModalOpen}
                onModalOpenChange={setIsWorklogModalOpen}
              />
            </div>
          )}

          {/* Tab: Comunicação */}
          <div className={activeTab === 'comunicacao' ? 'space-y-6' : 'hidden'} data-testid="tab-panel-comunicacao">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="px-3 py-1 text-[13px] font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Cliente
              </span>
              <span className="px-3 py-1 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer">
                Equipe interna
              </span>
              <span className="px-3 py-1 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer">
                Chat
              </span>
            </div>
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-gray-900">Enviar resposta para o cliente</h3>
              <CommentForm ticketId={ticket.id} />
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-[15px] font-semibold text-gray-900">Comunicados enviados e recebidos</h3>
              <TicketComments ticketId={ticket.id} />
            </div>
          </div>

          {/* Tab: Compromissos */}
          {!isClient && (
            <div className={activeTab === 'compromissos' ? 'space-y-4' : 'hidden'} data-testid="tab-panel-compromissos">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[16px] font-semibold text-gray-900">Compromissos</h3>
                <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#00B5A5] hover:bg-[#009E90] rounded-[6px]">
                  + Compromisso
                </button>
              </div>
              <div className="p-8 text-center bg-gray-50/50 rounded-[8px] border border-dashed border-gray-200 text-gray-500 text-[13px]">
                Nenhum compromisso agendado para este chamado.
              </div>
            </div>
          )}

          {/* Tab: Valorização */}
          {!isClient && (
            <div className={activeTab === 'valorizacao' ? 'space-y-6' : 'hidden'} data-testid="tab-panel-valorizacao">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[16px] font-semibold text-gray-900">Valorização</h3>
                <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#00B5A5] hover:bg-[#009E90] rounded-[6px]">
                  + Valor extra
                </button>
              </div>
              <div className="space-y-2">
                <h4 className="text-[14px] font-medium text-gray-700">Valores extras</h4>
                <div className="p-6 text-center bg-gray-50/50 rounded-[8px] border border-dashed border-gray-200 text-gray-500 text-[13px]">
                  Nenhum valor extra cadastrado.
                </div>
              </div>
            </div>
          )}

          {/* Tab: Assinatura eletrônica */}
          {!isClient && (
            <div className={activeTab === 'assinatura' ? 'space-y-4' : 'hidden'} data-testid="tab-panel-assinatura">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[16px] font-semibold text-gray-900">Assinatura eletrônica</h3>
                <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#00B5A5] hover:bg-[#009E90] rounded-[6px]">
                  + Assinatura
                </button>
              </div>
              <div className="p-8 text-center bg-gray-50/50 rounded-[8px] border border-dashed border-gray-200 text-gray-500 text-[13px]">
                Nenhuma assinatura cadastrada.
              </div>
            </div>
          )}

          {/* Tab: GitHub */}
          {!isClient && (
            <div className={activeTab === 'github' ? 'space-y-4' : 'hidden'} data-testid="tab-panel-github">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[16px] font-semibold text-gray-900">Integrações GitHub</h3>
                <div className="flex items-center gap-2">
                  <button type="button" className="px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-200 rounded-[6px] hover:bg-gray-50">
                    + Criar issue
                  </button>
                  <button type="button" className="px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-200 rounded-[6px] hover:bg-gray-50">
                    + Associar issue
                  </button>
                </div>
              </div>
              <div className="p-8 text-center bg-gray-50/50 rounded-[8px] border border-dashed border-gray-200 text-gray-500 text-[13px]">
                Não há dados vinculados do GitHub.
              </div>
            </div>
          )}

          {/* Tab: Histórico */}
          {!isClient && (
            <div className={activeTab === 'historico' ? 'space-y-4' : 'hidden'} data-testid="tab-panel-historico">
              <div className="text-[16px] font-semibold text-gray-900 border-b border-gray-100 pb-3">Histórico de Alterações</div>
              <p className="text-[13px] text-gray-500">Consulte a aba "Informações gerais" para a trilha completa de auditoria do chamado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketDetailPage;
