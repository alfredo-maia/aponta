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

/**
 * Knowledge Base (FAQ). Everyone authenticated can read; only AGENT and
 * above can author new articles (mirrors the backend RBAC in
 * ArticlesController — this is a UX convenience, not the real guard).
 */
export function KnowledgePage() {
  const user = useAuthStore((state) => state.user);
  const canAuthor =
    user?.role === 'AGENT' ||
    user?.role === 'AGENT_MASTER' ||
    user?.role === 'ADMIN';

  const queryClient = useQueryClient();
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ['articles'],
    queryFn: async () => {
      const res = await api.get('/articles');
      return res.data;
    },
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/articles', { title, content, isPublic });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setIsFormOpen(false);
      setTitle('');
      setContent('');
      setIsPublic(true);
    },
  });

  if (isLoading) return <div className="p-8">Carregando artigos...</div>;

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Base de Conhecimento (FAQ)</h1>
        {canAuthor && !isFormOpen && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Novo artigo
          </button>
        )}
      </div>

      {canAuthor && isFormOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mb-6 p-4 border rounded bg-white space-y-3"
        >
          <div>
            <label htmlFor="article-title" className="block text-sm font-medium mb-1">
              Título
            </label>
            <input
              id="article-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <div>
            <label htmlFor="article-content" className="block text-sm font-medium mb-1">
              Conteúdo
            </label>
            <textarea
              id="article-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              className="w-full rounded border px-2 py-1"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Público (visível para clientes sem precisar ser atendente)
          </label>
          {mutation.isError && (
            <p role="alert" className="text-sm text-red-600">
              Falha ao salvar o artigo. Tente novamente.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {(articles ?? []).map((art) => (
          <div key={art.id} className="p-4 border rounded shadow-sm bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{art.title}</h2>
              {!art.isPublic && (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                  Interno
                </span>
              )}
            </div>
            <p className="mt-2 text-gray-700">{art.content}</p>
          </div>
        ))}
        {!(articles?.length) && <p>Nenhum artigo encontrado.</p>}
      </div>
    </div>
  );
}
