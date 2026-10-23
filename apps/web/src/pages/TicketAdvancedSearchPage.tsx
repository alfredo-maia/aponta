import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { filtersToSearchParams } from '../lib/ticketFilterParams';
import type { TicketFiltersInput, TicketPriority, TicketStatus } from '../hooks/useTickets';
import { statusLabels, priorityLabels } from '../components/tickets/TicketCard';
import type { DeskStage } from '../components/MesaStagesEditor';
import { EzComboBox, EzTextInput, EzButton } from '../components/ds';

interface PickerOption {
  id: string;
  name: string;
}

const ticketStatuses = Object.keys(statusLabels) as TicketStatus[];
const ticketPriorities = Object.keys(priorityLabels) as TicketPriority[];

const EMPTY_FORM = {
  dateField: 'createdAt' as 'createdAt' | 'closedAt',
  dateFrom: '',
  dateTo: '',
  number: '',
  titleContains: '',
  status: '' as TicketStatus | '',
  organizationId: '',
  requesterQuery: '',
  agentId: '',
  serviceDeskId: '',
  stageId: '',
  priority: '' as TicketPriority | '',
  mine: false,
  unassigned: false,
  paused: false,
  overdue: false,
};

type AdvancedSearchForm = typeof EMPTY_FORM;

/**
 * Busca avançada (SPEC DMTE-137 D4): absorve o painel TicketFilters antigo.
 * "Buscar" navega para "/" com os filtros na query string — a Lista/Kanban
 * da Tickets page é a única fonte de verdade para exibir os resultados.
 */
