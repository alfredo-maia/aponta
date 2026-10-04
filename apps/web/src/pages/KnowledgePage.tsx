import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import {
  EzAlert,
  EzButton,
  EzCardItem,
  EzCheck,
  EzEmptyCard,
  EzSpinner,
  EzTag,
  EzTextArea,
  EzTextInput,
} from '../components/ds';

interface Article {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  tags: string[];
}

export function KnowledgePage() {
  const user = useAuthStore((state) => state.user);
  const canAuthor =
    user?.role === 'AGENT' ||
    user?.role === 'AGENT_MASTER' ||
    user?.role === 'ADMIN';

  const canDelete = user?.role === 'ADMIN';

  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ['articles', { search, tag }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tag) params.set('tag', tag);

      // Even if user not logged in, api.get works for public articles.
      const res = await api.get(`/articles?${params.toString()}`);
      return res.data;
    },
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tagsInput, setTagsInput] = useState('');

  const openNewForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsPublic(true);
    setTagsInput('');
    setIsFormOpen(true);
  };

  const openEditForm = (art: Article) => {
    setEditingId(art.id);
    setTitle(art.title);
    setContent(art.content);
    setIsPublic(art.isPublic);
    setTagsInput(art.tags?.join(', ') || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        content,
        isPublic,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      };

      if (editingId) {
        return api.patch(`/articles/${editingId}`, payload).then((r) => r.data);
      }
      return api.post('/articles', payload).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setIsFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <EzSpinner label="Carregando artigos..." />
      </div>
    );
  }

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Base de Conhecimento (FAQ)</h1>
          {!user && <p className="text-sm text-gray-500">Exibindo apenas artigos públicos</p>}
        </div>

        <div className="flex items-center gap-2">
          <EzTextInput
            type="search"
            placeholder="Buscar palavra-chave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            title="busca por palavra-chave"
            className="min-w-[200px]"
          />
          {tag && (
            <EzTag
              label={`Tag: ${tag}`}
              variant="ocean"
              rightIcon={
                <button onClick={() => setTag('')} aria-label="Remover filtro de tag" className="hover:text-brand-900 font-bold">
                  &times;
                </button>
              }
            />
          )}

          {canAuthor && !isFormOpen && (
            <EzButton type="button" onClick={openNewForm} size="small">
              + Novo artigo
            </EzButton>
          )}
        </div>
      </div>

      {canAuthor && isFormOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="mb-6"
        >
          <EzCardItem flat className="p-4 space-y-3">
            <EzTextInput
              id="article-title"
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <EzTextArea
              id="article-content"
              label="Conteúdo"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
            />
            <EzTextInput
              id="article-tags"
              label="Tags (separadas por vírgula)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ex: acesso, senha, rh"
            />
            <EzCheck
              id="article-is-public"
              label="Público (visível para clientes sem login)"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />

            {saveMutation.isError && (
              <EzAlert variant="error">
                Falha ao {editingId ? 'atualizar' : 'salvar'} o artigo.
              </EzAlert>
            )}
            <div className="flex gap-2 pt-2">
              <EzButton type="submit" disabled={saveMutation.isPending}>
                {editingId ? 'Atualizar' : 'Salvar'}
              </EzButton>
              <EzButton type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </EzButton>
            </div>
          </EzCardItem>
        </form>
      )}

      <div className="space-y-4">
        {(articles ?? []).map((art) => (
          <EzCardItem key={art.id} flat className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-[16px] font-semibold text-gray-900">{art.title}</h2>
                {!art.isPublic && <EzTag label="Interno" variant="yellow" />}
              </div>
              {canAuthor && (
                <div className="flex gap-2">
                  <EzButton variant="tertiary" size="small" onClick={() => openEditForm(art)}>
                    Editar
                  </EzButton>
                  {canDelete && (
                    <EzButton
                      variant="tertiary"
                      size="small"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (window.confirm('Excluir este artigo?')) deleteMutation.mutate(art.id);
                      }}
                    >
                      Excluir
                    </EzButton>
                  )}
                </div>
              )}
            </div>
            <p className="whitespace-pre-wrap text-gray-700 mb-3">{art.content}</p>

            {art.tags && art.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {art.tags.map((t) => (
                  <button key={t} onClick={() => setTag(t)} title={`Filtrar por ${t}`}>
                    <EzTag label={`#${t}`} variant="gray" />
                  </button>
                ))}
              </div>
            )}
          </EzCardItem>
        ))}
        {!articles?.length && (
          <EzEmptyCard title="Nenhum artigo encontrado para a busca atual." />
        )}
      </div>
    </div>
  );
}

export default KnowledgePage;
