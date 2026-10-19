import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { LayoutGrid, List as ListIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import {
  EzAlert,
  EzBreadcrumb,
  EzButton,
  EzCardItem,
  EzCheck,
  EzComboBox,
  EzEmptyCard,
  EzSpinner,
  EzTag,
  EzTextArea,
  EzTextInput,
} from '../components/ds';
import { cn } from '../components/ds/utils';
import { KnowledgeFolder, KnowledgeFoldersGrid } from '../components/knowledge/KnowledgeFoldersGrid';

interface Article {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  tags: string[];
  author?: { id: string; name: string } | null;
  updatedAt?: string;
}

type ArticleSort = 'updated_desc' | 'title_asc' | 'title_desc';
type ViewMode = 'list' | 'grid';

const PAGE_SIZE = 10;

function formatUpdatedAt(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('pt-BR');
}

export function KnowledgePage() {
  const user = useAuthStore((state) => state.user);
  const canAuthor =
    user?.role === 'AGENT' ||
    user?.role === 'AGENT_MASTER' ||
    user?.role === 'ADMIN';

  const canDelete = user?.role === 'ADMIN';

  const queryClient = useQueryClient();
  // Tela inicial do painel de Conhecimento agora é a grade de pastas
  // (DMTE-87, Stage 1); null = grade de pastas, string = dentro de uma pasta.
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState<ArticleSort>('updated_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);

  // Tiflux-parity: ordenação e filtro por múltiplas tags reiniciam a paginação.
  useEffect(() => {
    setPage(1);
  }, [search, selectedTags, sort]);

  // Reutiliza a mesma queryKey da KnowledgeFoldersGrid para ler o nome da
  // pasta selecionada (breadcrumb) a partir do cache já populado por ela,
  // sem disparar uma segunda requisição.
  const { data: folders } = useQuery<KnowledgeFolder[]>({
    queryKey: ['knowledge-folders'],
    queryFn: async () => {
      const res = await api.get('/knowledge-folders');
      return res.data;
    },
    enabled: selectedFolderId !== null,
  });
  const selectedFolder = folders?.find((f) => f.id === selectedFolderId);

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ['articles', { search, tags: selectedTags, sort, folderId: selectedFolderId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (sort !== 'updated_desc') params.set('sort', sort);
      if (selectedFolderId) params.set('folderId', selectedFolderId);

      // Even if user not logged in, api.get works for public articles.
      const res = await api.get(`/articles?${params.toString()}`);
      return res.data;
    },
    enabled: selectedFolderId !== null,
  });

  const totalPages = Math.max(1, Math.ceil((articles?.length ?? 0) / PAGE_SIZE));
  const pagedArticles = useMemo(
    () => (articles ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [articles, page]
  );

  const toggleTag = (t: string) => {
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

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
      const payload: {
        title: string;
        content: string;
        isPublic: boolean;
        tags: string[];
        folderId?: string;
      } = {
        title,
        content,
        isPublic,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      };

      // Um artigo criado dentro de uma pasta já nasce associado a ela.
      if (!editingId && selectedFolderId) {
        payload.folderId = selectedFolderId;
      }

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

  if (selectedFolderId === null) {
    return (
      <div className="p-8 flex-1 overflow-y-auto">
        <KnowledgeFoldersGrid onOpenFolder={setSelectedFolderId} canAuthor={canAuthor} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <EzSpinner label="Carregando artigos..." />
      </div>
    );
  }

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <EzBreadcrumb
        className="mb-4"
        items={[
          { label: 'Pastas', onClick: () => setSelectedFolderId(null) },
          { label: selectedFolder?.name ?? '...' },
        ]}
      />

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
          {selectedTags.map((t) => (
            <EzTag
              key={t}
              label={`Tag: ${t}`}
              variant="ocean"
              rightIcon={
                <button
                  onClick={() => toggleTag(t)}
                  aria-label={`Remover filtro de tag ${t}`}
                  className="hover:text-brand-900 font-bold"
                >
                  &times;
                </button>
              }
            />
          ))}

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

      {/* Tiflux-parity: ordenação (A-Z/Z-A/última atualização) e alternador Lista/Grade */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="w-[220px]">
          <EzComboBox
            id="article-sort"
            aria-label="Ordenar por"
            value={sort}
            onChange={(e) => setSort(e.target.value as ArticleSort)}
          >
            <option value="updated_desc">Última atualização</option>
            <option value="title_asc">A - Z</option>
            <option value="title_desc">Z - A</option>
          </EzComboBox>
        </div>

        <div className="flex items-center gap-1 shrink-0 rounded-[12px] border border-gray-200 p-1">
          <button
            type="button"
            aria-label="Exibir em lista"
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors',
              viewMode === 'list' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-90'
            )}
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Exibir em grade"
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors',
              viewMode === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-90'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        data-testid="knowledge-articles"
        data-view-mode={viewMode}
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-4'
        }
      >
        {pagedArticles.map((art) => (
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

            {(art.author?.name || art.updatedAt) && (
              <p className="text-xs text-gray-500 mb-2">
                {art.author?.name && <span>Por {art.author.name}</span>}
                {art.author?.name && art.updatedAt && <span> • </span>}
                {art.updatedAt && <span>{formatUpdatedAt(art.updatedAt)}</span>}
              </p>
            )}

            <p className="whitespace-pre-wrap text-gray-700 mb-3">{art.content}</p>

            {art.tags && art.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {art.tags.map((t) => (
                  <button key={t} onClick={() => toggleTag(t)} title={`Filtrar por ${t}`}>
                    <EzTag label={`#${t}`} variant={selectedTags.includes(t) ? 'ocean' : 'gray'} />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <EzButton
            type="button"
            variant="tertiary"
            size="small"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </EzButton>
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <EzButton
            type="button"
            variant="tertiary"
            size="small"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </EzButton>
        </div>
      )}
    </div>
  );
}

export default KnowledgePage;