export function TicketAdvancedSearchPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isClient = user?.role === 'CLIENT';
  const isClientMaster = user?.role === 'CLIENT_MASTER';
  const [form, setForm] = useState<AdvancedSearchForm>(EMPTY_FORM);

  const { data: serviceDesks = [] } = useQuery({
    queryKey: ['service-desks', 'advanced-search'],
    queryFn: async () => (await api.get<PickerOption[]>('/service-desks')).data,
  });
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', 'advanced-search'],
    queryFn: async () => (await api.get<PickerOption[]>('/organizations')).data,
    enabled: !isClient && !isClientMaster,
  });
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', 'advanced-search'],
    queryFn: async () => (await api.get<PickerOption[]>('/users/agents')).data,
    enabled: !isClient,
  });
  const { data: stages = [] } = useQuery({
    queryKey: ['service-desk-stages', 'advanced-search', form.serviceDeskId],
    queryFn: async () =>
      (await api.get<DeskStage[]>(`/service-desks/${form.serviceDeskId}/stages`)).data,
    enabled: Boolean(form.serviceDeskId),
  });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const filters: TicketFiltersInput = {};
    if (form.number) filters.number = form.number;
    if (form.titleContains) filters.titleContains = form.titleContains;
    if (form.status) filters.status = form.status;
    if (form.organizationId) filters.organizationId = form.organizationId;
    if (form.requesterQuery) filters.requesterQuery = form.requesterQuery;
    if (form.agentId) filters.agentId = form.agentId;
    if (form.serviceDeskId) filters.serviceDeskId = form.serviceDeskId;
    if (form.stageId) filters.stageId = form.stageId;
    if (form.priority) filters.priority = form.priority;
    if (form.dateFrom) filters.dateFrom = form.dateFrom;
    if (form.dateTo) filters.dateTo = form.dateTo;
    if (form.dateFrom || form.dateTo) filters.dateField = form.dateField;
    if (form.mine) filters.mine = true;
    if (form.unassigned) filters.unassigned = true;
    if (form.paused) filters.paused = true;
    if (form.overdue) filters.overdue = true;

    navigate(`/?${filtersToSearchParams(filters).toString()}`);
  };

  const handleClear = () => setForm(EMPTY_FORM);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-[20px] font-semibold text-gray-900">Busca avançada</h1>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EzComboBox
            id="adv-search-date-field"
            label="Data"
            value={form.dateField}
            onChange={(e) =>
              setForm((f) => ({ ...f, dateField: e.target.value as 'createdAt' | 'closedAt' }))
            }
          >
            <option value="createdAt">Abertura</option>
            <option value="closedAt">Fechamento</option>
          </EzComboBox>
          <div className="flex gap-2">
            <EzTextInput
              id="adv-search-date-from"
              label="De"
              type="date"
              value={form.dateFrom}
              onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
            />
            <EzTextInput
              id="adv-search-date-to"
              label="Até"
              type="date"
              value={form.dateTo}
              onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>

          <EzTextInput
            id="adv-search-number"
            label="Número do ticket"
            value={form.number}
            onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
          />
          <EzTextInput
            id="adv-search-title"
            label="Título"
            value={form.titleContains}
            onChange={(e) => setForm((f) => ({ ...f, titleContains: e.target.value }))}
          />

          <EzComboBox
            id="adv-search-status"
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TicketStatus | '' }))}
          >
            <option value="">Qualquer status</option>
            {ticketStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </EzComboBox>

          <EzComboBox
            id="adv-search-priority"
            label="Prioridade"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority | '' }))}
          >
            <option value="">Qualquer prioridade</option>
            {ticketPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </EzComboBox>

          {!isClient && !isClientMaster && (
            <EzComboBox
              id="adv-search-organization"
              label="Cliente"
              value={form.organizationId}
              onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
            >
              <option value="">Todos os clientes</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </EzComboBox>
          )}

          {!isClient && (
            <EzTextInput
              id="adv-search-requester"
              label="Solicitante"
              placeholder="Nome ou e-mail"
              value={form.requesterQuery}
              onChange={(e) => setForm((f) => ({ ...f, requesterQuery: e.target.value }))}
            />
          )}

          {!isClient && (
            <EzComboBox
              id="adv-search-agent"
              label="Atendente"
              value={form.agentId}
              onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))}
            >
              <option value="">Todos os atendentes</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </EzComboBox>
          )}

          <EzComboBox
            id="adv-search-service-desk"
            label="Mesa de serviço"
            value={form.serviceDeskId}
            onChange={(e) =>
              setForm((f) => ({ ...f, serviceDeskId: e.target.value, stageId: '' }))
            }
          >
            <option value="">Todas as mesas</option>
            {serviceDesks.map((desk) => (
              <option key={desk.id} value={desk.id}>
                {desk.name}
              </option>
            ))}
          </EzComboBox>

          <EzComboBox
            id="adv-search-stage"
            label="Estágio"
            value={form.stageId}
            disabled={!form.serviceDeskId}
            onChange={(e) => setForm((f) => ({ ...f, stageId: e.target.value }))}
          >
            <option value="">Todos os estágios</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </EzComboBox>
        </div>

        <details className="rounded-[10px] border border-gray-200 p-3">
          <summary className="cursor-pointer text-[13px] font-medium text-gray-700">
            Filtros adicionais
          </summary>
          <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.mine}
                onChange={(e) => setForm((f) => ({ ...f, mine: e.target.checked }))}
              />
              Meus
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.unassigned}
                onChange={(e) => setForm((f) => ({ ...f, unassigned: e.target.checked }))}
              />
              Não atendidos
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.paused}
                onChange={(e) => setForm((f) => ({ ...f, paused: e.target.checked }))}
              />
              Pausados
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.overdue}
                onChange={(e) => setForm((f) => ({ ...f, overdue: e.target.checked }))}
              />
              Vencidos
            </label>
          </div>
        </details>

        <div className="flex gap-2">
          <EzButton type="submit">Buscar</EzButton>
          <EzButton type="button" variant="secondary" onClick={handleClear}>
            Limpar
          </EzButton>
        </div>
      </form>
    </div>
  );
}

export default TicketAdvancedSearchPage;
