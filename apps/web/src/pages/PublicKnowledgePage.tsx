import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EzEmptyCard, EzSpinner } from '../components/ds';

interface PublicFolder {
  id: string;
  name: string;
  icon?: string | null;
  articleCount: number;
}

interface PublicArticleSummary {
  id: string;
  title: string;
  folder: { id: string; name: string; icon?: string | null } | null;
  tags: string[];
  updatedAt: string;
}

/**
 * No-login portal (D-01/D-02, S4.2): `/r/knowledge`, grouped by folder.
 * Deliberately outside ProtectedRoute/AppLayout (registered at the top
 * level in App.tsx, same as /login and /avaliar/:token) and never links
 * back to the authenticated `/knowledge` panel (AC-08) — an anonymous
 * visitor has no path into it from here.
 */
export function PublicKnowledgePage() {
  const {
    data: folders,
    isLoading: isLoadingFolders,
    isError: isFoldersError,
  } = useQuery<PublicFolder[]>({
    queryKey: ['public-knowledge-folders'],
    queryFn: async () => {
      const res = await api.get('/public/knowledge/folders');
      return res.data;
    },
    retry: false,
  });

  const {
    data: articles,
    isLoading: isLoadingArticles,
    isError: isArticlesError,
  } = useQuery<PublicArticleSummary[]>({
    queryKey: ['public-knowledge-articles'],
    queryFn: async () => {
      const res = await api.get('/public/knowledge/articles');
      return res.data;
    },
    retry: false,
  });

  const isError = isFoldersError || isArticlesError;

  if (isLoadingFolders || isLoadingArticles) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-90">
        <EzSpinner label="Carregando..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-90 px-4">
        <p className="text-sm text-gray-500">
          Não foi possível carregar a base de conhecimento agora. Tente novamente mais tarde.
        </p>
      </div>
    );
  }

  const groups = (folders ?? []).map((folder) => ({
    folder,
    articles: (articles ?? []).filter((article) => article.folder?.id === folder.id),
  }));
  const ungrouped = (articles ?? []).filter((article) => !article.folder);

  const isEmpty = groups.every((g) => g.articles.length === 0) && ungrouped.length === 0;

  return (
    <div className="min-h-screen bg-gray-90 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[20px] font-semibold text-gray-900 mb-6">Base de Conhecimento</h1>

        {isEmpty && (
          <EzEmptyCard title="Nenhum conteúdo publicado até o momento." />
        )}

        {groups
          .filter((g) => g.articles.length > 0)
          .map(({ folder, articles: folderArticles }) => (
            <section key={folder.id} className="mb-8">
              <h2 className="text-[16px] font-semibold text-gray-900 mb-3">
                {folder.icon && <span aria-hidden="true">{folder.icon} </span>}
                {folder.name}
              </h2>
              <ul className="space-y-2">
                {folderArticles.map((article) => (
                  <li key={article.id}>
                    <Link
                      to={`/r/knowledge/${article.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

        {ungrouped.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-3">Sem pasta</h2>
            <ul className="space-y-2">
              {ungrouped.map((article) => (
                <li key={article.id}>
                  <Link to={`/r/knowledge/${article.id}`} className="text-brand-600 hover:underline">
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export default PublicKnowledgePage;
