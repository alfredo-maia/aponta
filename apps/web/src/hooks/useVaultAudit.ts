import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { VaultListMeta } from './useVault';

export type CredentialAction =
  | 'CREATE_FOLDER'
  | 'DELETE_FOLDER'
  | 'CREATE_CREDENTIAL'
  | 'UPDATE_CREDENTIAL'
  | 'DELETE_CREDENTIAL'
  | 'REVEAL_CREDENTIAL'
  | 'COPY_USERNAME'
  | 'COPY_PASSWORD';

export interface VaultAuditLogEntry {
  id: string;
  organizationId: string;
  action: CredentialAction;
  folderId?: string | null;
  credentialId?: string | null;
  targetName: string;
  actorId: string;
  actorName: string;
  ipAddress?: string | null;
  createdAt: string;
}

export interface VaultAuditFilters {
  from?: string;
  to?: string;
  actorId?: string;
  action?: CredentialAction;
  query?: string;
  page?: number;
  limit?: number;
}

/**
 * GET /vault/audit (ADMIN only). `enabled` defaults to false so the screen
 * only fetches once the user presses "Exibir" (Tiflux parity: filters are
 * staged client-side first, matching the real vault audit screen).
 */
export function useVaultAudit(filters: VaultAuditFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['vault', 'audit', filters],
    queryFn: async () => {
      const { data } = await api.get<{ data: VaultAuditLogEntry[]; meta: VaultListMeta }>('/vault/audit', {
        params: filters,
      });
      return data;
    },
    enabled,
  });
}

export interface VaultAgent {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Reuses the existing GET /users/agents (ADMIN/AGENT) endpoint to populate the "Atendente" filter. */
export function useVaultAgents() {
  return useQuery({
    queryKey: ['users', 'agents'],
    queryFn: async () => {
      const { data } = await api.get<VaultAgent[]>('/users/agents');
      return data;
    },
  });
}
