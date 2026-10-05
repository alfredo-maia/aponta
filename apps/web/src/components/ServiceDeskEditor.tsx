import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EzButton, EzCheck } from './ds';

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
        <label className="font-semibold block mb-1 text-gray-900">Membros (Atendentes vinculados)</label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 p-2 rounded-[8px]">
          {agents.map((agent) => (
            <EzCheck
              key={agent.id}
              id={`agent-${agent.id}`}
              checked={selectedAgents.includes(agent.id)}
              onChange={() => toggleAgent(agent.id)}
              className="p-1 hover:bg-gray-90 rounded"
              label={<span className="truncate" title={agent.email}>{agent.name}</span>}
            />
          ))}
          {agents.length === 0 && (
            <span className="text-gray-500 text-xs p-2">Nenhum agente cadastrado no sistema.</span>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <EzButton
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setIsEditing(false)}
          >
            Cancelar
          </EzButton>
          <EzButton
            type="button"
            size="small"
            disabled={mutation.isPending}
            onClick={handleSave}
          >
            Salvar Membros
          </EzButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center justify-between text-xs text-gray-500 border-t pt-2 border-gray-100">
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
