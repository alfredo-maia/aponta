import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AxiosInstance } from 'axios';
import { describeApiError } from '../api-client';

export function registerTicketTools(server: McpServer, api: AxiosInstance) {
  server.registerTool(
    'list_tickets',
    {
      title: 'Listar Tickets',
      description:
        'Lista tickets respeitando as regras de visibilidade RBAC do seu token (Admin vê tudo, Agent vê sua fila, Cliente vê só os próprios).',
      inputSchema: {
        search: z.string().optional().describe('Busca textual por título, protocolo ou descrição'),
        status: z
          .enum(['OPEN', 'IN_PROGRESS', 'PAUSED', 'RESOLVED', 'CLOSED'])
          .optional()
          .describe('Filtrar por status do ticket'),
        serviceDeskId: z.string().uuid().optional().describe('Filtrar por UUID de um Service Desk específico'),
        organizationId: z.string().uuid().optional().describe('Filtrar por UUID da organização/cliente do solicitante'),
        notClosed: z
          .boolean()
          .optional()
          .describe('Somente chamados não fechados (exclui RESOLVED/CLOSED) — útil para encontrar um chamado a vincular a um compromisso da Agenda'),
        page: z.string().optional(),
        limit: z.string().optional(),
      },
    },
    async (params) => {
      try {
        const { data } = await api.get('/tickets', { params });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'get_ticket',
    {
      title: 'Buscar Ticket por ID',
      description: 'Retorna os detalhes completos de um ticket específico (404 se não existir ou não for visível para seu token).',
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      try {
        const { data } = await api.get(`/tickets/${id}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'create_ticket',
    {
      title: 'Criar Ticket',
      description: 'Abre um novo ticket em nome do usuário do token (requester = dono do token).',
      inputSchema: {
        title: z.string().describe('Título/resumo curto do problema'),
        description: z.string().describe('Descrição detalhada'),
        serviceDeskId: z.string().uuid().describe('UUID do Service Desk de destino'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        catalogItemId: z.string().uuid().optional(),
      },
    },
    async (params) => {
      try {
        const { data } = await api.post('/tickets', params);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'change_ticket_status',
    {
      title: 'Alterar Status do Ticket',
      description:
        'Ação dedicada para transicionar o status de um ticket (ex: pausar, resolver). Requer papel AGENT ou ADMIN no token.',
      inputSchema: {
        id: z.string().uuid(),
        status: z.enum(['OPEN', 'IN_PROGRESS', 'PAUSED', 'RESOLVED', 'CLOSED']),
      },
    },
    async ({ id, status }) => {
      try {
        const { data } = await api.patch(`/tickets/${id}/status`, { status });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'assign_ticket',
    {
      title: 'Atribuir Ticket a um Agente',
      description: 'Atribui um ticket a um agente específico. Requer papel AGENT ou ADMIN no token.',
      inputSchema: { id: z.string().uuid(), agentId: z.string().uuid() },
    },
    async ({ id, agentId }) => {
      try {
        const { data } = await api.patch(`/tickets/${id}/assign`, { agentId });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'create_worklog',
    {
      title: 'Criar Apontamento de Horas (Worklog)',
      description:
        'Registra apontamento de horas trabalhadas em um ticket. Requer papel AGENT ou ADMIN no token.',
      inputSchema: {
        ticketId: z.string().uuid().describe('UUID do Ticket'),
        startTime: z.string().datetime().describe('Horário de início do apontamento (ISO 8601, ex: 2026-10-13T08:00:00Z)'),
        endTime: z.string().datetime().describe('Horário de término do apontamento (ISO 8601); a duração é calculada automaticamente'),
        attendanceType: z.enum(['REMOTE', 'ON_SITE']).optional().describe('Tipo de atendimento (default: REMOTE)'),
        description: z.string().min(1).describe('Descrição detalhada das atividades realizadas'),
        billable: z.boolean().optional().describe('Se as horas são faturáveis (default: true)'),
        authorId: z.string().uuid().optional().describe('UUID do técnico (apenas ADMIN pode apontar para terceiros)'),
        nextStatus: z
          .enum(['ESCALATED', 'PENDING_CUSTOMER', 'ON_HOLD', 'PENDING_APPROVAL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
          .optional()
          .describe('Novo status do ticket a aplicar ao salvar o apontamento (opcional)'),
        sendAsReply: z.boolean().optional().describe('Se true, publica a descrição também como resposta visível ao cliente'),
        valuationType: z
          .enum(['CONTRACT', 'GUARANTEE', 'MANUAL'])
          .optional()
          .describe('Tipo de valorização: CONTRACT calcula pelo contrato do cliente, GUARANTEE zera o valor, MANUAL usa o campo value (default: CONTRACT)'),
        value: z.number().optional().describe('Valor manual do apontamento (obrigatório quando valuationType = MANUAL)'),
      },
    },
    async ({ ticketId, startTime, endTime, attendanceType, description, billable, authorId, nextStatus, sendAsReply, valuationType, value }) => {
      try {
        const { data } = await api.post(`/tickets/${ticketId}/worklogs`, {
          startTime,
          endTime,
          attendanceType,
          description,
          billable,
          authorId,
          nextStatus,
          sendAsReply,
          valuationType,
          value,
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'list_worklogs',
    {
      title: 'Listar Apontamentos de Horas do Ticket',
      description:
        'Retorna a lista de apontamentos de horas registrados em um ticket. Requer papel AGENT ou ADMIN no token.',
      inputSchema: {
        ticketId: z.string().uuid().describe('UUID do Ticket'),
      },
    },
    async ({ ticketId }) => {
      try {
        const { data } = await api.get(`/tickets/${ticketId}/worklogs`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );
}

