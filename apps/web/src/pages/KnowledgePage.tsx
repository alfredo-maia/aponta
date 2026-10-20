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
  EzModal,
  EzMultiSelect,
  EzRichText,
  EzSpinner,
  EzTag,
  EzTextInput,
} from '../components/ds';
import { cn } from '../components/ds/utils';
import { KnowledgeFolder, KnowledgeFoldersGrid } from '../components/knowledge/KnowledgeFoldersGrid';
import {
  KnowledgeArticleAttachments,
  type KnowledgeAttachment,
} from '../components/knowledge/KnowledgeArticleAttachments';

type ArticleVisibility = 'PUBLIC' | 'PRIVATE';

interface Article {
  id: string;
  title: string;
  content: string;
  visibility: ArticleVisibility;
  autoShareWithNewOrganizations?: boolean;
  tags: string[];
  author?: { id: string; name: string } | null;
  updatedAt?: string;
  attachments?: KnowledgeAttachment[];
  allowedAgentGroups?: { id: string; name: string }[];
  allowedOrganizations?: { id: string; name: string }[];
  serviceCatalogItems?: { id: string; name: string }[];
}

interface OrganizationAgentGroup {
  id: string;
  name: string;
  active: boolean;
}

interface OrganizationWithAgentGroups {
  id: string;
  name: string;
  agentGroups?: OrganizationAgentGroup[];
}

interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string | null;
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

  // Fontes para o diálogo de compartilhamento e para o multi-select de
  // Catálogo de Serviços — só necessárias para quem pode autorar artigos.
  const { data: organizations } = useQuery<OrganizationWithAgentGroups[]>({
    queryKey: ['organizations-for-knowledge-sharing'],
    queryFn: async () => {
      const res = await api.get('/organizations');
      return res.data;
    },
    enabled: canAuthor && selectedFolderId !== null,
  });

  const { data: catalogItems } = useQuery<ServiceCatalogItem[]>({
    queryKey: ['service-catalog-items'],
    queryFn: async () => {
      const res = await api.get('/service-catalog-items');
      return res.data;
    },
    enabled: canAuthor && selectedFolderId !== null,
  });

  const agentGroupOptions = useMemo(
    () =>
      (organizations ?? []).flatMap((org) =>
        (org.agentGroups ?? []).map((group) => ({
          value: group.id,
          label: `${org.name} / ${group.name}`,
        }))
      ),
    [organizations]
  );

  const organizationOptions = useMemo(
    () => (organizations ?? []).map((org) => ({ value: org.id, label: org.name })),
    [organizations]
  );

  const catalogItemOptions = useMemo(
    () => (catalogItems ?? []).map((item) => ({ value: item.id, label: item.name })),
    [catalogItems]
  );

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
  const [visibility, setVisibility] = useState<ArticleVisibility>('PUBLIC');
  const [tagsInput, setTagsInput] = useState('');
  const [agentGroupIds, setAgentGroupIds] = useState<string[]>([]);
  const [organizationIds, setOrganizationIds] = useState<string[]>([]);
  const [autoShareWithNewOrganizations, setAutoShareWithNewOrganizations] = useState(false);
  const [serviceCatalogItemIds, setServiceCatalogItemIds] = useState<string[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Formulário simples (nome + descrição) para cadastrar um novo item de
  // catálogo sem sair da página de Conhecimentos, suficiente para popular o
  // multi-select (a tela de administração completa do catálogo não faz
  // parte desta issue).
  const [isNewCatalogItemFormOpen, setIsNewCatalogItemFormOpen] = useState(false);
  const [newCatalogItemName, setNewCatalogItemName] = useState('');
  const [newCatalogItemDescription, setNewCatalogItemDescription] = useState('');

  const createCatalogItemMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/service-catalog-items', {
        name: newCatalogItemName,
        description: newCatalogItemDescription || undefined,
      });
      return res.data as ServiceCatalogItem;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog-items'] });
      setServiceCatalogItemIds((prev) => [...prev, created.id]);
      setNewCatalogItemName('');
      setNewCatalogItemDescription('');
      setIsNewCatalogItemFormOpen(false);
    },
  });

  const openNewForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setVisibility('PUBLIC');
    setTagsInput('');
    setAgentGroupIds([]);
    setOrganizationIds([]);
    setAutoShareWithNewOrganizations(false);
    setServiceCatalogItemIds([]);
    setIsFormOpen(true);
  };

  const openEditForm = (art: Article) => {
    setEditingId(art.id);
    setTitle(art.title);
    setContent(art.content);
    setVisibility(art.visibility);
    setTagsInput(art.tags?.join(', ') || '');
    setAgentGroupIds((art.allowedAgentGroups ?? []).map((g) => g.id));
    setOrganizationIds((art.allowedOrganizations ?? []).map((o) => o.id));
    setAutoShareWithNewOrganizations(art.autoShareWithNewOrganizations ?? false);
    setServiceCatalogItemIds((art.serviceCatalogItems ?? []).map((c) => c.id));
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: {
        title: string;
        content: string;
        visibility: ArticleVisibility;
        tags: string[];
        folderId?: string;
        agentGroupIds: string[];
        organizationIds: string[];
        autoShareWithNewOrganizations: boolean;
        serviceCatalogItemIds: string[];
      } = {
        title,
        content,
        visibility,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        agentGroupIds,
        organizationIds,
        autoShareWithNewOrganizations,
        serviceCatalogItemIds,
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
            <EzRichText
              value={content}
              onChange={setContent}
              label="Conteúdo"
              testId="article-content-editor"
            />
            <EzTextInput
              id="article-tags"
              label="Tags (separadas por vírgula)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ex: acesso, senha, rh"
            />

            <div className="flex items-end gap-3">
              <div className="w-[220px]">
                <EzComboBox
                  id="article-visibility"
                  label="Tipo de acesso"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as ArticleVisibility)}
                >
                  <option value="PUBLIC">Público</option>
                  <option value="PRIVATE">Privado</option>
                </EzComboBox>
              </div>
              {visibility === 'PRIVATE' && (
                <EzButton
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  Compartilhar
                </EzButton>
              )}
            </div>

            <EzMultiSelect
              id="article-service-catalog-items"
              label="Catálogo de serviços"
              value={serviceCatalogItemIds}
              onChange={(values) => setServiceCatalogItemIds(values as string[])}
              options={catalogItemOptions}
              placeholder="Associar itens do catálogo de serviços..."
            />

            {!isNewCatalogItemFormOpen ? (
              <button
                type="button"
                className="text-sm text-brand-700 hover:underline"
                onClick={() => setIsNewCatalogItemFormOpen(true)}
              >
                + Novo item de catálogo
              </button>
            ) : (
              <EzCardItem flat className="p-3 space-y-2 bg-gray-90/40">
                <EzTextInput
                  id="new-catalog-item-name"
                  label="Nome do item de catálogo"
                  value={newCatalogItemName}
                  onChange={(e) => setNewCatalogItemName(e.target.value)}
                />
                <EzTextInput
                  id="new-catalog-item-description"
                  label="Descrição (opcional)"
                  value={newCatalogItemDescription}
                  onChange={(e) => setNewCatalogItemDescription(e.target.value)}
                />
                <div className="flex gap-2">
                  <EzButton
                    type="button"
                    size="small"
                    disabled={!newCatalogItemName.trim() || createCatalogItemMutation.isPending}
                    onClick={() => createCatalogItemMutation.mutate()}
                  >
                    Adicionar
                  </EzButton>
                  <EzButton
                    type="button"
                    variant="tertiary"
                    size="small"
                    onClick={() => setIsNewCatalogItemFormOpen(false)}
                  >
                    Cancelar
                  </EzButton>
                </div>
              </EzCardItem>
            )}

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

      <EzModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Compartilhar artigo"
        maxWidth="md"
        footer={
          <EzButton type="button" onClick={() => setIsShareModalOpen(false)}>
            Concluído
          </EzButton>
        }
      >
        <div className="space-y-4">
          <EzMultiSelect
            id="article-agent-groups"
            label="Grupos de atendentes"
            value={agentGroupIds}
            onChange={(values) => setAgentGroupIds(values as string[])}
            options={agentGroupOptions}
            placeholder="Selecione os grupos de atendentes..."
          />
          <EzMultiSelect
            id="article-organizations"
            label="Clientes"
            value={organizationIds}
            onChange={(values) => setOrganizationIds(values as string[])}
            options={organizationOptions}
            placeholder="Selecione os clientes..."
          />
          <EzCheck
            id="article-auto-share"
            label="Adicionar novos clientes automaticamente"
            checked={autoShareWithNewOrganizations}
            onChange={(e) => setAutoShareWithNewOrganizations(e.target.checked)}
          />
        </div>
      </EzModal>

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
                {art.visibility === 'PRIVATE' && <EzTag label="Interno" variant="yellow" />}
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

            {/*
              Safe to render raw: article content only ever reaches the
              client after passing through the backend's
              sanitizeArticleContent step on save (strict tag/attribute/
              inline-style allowlist) — this is never unsanitized HTML
              typed directly by the current user.
            */}
            <div
              className="prose prose-sm max-w-none text-gray-700 mb-3"
              dangerouslySetInnerHTML={{ __html: art.content }}
            />

            {art.tags && art.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {art.tags.map((t) => (
                  <button key={t} onClick={() => toggleTag(t)} title={`Filtrar por ${t}`}>
                    <EzTag label={`#${t}`} variant={selectedTags.includes(t) ? 'ocean' : 'gray'} />
                  </button>
                ))}
              </div>
            )}

            <KnowledgeArticleAttachments
              articleId={art.id}
              attachments={art.attachments ?? []}
              canManage={canAuthor}
            />
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
