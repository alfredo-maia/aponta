import axios, { AxiosInstance } from 'axios';

/**
 * Thin HTTP client authenticated with a personal Aponta API token
 * (minted via Configurações > Tokens de API in the web app). Every
 * tool call goes through this client — the MCP server NEVER touches
 * the database directly, so the backend's existing RBAC/TenantHelper
 * rules are the single source of truth for what this token may see.
 */
export function createApiClient(): AxiosInstance {
  const baseURL = process.env.APONTA_API_URL;
  const token = process.env.APONTA_API_TOKEN;

  if (!baseURL) {
    throw new Error(
      'APONTA_API_URL não definida. Configure a env var apontando para a API do Aponta (ex: http://localhost:3001).',
    );
  }

  if (!token || !token.startsWith('apta_')) {
    throw new Error(
      'APONTA_API_TOKEN não definida ou inválida. Gere um token em Configurações > Tokens de API no Aponta e exporte-o como env var.',
    );
  }

  return axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  });
}

/**
 * Converts an axios error into a short, LLM-friendly message instead of
 * letting a raw HTTP/stack trace reach the MCP client. 401/403 map to a
 * clear "sem permissão" message (matching the backend RBAC rejection);
 * everything else is a generic failure with the status/code attached.
 */
export function describeApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return 'Token inválido ou expirado. Gere um novo token em Configurações > Tokens de API.';
    }
    if (status === 403) {
      const detail = (error.response?.data as { message?: string })?.message;
      return `Seu token não tem permissão para esta ação${detail ? `: ${detail}` : '.'}`;
    }
    if (status === 404) {
      return 'Recurso não encontrado.';
    }
    const detail = (error.response?.data as { message?: string })?.message;
    return `Erro na API do Aponta (HTTP ${status ?? '??'})${detail ? `: ${detail}` : '.'}`;
  }
  return `Erro inesperado: ${error instanceof Error ? error.message : String(error)}`;
}
