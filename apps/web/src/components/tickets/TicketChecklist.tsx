import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { EzButton, EzCheck, EzTextInput } from '../ds';

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export function TicketChecklist({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const [newItemText, setNewItemText] = useState('');

  const { data: checklists = [] } = useQuery({
    queryKey: ['tickets', ticketId, 'checklists'],
    queryFn: async () => {
      const res = await api.get<Checklist[]>(['/tickets', ticketId, 'checklists'].join('/'));
      return res.data;
    },
  });

  const createListMutation = useMutation({
    mutationFn: (title: string) => api.post(['/tickets', ticketId, 'checklists'].join('/'), { title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'checklists'] }),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ listId, text }: { listId: string; text: string }) =>
      api.post(['/tickets', ticketId, 'checklists', listId, 'items'].join('/'), { text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'checklists'] }),
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ listId, itemId, isCompleted }: { listId: string; itemId: string; isCompleted: boolean }) =>
      api.patch(['/tickets', ticketId, 'checklists', listId, 'items', itemId].join('/'), { isCompleted }),
    onMutate: async ({ listId, itemId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ['tickets', ticketId, 'checklists'] });
      const prev = queryClient.getQueryData<Checklist[]>(['tickets', ticketId, 'checklists']);
      queryClient.setQueryData<Checklist[]>(['tickets', ticketId, 'checklists'], (old) => {
        if (!old) return old;
        return old.map(list => {
          if (list.id !== listId) return list;
          return {
            ...list,
            items: list.items.map(item => item.id === itemId ? { ...item, isCompleted } : item)
          };
        });
      });
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) queryClient.setQueryData(['tickets', ticketId, 'checklists'], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'checklists'] }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      api.delete(['/tickets', ticketId, 'checklists', listId, 'items', itemId].join('/')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'checklists'] }),
  });

  if (checklists.length === 0) {
    return (
      <section className="space-y-2 rounded-lg border border-gray-200 bg-gray-80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Validação (Checklist)</h2>
          <EzButton
            type="button"
            variant="secondary"
            size="small"
            leftIcon={Plus}
            onClick={() => createListMutation.mutate('Pré-resolução')}
          >
            Criar Lista Interna
          </EzButton>
        </div>
        <p className="text-sm text-gray-500">Nenhum protocolo ou tarefa vinculada a este chamado.</p>
      </section>
    );
  }

  // Render first checklist
  const checklist = checklists[0];

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {checklist.title} <span className="text-sm font-normal text-gray-500">(Interno)</span>
      </h2>

      <ul className="space-y-1">
        {checklist.items.map((item) => (
          <li
            key={item.id}
            className="group -mx-1 flex items-center justify-between rounded p-1 hover:bg-gray-80"
          >
            <div className="flex-1 truncate">
              <EzCheck
                id={`checklist-item-${item.id}`}
                label={item.text}
                checked={item.isCompleted}
                onChange={(e) =>
                  toggleItemMutation.mutate({
                    listId: checklist.id,
                    itemId: item.id,
                    isCompleted: e.target.checked,
                  })
                }
                labelClassName={item.isCompleted ? 'line-through opacity-70' : undefined}
              />
            </div>
            <EzButton
              type="button"
              variant="tertiary"
              size="x-small"
              leftIcon={Trash2}
              onClick={() =>
                deleteItemMutation.mutate({ listId: checklist.id, itemId: item.id })
              }
              className="!text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Remover ${item.text}`}
            />
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newItemText.trim()) return;
          addItemMutation.mutate({ listId: checklist.id, text: newItemText.trim() });
          setNewItemText('');
        }}
        className="flex items-end gap-2 pt-2"
      >
        <div className="flex-1">
          <EzTextInput
            id="new-checklist-item"
            placeholder="Adicionar tarefa pendente..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
          />
        </div>
        <EzButton
          type="submit"
          size="small"
          leftIcon={Plus}
          disabled={!newItemText.trim() || addItemMutation.isPending}
          aria-label="Adicionar item"
        />
      </form>
    </section>
  );
}
