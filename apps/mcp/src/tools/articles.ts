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
        'Lista artigos de FAQ/Wiki. Se o token for de um CLIENT/CLIENT_MASTER, só artigos marcados como públicos (isPublic=true) são retornados — artigos internos nunca saem do backend para esse papel.',
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
        isPublic: z.boolean().optional().describe('true = visível para clientes (FAQ pública); false = interno'),
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
