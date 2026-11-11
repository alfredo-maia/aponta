import { keepPreviousData, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEscapeLayer } from '../hooks/useEscapeLayer';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { Ticket, TicketPriority } from '../hooks/useTickets';
import type { TicketFormValues } from '../components/tickets/TicketForm';
import { TicketForm } from '../components/tickets/TicketForm';
import { EzCardItem, EzAlert, EzButton, EzSearch, EzSpinner } from '../components/ds';

export interface CatalogItem {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  defaultServiceDeskId: string;
  defaultPriority: TicketPriority;
}

export interface CatalogCategory {
  id: string;
  name: string;
  description: string | null;
  items: CatalogItem[];
}

export function CreateTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const isClientBase = currentUser?.role === 'CLIENT' || currentUser?.role === 'CLIENT_MASTER';
  const [organizationId, setOrganizationId] = useState('');

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', { active: true }],
    queryFn: async () => {
      const { data } = await api.get<{ id: string; name: string }[]>('/organizations', { params: { active: true } });
      return data;
    },
    enabled: !isClientBase,
  });

  const {
    data: catalog = [],
    isPending: catalogLoading,
    isFetching: catalogFetching,
  } = useQuery({
    queryKey: ['catalog', organizationId],
    queryFn: async () => {
      const res = await api.get<CatalogCategory[]>('/catalog', {
        params: organizationId ? { organizationId } : undefined,
      });
      return res.data;
    },
    // Trocar o Cliente mantém a lista anterior na tela até a nova chegar, sem remontar o seletor.
    placeholderData: keepPreviousData,
    // Falha do catálogo cai no formulário em branco; retentativas só prolongariam o spinner.
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (values: TicketFormValues & { catalogItemId?: string }) => {
      // IMPORTANT: apps/api's ValidationPipe uses forbidNonWhitelisted: true,
      // and CreateTicketDto only accepts catalogItemId/semCatalogo/title/
      // description/serviceDeskId/priority/organizationId. requesterId,
      // followersIds, parentId, scheduledDate and attachments are DS-form-only
      // fields with no backend support yet (no TicketFollower table, no
      // scheduledFor column). Sending them verbatim makes every ticket
      // creation fail with a 400. Only forward what the API can accept;
      // parentId/attachments are wired through their own existing endpoints
      // (PATCH /tickets/:id/parent, POST /tickets/:id/attachments) right
      // after creation instead.
      const payload: {
        catalogItemId?: string;
        semCatalogo?: boolean;
        organizationId?: string;
        title: string;
        description: string;
        serviceDeskId: string;
        priority?: TicketPriority;
        attachmentCount?: number;
      } = {
        title: values.title,
        description: values.description,
        serviceDeskId: values.serviceDeskId,
        priority: values.priority,
        attachmentCount: values.attachments?.length ?? 0,
      };
      if (!isClientBase && values.organizationId) payload.organizationId = values.organizationId;
      if (selectedCatalogItem && selectedCatalogItem.id !== 'custom') {
        payload.catalogItemId = selectedCatalogItem.id;
        payload.serviceDeskId = selectedCatalogItem.defaultServiceDeskId;
        payload.priority = selectedCatalogItem.defaultPriority;
      } else {
        payload.semCatalogo = true;
      }
      const { data } = await api.post<Ticket>('/tickets', payload);

      if (values.parentId) {
        await api.patch(`/tickets/${data.id}/parent`, { parentTicketId: values.parentId });
      }
      if (values.attachments && values.attachments.length > 0) {
        await Promise.all(
          values.attachments.map((file) => {
            const form = new FormData();
            form.append('file', file);
            return api.post(`/tickets/${data.id}/attachments`, form, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          }),
        );
      }

      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/tickets/${data.id}`);
    },
    onError: () => {
      setSubmitError('Falha ao criar o chamado. Verifique os dados e tente novamente.');
    },
  });

  const showCatalog = catalog.length > 0 || !!organizationId;
  useEscapeLayer(() => setSelectedCatalogItem(null), showCatalog && !!selectedCatalogItem, 'page');

  if (catalogLoading) {
    return (
      <div className="max-w-4xl pt-4">
        <EzSpinner label="Carregando catálogo…" />
      </div>
    );
  }

  if (showCatalog && !selectedCatalogItem) {
    const categories = catalog.filter((category) => category.items.length > 0);
    return (
      <div className="space-y-6 max-w-4xl pt-4">
        <div data-testid="catalog-header" className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[16rem] flex-1 space-y-1">
            <h1 className="text-[20px] font-semibold text-gray-900">Catálogo de Serviços</h1>
            <p className="text-gray-500 text-sm">
              Selecione o tipo de solicitação abaixo para direcionamentos automáticos.
            </p>
          </div>
          <EzButton
            variant="tertiary"
            className="h-auto max-w-full whitespace-normal py-2 text-left"
            onClick={() =>
              setSelectedCatalogItem({
                id: 'custom',
                title: 'Outra Solicitação',
                description: '',
                icon: null,
                defaultServiceDeskId: '',
                defaultPriority: 'MEDIUM',
              })
            }
            label="Meu problema não está catalogado (abrir chamado em branco)"
          />
        </div>

        {!isClientBase && (
          <div className="max-w-sm">
            <EzSearch
              id="catalog-organization"
              label="Cliente"
              placeholder="Buscar cliente…"
              autoComplete="off"
              options={organizations.map((org) => ({ label: org.name, value: org.id }))}
              value={organizationId || null}
              onChange={(value) => setOrganizationId(value ? String(value) : '')}
            />
          </div>
        )}

        <div aria-live="polite" aria-busy={catalogFetching}>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">
              {organizationId
                ? 'Nenhum serviço do catálogo para este Cliente.'
                : 'Nenhum serviço disponível no catálogo.'}
            </p>
          ) : (
            <div data-testid="catalog-columns" className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {categories.map((category) => (
                <EzCardItem
                  key={category.id}
                  role="region"
                  aria-labelledby={`catalog-category-${category.id}`}
                  className="mb-4 break-inside-avoid p-4"
                >
                  <h2
                    id={`catalog-category-${category.id}`}
                    className="mb-2 break-words text-[16px] font-semibold text-gray-900"
                  >
                    {category.name}
                  </h2>
                  <ul className="space-y-1">
                    {category.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCatalogItem(item)}
                          className="w-full cursor-pointer rounded-card p-2 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                        >
                          <span className="block break-words font-medium text-brand-600">
                            {item.icon || '📄'} {item.title}
                          </span>
                          {item.description && (
                            <span className="mt-1 block break-words text-xs text-gray-500 line-clamp-3">
                              {item.description}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </EzCardItem>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 max-w-4xl">
      <div className="flex items-center gap-3">
        {showCatalog && (
          <EzButton
            variant="tertiary"
            size="small"
            leftIcon={ArrowLeft}
            onClick={() => setSelectedCatalogItem(null)}
            aria-label="Voltar para o catálogo"
          />
        )}
        <h1 className="text-[20px] font-semibold text-gray-900">Abrir Chamado</h1>
      </div>

      {selectedCatalogItem && selectedCatalogItem.id !== 'custom' && (
        <EzAlert variant="info" className="mb-4">
          <span className="font-bold">Serviço Selecionado:</span> {selectedCatalogItem.icon}{' '}
          {selectedCatalogItem.title}
        </EzAlert>
      )}

      <TicketForm
        catalogOverride={selectedCatalogItem?.id === 'custom' ? undefined : selectedCatalogItem}
        lockedOrganizationId={organizationId || undefined}
        onSubmit={(values) => mutation.mutate(values)}
        isSubmitting={mutation.isPending}
        submitError={submitError}
      />
    </div>
  );
}

export default CreateTicketPage;
