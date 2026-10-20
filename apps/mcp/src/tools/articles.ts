import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AxiosInstance } from 'axios';
import { describeApiError } from '../api-client';

export function registerArticleTools(server: McpServer, api: AxiosInstance) {
  server.registerTool(
    'list_articles',
    {
      title: 'Listar Artigos da Base de Conhecimento',
      description:
        'Lista artigos de FAQ/Wiki. Se o token não for de um ADMIN, só artigos com visibility=PUBLIC (mais os PRIVATE aos quais o usuário tem acesso explícito via autoria/grupo/cliente) são retornados — artigos privados sem acesso nunca saem do backend.',
      inputSchema: {
        search: z.string().optional(),
        tag: z.string().optional(),
      },
    },
    async (params) => {
      try {
        const { data } = await api.get('/articles', { params });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    'create_article',
    {
      title: 'Criar Artigo na Base de Conhecimento',
      description: 'Cria um novo artigo. Requer papel AGENT, AGENT_MASTER ou ADMIN no token.',
      inputSchema: {
        title: z.string(),
        content: z.string(),
        visibility: z
          .enum(['PUBLIC', 'PRIVATE'])
          .optional()
          .describe('PUBLIC = visível para todos, incl. clientes sem login; PRIVATE = restrito ao autor e aos grupos/clientes compartilhados. Default: PUBLIC.'),
        tags: z.array(z.string()).optional(),
      },
    },
    async (params) => {
      try {
        const { data } = await api.post('/articles', params);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: describeApiError(error) }], isError: true };
      }
    },
  );
}
