import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { EzAlert, EzButton, EzCardItem, EzEmptyCard, EzSpinner, EzTextInput } from '../ds';

export interface KnowledgeFolder {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  _count: { articles: number };
}

export interface KnowledgeFoldersGridProps {
  /** Called with the folder id when a folder card is clicked/opened. */
  onOpenFolder: (folderId: string) => void;
  /** AGENT/AGENT_MASTER/ADMIN only: shows create/edit/delete affordances. */
  canAuthor: boolean;
}

interface FolderFormState {
  id: string | null;
  name: string;
  description: string;
  icon: string;
}

const EMPTY_FORM: FolderFormState = { id: null, name: '', description: '', icon: '' };

/**
 * Knowledge panel landing screen (TiFlux-parity Stage 1, DMTE-87): a grid of
 * folders that group Articles. This is intentionally flat — no nested
 * folders, sharing/ACL, or counts beyond a simple article tally, all of
 * which are later stages.
 */
export function KnowledgeFoldersGrid({ onOpenFolder, canAuthor }: KnowledgeFoldersGridProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FolderFormState | null>(null);

  const { data: folders, isLoading } = useQuery<KnowledgeFolder[]>({
    queryKey: ['knowledge-folders'],
    queryFn: async () => {
      const res = await api.get('/knowledge-folders');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const payload = {
        name: form.name,
        description: form.description || undefined,
        icon: form.icon || undefined,
      };
      if (form.id) {
        return api.patch(`/knowledge-folders/${form.id}`, payload).then((r) => r.data);
      }
      return api.post('/knowledge-folders', payload).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-folders'] });
      setForm(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/knowledge-folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-folders'] });
    },
  });

  const openNewForm = () => setForm({ ...EMPTY_FORM });

  const openEditForm = (folder: KnowledgeFolder) => {
    setForm({
      id: folder.id,
      name: folder.name,
      description: folder.description ?? '',
      icon: folder.icon ?? '',
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleDelete = (folder: KnowledgeFolder) => {
    if (window.confirm(`Excluir a pasta "${folder.name}"?`)) {
      deleteMutation.mutate(folder.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <EzSpinner label="Carregando pastas..." />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold text-gray-900">Base de Conhecimento</h1>
        {canAuthor && !form && (
          <EzButton type="button" onClick={openNewForm} size="small">
            + Nova pasta
          </EzButton>
        )}
      </div>

      {canAuthor && form && (
        <form onSubmit={handleSubmit} className="mb-6">
          <EzCardItem flat className="p-4 space-y-3">
            <EzTextInput
              id="knowledge-folder-name"
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <EzTextInput
              id="knowledge-folder-description"
              label="Descrição"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <EzTextInput
              id="knowledge-folder-icon"
              label="Ícone"
              placeholder="ex: 📁"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            />

            {saveMutation.isError && (
              <EzAlert variant="error">
                Falha ao {form.id ? 'atualizar' : 'salvar'} a pasta.
              </EzAlert>
            )}
            <div className="flex gap-2 pt-2">
              <EzButton type="submit" disabled={saveMutation.isPending}>
                {form.id ? 'Atualizar' : 'Salvar'}
              </EzButton>
              <EzButton type="button" variant="secondary" onClick={() => setForm(null)}>
                Cancelar
              </EzButton>
            </div>
          </EzCardItem>
        </form>
      )}

      {folders && folders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <EzCardItem key={folder.id} flat className="p-4">
              <button
                type="button"
                onClick={() => onOpenFolder(folder.id)}
                className="flex items-start gap-3 w-full text-left"
              >
                <span className="text-2xl leading-none">{folder.icon || '📁'}</span>
                <div className="flex-1">
                  <h2 className="text-[16px] font-semibold text-gray-900">{folder.name}</h2>
                  {folder.description && (
                    <p className="text-sm text-gray-500">{folder.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {folder._count.articles} {folder._count.articles === 1 ? 'artigo' : 'artigos'}
                  </p>
                </div>
              </button>

              {canAuthor && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <EzButton variant="tertiary" size="small" onClick={() => openEditForm(folder)}>
                    Editar
                  </EzButton>
                  <EzButton
                    variant="tertiary"
                    size="small"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(folder)}
                  >
                    Excluir
                  </EzButton>
                </div>
              )}
            </EzCardItem>
          ))}
        </div>
      ) : (
        <EzEmptyCard title="Nenhuma pasta encontrada." />
      )}
    </div>
  );
}

export default KnowledgeFoldersGrid;
