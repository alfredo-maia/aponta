#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createApiClient } from './api-client';
import { registerTicketTools } from './tools/tickets';
import { registerReportTools } from './tools/reports';
import { registerVaultTools } from './tools/vault';
import { registerContractTools } from './tools/contracts';
import { registerArticleTools } from './tools/articles';
import { registerAgendaTools } from './tools/agenda';

async function main() {
  // Fails fast with a clear message if APONTA_API_URL/APONTA_API_TOKEN
  // are missing/invalid — see api-client.ts for the exact messages.
  const api = createApiClient();

  const server = new McpServer({
    name: 'aponta-mcp',
    version: '1.0.0',
  });

  registerTicketTools(server, api);
  registerReportTools(server, api);
  registerVaultTools(server, api);
  registerContractTools(server, api);
  registerArticleTools(server, api);
  registerAgendaTools(server, api);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Aponta MCP server rodando (stdio). Tools disponíveis conforme o RBAC do token configurado.');
}

main().catch((error) => {
  console.error('Falha ao iniciar o Aponta MCP server:', error instanceof Error ? error.message : error);
  process.exit(1);
});
