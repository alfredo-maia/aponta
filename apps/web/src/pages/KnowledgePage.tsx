import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

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

  if (isLoading) return <div className="p-8">Carregando artigos...</div>;

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Base de Conhecimento (FAQ)</h1>
          {(!user) && <p className="text-sm text-gray-500">Exibindo apenas artigos públicos</p>}
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Buscar palavra-chave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded border px-3 py-1.5 min-w-[200px]"
            title="busca por palavra-chave"
          />
          {tag && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Tag: {tag}
              <button onClick={() => setTag('')} aria-label="Remover filtro de tag" className="hover:text-blue-900 font-bold">&times;</button>
            </span>
          )}
          
          {canAuthor && !isFormOpen && (
            <button
              type="button"
              onClick={openNewForm}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
            >
              + Novo artigo
            </button>
          )}
        </div>
      </div>

      {canAuthor && isFormOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="mb-6 p-4 border rounded shadow-sm bg-gray-50 space-y-3"
        >
          <div>
            <label htmlFor="article-title" className="block text-sm font-medium mb-1">Título</label>
            <input
              id="article-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded border px-2 py-1 bg-white"
            />
          </div>
          <div>
            <label htmlFor="article-content" className="block text-sm font-medium mb-1">Conteúdo</label>
            <textarea
              id="article-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              className="w-full rounded border px-2 py-1 bg-white"
            />
          </div>
          <div>
            <label htmlFor="article-tags" className="block text-sm font-medium mb-1">Tags (separadas por vírgula)</label>
            <input
              id="article-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ex: acesso, senha, rh"
              className="w-full rounded border px-2 py-1 bg-white"
            />
          </div>
          <label className="flex items-center gap-2 text-sm pt-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Público (visível para clientes sem login)
          </label>
          
          {saveMutation.isError && (
            <p role="alert" className="text-sm text-red-600">
              Falha ao {editingId ? 'atualizar' : 'salvar'} o artigo.
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-2 text-sm border bg-white rounded hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {(articles ?? []).map((art) => (
          <div key={art.id} className="p-4 border rounded shadow-sm bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900">{art.title}</h2>
                {!art.isPublic && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                    Interno
                  </span>
                )}
              </div>
              {canAuthor && (
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(art)}
                    className="text-sm text-blue-600 py-1 hover:underline cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Excluir este artigo?')) deleteMutation.mutate(art.id);
                    }}
                    className="text-sm text-red-600 py-1 hover:underline cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
            <p className="whitespace-pre-wrap text-gray-700 mb-3">{art.content}</p>
            
            {(art.tags && art.tags.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {art.tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    title={`Filtrar por ${t}`}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {!(articles?.length) && (
          <p className="text-gray-500 py-4">Nenhum artigo encontrado para a busca atual.</p>
        )}
      </div>
    </div>
  );
}
