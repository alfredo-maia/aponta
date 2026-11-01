import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { EzAlert, EzButton, EzTextInput } from './ds';

export interface ServiceDeskCatalogItem {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface MesaCatalogEditorProps {
  deskId: string;
  resource: 'categories' | 'service-types';
  itemLabel: string;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const message = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
}

/**
 * DMTE-106: editor de Categorias/Tipos de atendimento por mesa (mesmo
 * formato para os dois recursos — ver SPEC
 * docs/superpowers/specs/2026-11-01-ticket-category-service-type.md).
 */
export function MesaCatalogEditor({ deskId, resource, itemLabel }: MesaCatalogEditorProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<ServiceDeskCatalogItem | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const queryKey = ['service-desk-catalog', resource, deskId];
  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<ServiceDeskCatalogItem[]>(
        `/service-desks/${deskId}/${resource}`,
      );
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      await api.post(`/service-desks/${deskId}/${resource}`, { name });
    },
    onSuccess: () => {
      setNewName('');
      setError('');
      void invalidate();
    },
    onError: (err: unknown) =>
      setError(extractErrorMessage(err, 'Não foi possível criar o item.')),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await api.patch(`/service-desks/${deskId}/${resource}/${editing.id}`, {
        name: editName,
      });
    },
    onSuccess: () => {
      setEditing(null);
      setError('');
      void invalidate();
    },
    onError: (err: unknown) =>
      setError(extractErrorMessage(err, 'Não foi possível salvar o item.')),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (item: ServiceDeskCatalogItem) => {
      await api.patch(`/service-desks/${deskId}/${resource}/${item.id}`, {
        active: !item.active,
      });
    },
    onSuccess: () => {
      setError('');
      void invalidate();
    },
    onError: (err: unknown) =>
      setError(extractErrorMessage(err, 'Não foi possível salvar o item.')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/service-desks/${deskId}/${resource}/${itemId}`);
    },
    onSuccess: () => {
      setError('');
      void invalidate();
    },
    onError: (err: unknown) =>
      setError(extractErrorMessage(err, 'Não foi possível excluir o item.')),
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500">Carregando…</p>;
  }

  return (
    <div className="space-y-5">
      {error && <EzAlert variant="error">{error}</EzAlert>}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhuma {itemLabel} cadastrada nesta mesa
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-gray-200 bg-white px-4 py-3 text-sm"
            >
              <span className="font-medium text-gray-900">
                {item.name}
                {!item.active ? ' (inativo)' : ''}
              </span>
              <span className="flex shrink-0 gap-2">
                <EzButton
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    setEditing(item);
                    setEditName(item.name);
                  }}
                >
                  Editar
                </EzButton>
                <EzButton
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => toggleActiveMutation.mutate(item)}
                >
                  {item.active ? 'Inativar' : 'Ativar'}
                </EzButton>
                <EzButton
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm(`Deseja excluir "${item.name}"?`)) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                >
                  Excluir
                </EzButton>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (newName.trim()) {
            createMutation.mutate(newName.trim());
          }
        }}
      >
        <div className="flex-1">
          <EzTextInput
            id={`mesa-new-catalog-item-${resource}`}
            label={`Nova ${itemLabel}`}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </div>
        <EzButton type="submit" size="small" disabled={createMutation.isPending}>
          + {itemLabel}
        </EzButton>
      </form>

      {editing && (
        <form
          className="flex items-end gap-2 rounded-[10px] border border-gray-200 bg-gray-50/60 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate();
          }}
        >
          <div className="flex-1">
            <EzTextInput
              id={`mesa-edit-catalog-item-${resource}`}
              label="Nome"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
          </div>
          <EzButton
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setEditing(null)}
          >
            Cancelar
          </EzButton>
          <EzButton type="submit" size="small" disabled={updateMutation.isPending}>
            Salvar
          </EzButton>
        </form>
      )}
    </div>
  );
}
