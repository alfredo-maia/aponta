import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AxiosInstance } from 'axios';
import { describeApiError } from '../api-client';

export function registerContractTools(server: McpServer, api: AxiosInstance) {
  server.registerTool(
    'list_contracts',
    {
      title: 'Listar Contratos',
      description:
        'Lista contratos (cobertura/SLA). Valores financeiros ($) só aparecem para ADMIN/CLIENT_MASTER — para AGENT/AGENT_MASTER o backend já blinda e omite os campos monetários automaticamente.',
      inputSchema: {},
    },
    async () => {
      try {
        const { data } = await api.get('/contracts');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );
}
