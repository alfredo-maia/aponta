import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AxiosInstance } from 'axios';
import { describeApiError } from '../api-client';

export function registerReportTools(server: McpServer, api: AxiosInstance) {
  server.registerTool(
    'get_workload_report',
    {
      title: 'Relatório de Carga de Trabalho',
      description:
        'Retorna minutos apontados (Worklogs) agregados por agente. Agent vê só os próprios; Admin/Agent Master veem a equipe.',
      inputSchema: {
        agentId: z.string().uuid().optional().describe('Filtra por um agente específico (ignorado se o token for de um AGENT comum)'),
      },
    },
    async ({ agentId }) => {
      try {
        const { data } = await api.get('/reports/workload', { params: { agentId } });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'get_billing_report',
    {
      title: 'Relatório de Faturamento',
      description:
        'Retorna horas faturáveis/não-faturáveis agregadas por organização. Exige papel ADMIN ou CLIENT_MASTER no token — Agentes recebem erro de permissão.',
      inputSchema: {},
    },
    async () => {
      try {
        const { data } = await api.get('/reports/billing');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );
}
