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
}
