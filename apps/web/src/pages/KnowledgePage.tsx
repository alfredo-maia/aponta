import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function KnowledgePage() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const res = await api.get('/articles');
      return res.data;
    },
  });

  if (isLoading) return <div className="p-8">Carregando artigos...</div>;

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Base de Conhecimento (FAQ)</h1>
      <div className="space-y-4">
        {(articles || []).map((art: any) => (
          <div key={art.id} className="p-4 border rounded shadow-sm bg-white">
            <h2 className="text-xl font-bold">{art.title}</h2>
            <p className="mt-2 text-gray-700">{art.content}</p>
          </div>
        ))}
        {!(articles?.length) && <p>Nenhum artigo encontrado.</p>}
      </div>
    </div>
  );
}