import { useMemo, useState, FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  LockOpen,
  Copy,
  Trash2,
  Pencil,
  ExternalLink,
  FolderPlus,
  KeyRound,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  useVaultFolders,
  useVaultCredentials,
  useVaultMutations,
  useRevealCredential,
  VaultCredential,
  VaultFolder,
  CredentialInput,
} from '../hooks/useVault';
import { useAuthStore } from '../stores/authStore';
import {
  EzAlert,
  EzButton,
  EzActionsButton,
  EzCardItem,
  EzEmptyCard,
  EzPagination,
  EzSpinner,
  EzTextInput,
  EzTree,
  EzTreeNode,
} from '../components/ds';

const ROOT_FOLDER_ID = 'root';
const PAGE_SIZE = 10;

type RevealedValues = { username?: string | null; password?: string | null };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-gray-900/60" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <span className="text-[16px] font-semibold text-gray-900">{title}</span>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function FolderModal({
  initialName,
  onSave,
  onClose,
}: {
  initialName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
  };

  return (
    <Modal title={initialName ? 'Editar pasta' : 'Nova pasta'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <EzTextInput
          label="Nome da pasta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <div className="flex justify-end gap-3">
          <EzButton type="button" variant="secondary" label="Cancelar" onClick={onClose} />
          <EzButton type="submit" variant="primary" label="Salvar" />
        </div>
      </form>
    </Modal>
  );
}

