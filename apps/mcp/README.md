# Aponta MCP Server

Servidor **MCP (Model Context Protocol)** standalone para o Aponta, expondo os módulos do sistema (Tickets, Relatórios/Worklog, Cofre de Senhas, Contratos, Base de Conhecimento) como **Tools** que qualquer cliente MCP (Claude Desktop, IDEs, outros agentes) pode chamar.

## Arquitetura

- **Transporte:** stdio (`StdioServerTransport` do `@modelcontextprotocol/sdk`) — processo filho, sem porta de rede exposta.
- **Autenticação:** Bearer Token pessoal (gerado em **Configurações > Tokens de API** na UI do Aponta). O servidor MCP não reimplementa nenhuma regra de RBAC — ele é um tradutor fino de *tool calls* para chamadas HTTP autenticadas contra `apps/api`. Todo o enforcement de Role/Organização acontece no backend (via `TenantHelper`), exatamente como já acontece para chamadas vindas do frontend web.
- **Zero duplicação de regras de negócio:** cada tool é um wrapper 1:1 (ou agregação simples) sobre endpoints REST já existentes e já testados (`/tickets`, `/reports`, `/vault`, `/contracts`, `/articles`).

## Configuração

Variáveis de ambiente (ver `.env.example`):

- `APONTA_API_URL` — URL base da API (deve incluir o prefixo `/api`), ex: `http://localhost:3001/api`.
- `APONTA_API_TOKEN` — Bearer Token pessoal gerado em Configurações > Tokens de API.

## Uso com um cliente MCP (ex: Claude Desktop)

```json
{
  "mcpServers": {
    "aponta": {
      "command": "node",
      "args": ["/caminho/para/aponta/dist/apps/mcp/main.js"],
      "env": {
        "APONTA_API_URL": "http://localhost:3001/api",
        "APONTA_API_TOKEN": "apta_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## Tools disponíveis

### Tickets
- `list_tickets` — lista tickets respeitando RBAC (Admin vê tudo, Agent vê sua fila, Cliente vê só os próprios).
- `get_ticket` — detalhes de um ticket específico.
- `create_ticket` — abre um novo ticket em nome do dono do token.
- `change_ticket_status` — transiciona status (requer AGENT ou ADMIN).
- `assign_ticket` — atribui ticket a um agente (requer AGENT ou ADMIN).
- `create_worklog` — aponta horas trabalhadas em um ticket (requer AGENT ou ADMIN).
- `list_worklogs` — lista apontamentos de horas de um ticket (requer AGENT ou ADMIN).

### Relatórios
- `get_workload_report` — minutos apontados (Worklogs) agregados por agente.
- `get_billing_report` — horas faturáveis por organização (requer ADMIN ou CLIENT_MASTER).

### Cofre de Senhas
- `list_vault_credentials` — lista credenciais (ADMIN/AGENT_MASTER/AGENT apenas; Cliente recebe 403 do backend).
- `create_vault_credential` — cria credencial (requer ADMIN).

### Contratos
- `list_contracts` — lista contratos; campos financeiros ($) só retornam para ADMIN/CLIENT_MASTER (blindado no backend).

### Base de Conhecimento
- `list_articles` — lista artigos; quem não for ADMIN só vê artigos com `visibility: "PUBLIC"` (mais os `PRIVATE` aos quais tem acesso).
- `create_article` — cria artigo (requer AGENT, AGENT_MASTER ou ADMIN).

## Build

```bash
pnpm exec nx run mcp:build
node dist/apps/mcp/main.js
```
