import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import type { Ticket, TicketPriority } from '../hooks/useTickets';
import type { TicketFormValues } from '../components/tickets/TicketForm';
import { TicketForm } from '../components/tickets/TicketForm';

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

  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const res = await api.get<CatalogCategory[]>('/catalog');
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: TicketFormValues & { catalogItemId?: string }) => {
      // IMPORTANT: apps/api's ValidationPipe uses forbidNonWhitelisted: true,
      // and CreateTicketDto only accepts catalogItemId/title/description/
      // serviceDeskId/priority. organizationId, requesterId, followersIds,
      // parentId, scheduledDate and attachments are DS-form-only fields with
      // no backend support yet (see Issue #49's own gap list — no
      // ServiceDesk<->Organization link, no TicketFollower table, no
      // scheduledFor column). Sending them verbatim makes every ticket
      // creation fail with a 400. Only forward what the API can accept;
      // parentId/attachments are wired through their own existing endpoints
      // (PATCH /tickets/:id/parent, POST /tickets/:id/attachments) right
      // after creation instead.
      const payload: {
        catalogItemId?: string;
        title: string;
        description: string;
        serviceDeskId: string;
        priority?: TicketPriority;
      } = {
        title: values.title,
        description: values.description,
        serviceDeskId: values.serviceDeskId,
        priority: values.priority,
      };
      if (selectedCatalogItem) {
        payload.catalogItemId = selectedCatalogItem.id;
        payload.serviceDeskId = selectedCatalogItem.defaultServiceDeskId;
        payload.priority = selectedCatalogItem.defaultPriority;
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

  if (catalog.length > 0 && !selectedCatalogItem) {
    return (
      <div className="space-y-6 max-w-4xl pt-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Catálogo de Serviços</h1>
          <p className="text-muted-foreground text-sm">Selecione o tipo de solicitação abaixo para direcionamentos automáticos.</p>
        </div>

        {catalog.map(category => (
          <div key={category.id} className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-1">{category.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {category.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedCatalogItem(item)}
                  className="flex flex-col items-start text-left p-4 rounded-lg border bg-card hover:border-primary hover:ring-1 hover:ring-primary/20 transition-all focus:outline-none"
                >
                  <span className="font-medium text-primary mb-1">{item.icon || '📄'} {item.title}</span>
                  {item.description && <span className="text-xs text-muted-foreground line-clamp-3">{item.description}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-6">
           <button onClick={() => setSelectedCatalogItem({
              id: 'custom', title: 'Outra Solicitação', description: '', icon: null,
              defaultServiceDeskId: '', defaultPriority: 'MEDIUM'
           } as any)} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline">
              Meu problema não está catalogado (abrir chamado em branco)
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 max-w-lg">
      <div className="flex items-center gap-3">
        {catalog.length > 0 && (
           <button onClick={() => setSelectedCatalogItem(null)} className="p-1 rounded-full hover:bg-muted" aria-label="Voltar para o catálogo">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
           </button>
        )}
        <h1 className="text-2xl font-bold">Abrir Chamado</h1>
      </div>

      {selectedCatalogItem && selectedCatalogItem.id !== 'custom' && (
         <div className="bg-primary/5 border border-primary/20 p-3 rounded text-sm text-primary mb-4 flex items-center gap-2">
            <span className="font-bold">Serviço Selecionado:</span> {selectedCatalogItem.icon} {selectedCatalogItem.title}
         </div>
      )}

      <TicketForm
        catalogOverride={selectedCatalogItem?.id === 'custom' ? undefined : selectedCatalogItem}
        onSubmit={(values) => mutation.mutate(values)}
        isSubmitting={mutation.isPending}
        submitError={submitError}
      />
    </div>
  );
}

export default CreateTicketPage;
