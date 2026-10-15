import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { EzButton, EzCheck, EzTextInput } from './ds';

export interface DeskStage {
  id: string;
  name: string;
  position: number;
  isInitial: boolean;
  isFinal: boolean;
  transitionToIds: string[];
}

export function MesaStagesEditor({ deskId }: { deskId: string }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<DeskStage | null>(null);
  const [editName, setEditName] = useState('');
  const [editTransitions, setEditTransitions] = useState<string[]>([]);

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['service-desk-stages', deskId],
    queryFn: async () => {
      const { data } = await api.get<DeskStage[]>(`/service-desks/${deskId}/stages`);
      return data;
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['service-desk-stages', deskId] });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      await api.post(`/service-desks/${deskId}/stages`, { name });
    },
    onSuccess: () => {
      setNewName('');
      void invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await api.patch(`/service-desks/${deskId}/stages/${editing.id}`, {
        name: editName,
        transitionToIds: editTransitions,
      });
    },
    onSuccess: () => {
      setEditing(null);
      void invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (stageId: string) => {
      await api.delete(`/service-desks/${deskId}/stages/${stageId}`);
    },
    onSuccess: () => void invalidate(),
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500">Carregando estágios…</p>;
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {stages.map((stage) => (
          <li
            key={stage.id}
            className="flex items-center justify-between gap-3 rounded-[10px] border border-gray-200 bg-white px-4 py-3 text-sm"
          >
            <span className="font-medium text-gray-900">
              {stage.name}
              {stage.isInitial ? ' (inicial)' : ''}
              {stage.isFinal ? ' (final)' : ''}
            </span>
            <span className="flex shrink-0 gap-2">
              <EzButton
                type="button"
                size="small"
                variant="secondary"
                onClick={() => {
                  setEditing(stage);
                  setEditName(stage.name);
                  setEditTransitions(stage.transitionToIds);
                }}
              >
                Editar
              </EzButton>
              {!stage.isInitial && !stage.isFinal && (
                <EzButton
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => deleteMutation.mutate(stage.id)}
                >
                  Excluir
                </EzButton>
              )}
            </span>
          </li>
        ))}
      </ul>

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
            id="mesa-new-stage-name"
            label="Novo estágio"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </div>
        <EzButton type="submit" size="small" disabled={createMutation.isPending}>
          + Estágio
        </EzButton>
      </form>

      {editing && (
        <form
          className="space-y-4 rounded-[10px] border border-gray-200 bg-gray-50/60 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate();
          }}
        >
          <EzTextInput
            id="mesa-edit-stage-name"
            label="Nome"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
          />
          <p className="text-xs font-medium text-gray-700">Possíveis estágios</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stages
              .filter((stage) => stage.id !== editing.id)
              .map((stage) => (
                <EzCheck
                  key={stage.id}
                  id={`mesa-stage-to-${stage.id}`}
                  label={stage.name}
                  checked={editTransitions.includes(stage.id)}
                  onChange={() =>
                    setEditTransitions((current) =>
                      current.includes(stage.id)
                        ? current.filter((id) => id !== stage.id)
                        : [...current, stage.id],
                    )
                  }
                />
              ))}
          </div>
          <div className="flex justify-end gap-2">
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
          </div>
        </form>
      )}
    </div>
  );
}