function CredentialModal({
  credential,
  folders,
  defaultFolderId,
  onSave,
  onClose,
}: {
  credential?: VaultCredential;
  folders: VaultFolder[];
  defaultFolderId: string;
  onSave: (dto: Partial<CredentialInput>) => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(credential);
  const [name, setName] = useState(credential?.name ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState(credential?.url ?? '');
  const [description, setDescription] = useState(credential?.description ?? '');
  const [folderId, setFolderId] = useState(
    credential ? credential.folderId ?? ROOT_FOLDER_ID : defaultFolderId,
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!isEdit && !password.trim()) return;

    const dto: Partial<CredentialInput> = {
      name: name.trim(),
      url: url.trim() || undefined,
      description: description.trim() || undefined,
      folderId: folderId === ROOT_FOLDER_ID ? undefined : folderId,
    };
    if (username.trim()) dto.username = username.trim();
    if (password.trim()) dto.password = password.trim();
    onSave(dto);
  };

  return (
    <Modal title={isEdit ? 'Editar senha' : 'Nova senha'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <EzTextInput label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        <EzTextInput
          label={isEdit ? 'Usuário (deixe em branco para não alterar)' : 'Usuário'}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <EzTextInput
          label={isEdit ? 'Senha (deixe em branco para não alterar)' : 'Senha'}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!isEdit}
        />
        <EzTextInput label="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <EzTextInput label="Notas" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label className="text-[14px] font-medium text-gray-900">Pasta</label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="h-[42px] w-full rounded-[12px] border border-gray-200 bg-white px-3 text-[14px] text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option value={ROOT_FOLDER_ID}>Raiz do cofre</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3">
          <EzButton type="button" variant="secondary" label="Cancelar" onClick={onClose} />
          <EzButton type="submit" variant="primary" label="Salvar" />
        </div>
      </form>
    </Modal>
  );
}

export function VaultPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'ADMIN';

  const [selectedFolderId, setSelectedFolderId] = useState<string>(ROOT_FOLDER_ID);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revealed, setRevealed] = useState<Record<string, RevealedValues>>({});
  const [folderModal, setFolderModal] = useState<{ folder?: VaultFolder } | null>(null);
  const [credentialModal, setCredentialModal] = useState<{ credential?: VaultCredential } | null>(null);

  const foldersQuery = useVaultFolders();
  const credentialsQuery = useVaultCredentials({
    folderId: selectedFolderId,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const {
    createFolderMutation,
    updateFolderMutation,
    removeFolderMutation,
    createCredentialMutation,
    updateCredentialMutation,
    removeCredentialMutation,
  } = useVaultMutations();
  const revealMutation = useRevealCredential();

  const foldersData = foldersQuery.data;
  const folders = useMemo<VaultFolder[]>(() => foldersData ?? [], [foldersData]);

  const treeNodes = useMemo<EzTreeNode[]>(
    () => [
      { id: ROOT_FOLDER_ID, label: 'Raiz do cofre' },
      ...folders.map((folder) => ({ id: folder.id, label: `${folder.name} (${folder.credentialCount})` })),
    ],
    [folders],
  );

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  const handleSelectFolder = (node: EzTreeNode) => {
    setSelectedFolderId(String(node.id));
    setPage(1);
    setRevealed({});
  };

  const handleCopy = async (credentialId: string, field: 'username' | 'password') => {
    const value = await revealMutation.mutateAsync({ id: credentialId, field, intent: 'copy' });
    if (value) await navigator.clipboard.writeText(value);
  };

  const handleToggleReveal = async (cred: VaultCredential) => {
    if (revealed[cred.id]) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[cred.id];
        return next;
      });
      return;
    }

    const [username, password] = await Promise.all([
      cred.hasUsername
        ? revealMutation.mutateAsync({ id: cred.id, field: 'username', intent: 'reveal' })
        : Promise.resolve(null),
      cred.hasPassword
        ? revealMutation.mutateAsync({ id: cred.id, field: 'password', intent: 'reveal' })
        : Promise.resolve(null),
    ]);
    setRevealed((prev) => ({ ...prev, [cred.id]: { username, password } }));
  };

  const handleSaveFolder = (name: string) => {
    if (folderModal?.folder) {
      updateFolderMutation.mutate({ id: folderModal.folder.id, name });
    } else {
      createFolderMutation.mutate(name);
    }
    setFolderModal(null);
  };

  const handleRemoveFolder = (folder: VaultFolder) => {
    if (!window.confirm(`Remover a pasta "${folder.name}"?`)) return;
    removeFolderMutation.mutate(folder.id, {
      onSuccess: () => {
        if (selectedFolderId === folder.id) setSelectedFolderId(ROOT_FOLDER_ID);
      },
    });
  };

  const handleSaveCredential = (dto: Partial<CredentialInput>) => {
    if (credentialModal?.credential) {
      updateCredentialMutation.mutate({ id: credentialModal.credential.id, ...dto });
    } else {
      createCredentialMutation.mutate(dto as CredentialInput);
    }
    setCredentialModal(null);
  };

  const handleRemoveCredential = (cred: VaultCredential) => {
    if (!window.confirm('Excluir senha definitivamente?')) return;
    removeCredentialMutation.mutate(cred.id);
  };

  if (foldersQuery.isLoading || credentialsQuery.isLoading)
    return (
      <div className="flex justify-center p-8">
        <EzSpinner label="Carregando cofre..." />
      </div>
    );
  if (foldersQuery.isError || credentialsQuery.isError)
    return (
      <div className="p-8">
        <EzAlert variant="error">Erro ao carregar o cofre de senhas.</EzAlert>
      </div>
    );

  const credentials = credentialsQuery.data?.data ?? [];
  const meta = credentialsQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Lock className="h-8 w-8" /> Cofre de Senhas
        </h1>
        {canEdit && (
          <EzButton
            variant="secondary"
            label="Auditoria"
            leftIcon={ShieldCheck}
            onClick={() => navigate('/vault/audit')}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <EzCardItem flat className="p-3">
          <EzTree
            nodes={treeNodes}
            selectedId={selectedFolderId}
            onSelect={handleSelectFolder}
            defaultExpandedIds={[]}
          />
        </EzCardItem>

        <EzCardItem flat className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <EzTextInput
              type="search"
              placeholder="Buscar senha..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
              className="max-w-xs"
            />
            {canEdit && (
              <EzActionsButton
                label="Ações"
                actions={[
                  { label: 'Nova pasta', icon: <FolderPlus className="h-4 w-4" />, onClick: () => setFolderModal({}) },
                  { label: 'Nova senha', icon: <KeyRound className="h-4 w-4" />, onClick: () => setCredentialModal({}) },
                ]}
              />
            )}
          </div>

          {canEdit && selectedFolder && (
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-90/40 px-4 py-2 text-sm text-gray-600">
              <span>
                Pasta: <strong>{selectedFolder.name}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  title="Editar pasta"
                  onClick={() => setFolderModal({ folder: selectedFolder })}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  title="Remover pasta"
                  onClick={() => handleRemoveFolder(selectedFolder)}
                  className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!credentials.length ? (
            <EzEmptyCard title="Nenhuma credencial liberada para esta operação." />
          ) : (
            <table className="w-full text-left text-[14px]">
              <thead className="bg-gray-90/60 text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">Usuário</th>
                  <th className="px-4 py-2 font-medium">Senha</th>
                  <th className="px-4 py-2 font-medium">URL</th>
                  {canEdit && <th className="px-4 py-2 font-medium text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {credentials.map((cred) => {
                  const row = revealed[cred.id];
                  return (
                    <tr key={cred.id} className="hover:bg-gray-90/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            title={row ? 'Ocultar' : 'Revelar linha'}
                            onClick={() => handleToggleReveal(cred)}
                            className="text-gray-500 hover:text-brand-600"
                          >
                            {row ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </button>
                          <span className="font-medium text-gray-900">{cred.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cred.hasUsername ? (
                          <div className="flex items-center gap-2 text-gray-700">
                            <span>{row ? row.username : '••••••••'}</span>
                            <button
                              title="Copiar usuário"
                              onClick={() => handleCopy(cred.id, 'username')}
                              className="text-gray-400 hover:text-brand-600"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cred.hasPassword ? (
                          <div className="flex items-center gap-2 text-gray-700">
                            <span>{row ? row.password : '••••••••'}</span>
                            <button
                              title="Copiar senha"
                              onClick={() => handleCopy(cred.id, 'password')}
                              className="text-gray-400 hover:text-brand-600"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cred.url ? (
                          <div className="flex items-center gap-2 text-gray-700">
                            <span className="truncate max-w-[160px]">{cred.url}</span>
                            <button
                              title="Copiar URL"
                              onClick={() => navigator.clipboard.writeText(cred.url ?? '')}
                              className="text-gray-400 hover:text-brand-600"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <a href={cred.url} target="_blank" rel="noreferrer" title="Abrir URL" className="text-gray-400 hover:text-brand-600">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              title="Editar"
                              onClick={() => setCredentialModal({ credential: cred })}
                              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              title="Excluir"
                              onClick={() => handleRemoveCredential(cred)}
                              className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-end border-t border-gray-100 px-4 py-3">
              <EzPagination currentPage={meta.page} totalPages={meta.totalPages} onChange={setPage} />
            </div>
          )}
        </EzCardItem>
      </div>

      {folderModal && (
        <FolderModal
          initialName={folderModal.folder?.name ?? ''}
          onSave={handleSaveFolder}
          onClose={() => setFolderModal(null)}
        />
      )}

      {credentialModal && (
        <CredentialModal
          credential={credentialModal.credential}
          folders={folders}
          defaultFolderId={selectedFolderId}
          onSave={handleSaveCredential}
          onClose={() => setCredentialModal(null)}
        />
      )}
    </div>
  );
}
