import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AxiosInstance } from 'axios';
import { describeApiError } from '../api-client';

export function registerVaultTools(server: McpServer, api: AxiosInstance) {
  server.registerTool(
    'list_vault_credentials',
    {
      title: 'Listar Credenciais do Cofre de Senhas',
      description:
        'Lista as credenciais do Cofre de Senhas visíveis para o token (ADMIN/AGENT_MASTER/AGENT). Clientes NUNCA têm acesso — a API rejeita com 403.',
      inputSchema: {},
    },
    async () => {
      try {
        const { data } = await api.get('/vault');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'create_vault_credential',
    {
      title: 'Criar Credencial no Cofre',
      description: 'Cria uma nova credencial no Cofre de Senhas. Exige papel ADMIN no token.',
      inputSchema: {
        name: z.string().describe('Nome/identificação da credencial'),
        username: z.string(),
        password: z.string(),
        organizationId: z.string().uuid().describe('Organização (CNPJ) à qual a credencial pertence'),
        url: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async (params) => {
      try {
        const { data } = await api.post('/vault', params);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );
}
