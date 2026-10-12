import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AxiosInstance } from 'axios';
import { describeApiError } from '../api-client';

export function registerAgendaTools(server: McpServer, api: AxiosInstance) {
  server.registerTool(
    'list_appointments',
    {
      title: 'Listar Compromissos / Agenda',
      description:
        'Lista compromissos e alocações de agenda respeitando o RBAC (Admin vê todos, Agent vê seus compromissos, Client Master vê agendamentos da sua empresa sem ausências da equipe).',
      inputSchema: {
        startTime: z.string().optional().describe('Início do período de busca (ISO 8601)'),
        endTime: z.string().optional().describe('Fim do período de busca (ISO 8601)'),
        userId: z.string().uuid().optional().describe('Filtrar por UUID de técnico/usuário (Admin/Agent Master)'),
        organizationId: z.string().uuid().optional().describe('Filtrar por UUID da organização/cliente'),
        type: z.enum(['APPOINTMENT', 'ABSENCE', 'ALLOCATION']).optional().describe('Tipo de compromisso'),
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
    'create_appointment',
    {
      title: 'Criar Compromisso na Agenda',
      description: 'Cria um novo compromisso ou alocação temporal na agenda do sistema Aponta.',
      inputSchema: {
        title: z.string().describe('Título do compromisso'),
        description: z.string().optional().describe('Descrição detalhada do compromisso'),
        startTime: z.string().describe('Data e hora de início (ISO 8601)'),
        endTime: z.string().describe('Data e hora de término (ISO 8601)'),
        type: z
          .enum(['APPOINTMENT', 'ABSENCE', 'ALLOCATION'])
          .optional()
          .describe('Tipo do compromisso (APPOINTMENT, ABSENCE, ALLOCATION)'),
        userId: z.string().uuid().optional().describe('UUID do técnico responsável (Admin pode especificar)'),
        organizationId: z.string().uuid().optional().describe('UUID da organização/cliente'),
        ticketId: z.string().uuid().optional().describe('UUID do chamado vinculado'),
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
}
