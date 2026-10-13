import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AxiosInstance } from 'axios';
import { describeApiError } from '../api-client';

const APPOINTMENT_TYPE = z
  .enum(['AGENDA', 'ABSENCE', 'VACATION'])
  .describe('Tipo do compromisso: AGENDA (geral), ABSENCE (ausência) ou VACATION (férias)');

export function registerAgendaTools(server: McpServer, api: AxiosInstance) {
  server.registerTool(
    'list_appointments',
    {
      title: 'Listar Compromissos / Agenda',
      description:
        'Lista compromissos da agenda respeitando o RBAC (Admin vê todos, Agent vê seus compromissos, Client Master vê agendamentos da sua empresa sem ausências/férias da equipe).',
      inputSchema: {
        startTime: z.string().optional().describe('Início do período de busca (ISO 8601)'),
        endTime: z.string().optional().describe('Fim do período de busca (ISO 8601)'),
        userId: z.string().uuid().optional().describe('Filtrar por UUID de técnico/usuário (Admin/Agent Master)'),
        organizationId: z.string().uuid().optional().describe('Filtrar por UUID da organização/cliente'),
        type: APPOINTMENT_TYPE.optional(),
      },
    },
    async (params) => {
      try {
        const { data } = await api.get('/appointments', { params });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'get_appointment',
    {
      title: 'Obter Compromisso da Agenda',
      description:
        'Retorna os detalhes de um compromisso específico, incluindo o chamado vinculado (título, status, solicitante) quando houver.',
      inputSchema: {
        id: z.string().uuid().describe('UUID do compromisso'),
      },
    },
    async ({ id }) => {
      try {
        const { data } = await api.get(`/appointments/${id}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'create_appointment',
    {
      title: 'Criar Compromisso na Agenda',
      description:
        'Cria um novo compromisso na agenda do sistema Aponta. Ao informar ticketId, o título, a organização e um resumo da descrição são derivados automaticamente do chamado vinculado pelo servidor (sobrepondo os valores enviados).',
      inputSchema: {
        title: z.string().describe('Título do compromisso (ignorado se ticketId for informado)'),
        description: z.string().optional().describe('Descrição detalhada do compromisso'),
        startTime: z.string().describe('Data e hora de início (ISO 8601)'),
        endTime: z.string().describe('Data e hora de término (ISO 8601)'),
        type: APPOINTMENT_TYPE.optional(),
        userId: z.string().uuid().optional().describe('UUID do técnico responsável (Admin pode especificar)'),
        organizationId: z.string().uuid().optional().describe('UUID da organização/cliente (ignorado se ticketId for informado)'),
        ticketId: z.string().uuid().optional().describe('UUID do chamado vinculado (apenas chamados não fechados devem ser usados)'),
      },
    },
    async (payload) => {
      try {
        const { data } = await api.post('/appointments', payload);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'update_appointment',
    {
      title: 'Atualizar Compromisso da Agenda',
      description:
        'Atualiza um compromisso existente (reagendar horário, trocar tipo, vincular/trocar chamado etc). Somente ADMIN, AGENT_MASTER e AGENT podem atualizar.',
      inputSchema: {
        id: z.string().uuid().describe('UUID do compromisso a atualizar'),
        title: z.string().optional().describe('Novo título (ignorado se ticketId for informado)'),
        description: z.string().optional(),
        startTime: z.string().optional().describe('Nova data/hora de início (ISO 8601)'),
        endTime: z.string().optional().describe('Nova data/hora de término (ISO 8601)'),
        type: APPOINTMENT_TYPE.optional(),
        userId: z.string().uuid().optional().describe('Reatribuir a outro técnico (Admin)'),
        organizationId: z.string().uuid().optional(),
        ticketId: z.string().uuid().optional().describe('Vincular/trocar o chamado vinculado'),
      },
    },
    async ({ id, ...patch }) => {
      try {
        const { data } = await api.patch(`/appointments/${id}`, patch);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'delete_appointment',
    {
      title: 'Remover Compromisso da Agenda',
      description: 'Remove um compromisso da agenda. Somente ADMIN, AGENT_MASTER e AGENT podem remover.',
      inputSchema: {
        id: z.string().uuid().describe('UUID do compromisso a remover'),
      },
    },
    async ({ id }) => {
      try {
        await api.delete(`/appointments/${id}`);
        return { content: [{ type: 'text', text: `Compromisso ${id} removido com sucesso.` }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );
}
