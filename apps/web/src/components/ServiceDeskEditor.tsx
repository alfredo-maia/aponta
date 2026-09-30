import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function ServiceDeskEditor({ desk, agents }: { desk: any; agents: any[] }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    desk.agents?.map((a: any) => a.id) || []
  );

  const mutation = useMutation({
    mutationFn: async (agentIds: string[]) => {
      await api.patch(`/service-desks/${desk.id}`, { agentIds });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-desks'] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    mutation.mutate(selectedAgents);
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  if (isEditing) {
    return (
      <div className="mt-2 text-sm border-t pt-2 border-gray-100 flex flex-col gap-2">
        <label className="font-semibold block mb-1">Membros (Atendentes vinculados)</label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border p-2 rounded">
          {agents.map((agent) => (
            <label key={agent.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={selectedAgents.includes(agent.id)}
                onChange={() => toggleAgent(agent.id)}
                className="rounded"
              />
              <span className="truncate" title={agent.email}>{agent.name}</span>
            </label>
          ))}
          {agents.length === 0 && (
            <span className="text-muted-foreground text-xs p-2">Nenhum agente cadastrado no sistema.</span>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            className="text-xs px-2 py-1 border rounded text-muted-foreground hover:bg-gray-50"
            onClick={() => setIsEditing(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
            disabled={mutation.isPending}
            onClick={handleSave}
          >
            Salvar Membros
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground border-t pt-2 border-gray-100">
      <div>
        Atendentes na fila: <strong className="text-black">{desk.agents?.length || 0}</strong>
      </div>
      <button
        type="button"
        className="text-blue-600 hover:underline px-2 py-1 rounded"
        onClick={() => setIsEditing(true)}
      >
        Editar Membros
      </button>
    </div>
  );
}
