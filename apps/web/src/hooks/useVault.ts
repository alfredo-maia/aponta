import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface VaultFolder {
  id: string;
  name: string;
  organizationId: string;
  credentialCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Listing shape returned by GET /vault/credentials. Deliberately has NO
 * `username`/`password` fields — acceptance criterion #1 of DMTE-80 is that
 * the listing payload never carries the raw secret. Only booleans survive;
 * the real value is fetched on demand via `useRevealCredential` below.
 */
export interface VaultCredential {
  id: string;
  name: string;
  url?: string | null;
  description?: string | null;
  organizationId: string;
  folderId?: string | null;
  hasUsername: boolean;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaultListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CredentialInput {
  name: string;
  username?: string;
  password: string;
  url?: string;
  description?: string;
  folderId?: string | null;
}

export type CredentialUpdateInput = Partial<CredentialInput>;

export interface VaultCredentialsParams {
  folderId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useVaultFolders() {
  return useQuery({
    queryKey: ['vault', 'folders'],
    queryFn: async () => {
      const { data } = await api.get<VaultFolder[]>('/vault/folders');
      return data;
    },
  });
}

export function useVaultCredentials(params: VaultCredentialsParams) {
  return useQuery({
    queryKey: ['vault', 'credentials', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: VaultCredential[]; meta: VaultListMeta }>(
        '/vault/credentials',
        { params },
      );
      return data;
    },
  });
}

/**
 * All the mutations the Vault screen needs: folder CRUD, credential CRUD and
 * the reveal/copy endpoint. Grouped in one hook (rather than one per
 * mutation) because `VaultPage` always needs the full set together and this
 * keeps a single cache-invalidation point.
 */
export function useVaultMutations() {
  const queryClient = useQueryClient();
  const invalidateVault = () => queryClient.invalidateQueries({ queryKey: ['vault'] });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/vault/folders', { name });
      return data;
    },
    onSuccess: invalidateVault,
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await api.patch(`/vault/folders/${id}`, { name });
      return data;
    },
    onSuccess: invalidateVault,
  });

  const removeFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vault/folders/${id}`);
    },
    onSuccess: invalidateVault,
  });

  const createCredentialMutation = useMutation({
    mutationFn: async (dto: CredentialInput) => {
      const { data } = await api.post('/vault/credentials', dto);
      return data;
    },
    onSuccess: invalidateVault,
  });

  const updateCredentialMutation = useMutation({
    mutationFn: async ({ id, ...dto }: CredentialUpdateInput & { id: string }) => {
      const { data } = await api.patch(`/vault/credentials/${id}`, dto);
      return data;
    },
    onSuccess: invalidateVault,
  });

  const removeCredentialMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vault/credentials/${id}`);
    },
    onSuccess: invalidateVault,
  });

  return {
    createFolderMutation,
    updateFolderMutation,
    removeFolderMutation,
    createCredentialMutation,
    updateCredentialMutation,
    removeCredentialMutation,
  };
}

export type RevealField = 'username' | 'password';
export type RevealIntent = 'reveal' | 'copy';

/**
 * POST /vault/credentials/:id/reveal — the ONLY path through which a real
 * username/password value ever reaches the browser. Every call is audited
 * server-side (acceptance criterion #2).
 */
export function useRevealCredential() {
  return useMutation({
    mutationFn: async ({ id, field, intent }: { id: string; field: RevealField; intent: RevealIntent }) => {
      const { data } = await api.post<{ value: string | null }>(`/vault/credentials/${id}/reveal`, {
        field,
        intent,
      });
      return data.value;
    },
  });
}
