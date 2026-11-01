import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../lib/api';
import { EzSpinner } from '../components/ds';

interface PublicAttachment {
  id: string;
  originalName: string;
  mimeType: string;
}

interface PublicArticle {
  id: string;
  title: string;
  content: string;
  folder: { id: string; name: string; icon?: string | null } | null;
  tags: string[];
  updatedAt: string;
  attachments: PublicAttachment[];
}

/**
 * No-login portal (D-01/D-02, S4.2): `/r/knowledge/:articleId`. The 404
 * from `GET public/knowledge/articles/:id` is uniform for "doesn't exist"
 * and "exists but PRIVATE" (AC-02) — this page shows the exact same
 * message either way, by design: it can't tell, and must not try to.
 */
export function PublicKnowledgeArticlePage() {
  const { articleId = '' } = useParams<{ articleId: string }>();

  const { data, isLoading, isError, error } = useQuery<PublicArticle>({
    queryKey: ['public-knowledge-article', articleId],
    queryFn: async () => {
      const res = await api.get(`/public/knowledge/articles/${articleId}`);
      return res.data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-90">
        <EzSpinner label="Carregando..." />
      </div>
    );
  }

  if (isError) {
    const isNotFound = axios.isAxiosError(error) && error.response?.status === 404;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-90 px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            {isNotFound ? 'Artigo não encontrado' : 'Erro ao carregar'}
          </h1>
          <p className="text-sm text-gray-500">
            {isNotFound
              ? 'Este artigo não existe ou não está disponível publicamente.'
              : 'Não foi possível carregar o artigo agora. Tente novamente mais tarde.'}
          </p>
          <Link to="/r/knowledge" className="text-sm text-brand-600 hover:underline mt-4 inline-block">
            Voltar à Base de Conhecimento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-90 px-4 py-8">
      <div className="mx-auto max-w-3xl bg-white rounded-lg shadow p-6">
        <Link to="/r/knowledge" className="text-sm text-brand-600 hover:underline">
          ← Base de Conhecimento
        </Link>
        <h1 className="text-[20px] font-semibold text-gray-900 mt-3 mb-4">{data?.title}</h1>

        {/*
          Safe to render raw: article content only ever reaches this page
          after passing through the backend's sanitizeArticleContent step
          on save (strict tag/attribute/inline-style allowlist) — same
          invariant KnowledgePage.tsx relies on for the authenticated view.
        */}
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: data?.content ?? '' }}
        />

        {(data?.attachments.length ?? 0) > 0 && (
          <section className="mt-6 border-t border-gray-200 pt-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Anexos</h2>
            <ul className="space-y-1">
              {data?.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <a
                    href={`/api/articles/${data.id}/attachments/${attachment.id}/download`}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    {attachment.originalName}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export default PublicKnowledgeArticlePage;
