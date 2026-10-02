import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { api } from '../../lib/api';


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
      <section className="space-y-2 rounded-lg border p-4 bg-muted/20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Validação (Checklist)</h2>
          <button type="button" className="inline-flex items-center rounded border px-3 py-1 text-sm bg-white hover:bg-gray-100" onClick={() => createListMutation.mutate('Pré-resolução')}><Plus className="mr-2 h-4 w-4" /> Criar Lista Interna</button>
        </div>
        <p className="text-sm text-muted-foreground">Nenhum protocolo ou tarefa vinculada a este chamado.</p>
      </section>
    );
  }

  // Render first checklist
  const checklist = checklists[0];

  return (
    <section className="space-y-4 rounded-lg border p-4 bg-muted/10">
      <h2 className="text-lg font-semibold text-primary">{checklist.title} (Interno)</h2>
      
      <ul className="space-y-1">
        {checklist.items.map((item) => (
          <li key={item.id} className="flex items-center group justify-between hover:bg-muted/50 p-1 -mx-1 rounded">
            <label className="flex items-center gap-3 cursor-pointer text-sm flex-1 truncate select-none">
              <input 
                type="checkbox"
                className="hidden" 
                checked={item.isCompleted} 
                onChange={(e) => toggleItemMutation.mutate({ listId: checklist.id, itemId: item.id, isCompleted: e.target.checked })}
              />
              <span className="text-primary hover:text-primary/80">
                {item.isCompleted ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </span>
              <span className={item.isCompleted ? 'text-muted-foreground line-through opacity-70' : 'font-medium'}>
                {item.text}
              </span>
            </label>
            <button type="button" className="inline-flex items-center justify-center rounded h-6 w-6 text-red-600 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteItemMutation.mutate({ listId: checklist.id, itemId: item.id })}><Trash2 className="h-3 w-3" /></button>
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
        className="flex gap-2 items-center pt-2"
      >
        <input
          type="text"
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none w-full"
          placeholder="Adicionar tarefa pendente..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
        />
        <button type="submit" disabled={!newItemText.trim() || addItemMutation.isPending} className="inline-flex items-center justify-center rounded bg-primary text-white h-8 w-8 disabled:opacity-50"><Plus className="h-4 w-4" /></button>
      </form>
    </section>
  );
}