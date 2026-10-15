import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { EzButton, EzCheck } from './ds';

interface FlagDef {
  key: string;
  label: string;
}

export function MesaFlagEditor({
  deskId,
  flags,
  values,
}: {
  deskId: string;
  flags: FlagDef[];
  values: object;
}) {
  const queryClient = useQueryClient();
  const flagValues = values as Record<string, unknown>;
  const [draft, setDraft] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(flags.map((f) => [f.key, flagValues[f.key] !== false])),
  );

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, boolean>) => {
      await api.patch(`/service-desks/${deskId}`, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-desks'] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {flags.map((flag) => (
          <EzCheck
            key={flag.key}
            id={`mesa-flag-${flag.key}`}
            label={flag.label}
            checked={draft[flag.key] === true}
            onChange={() =>
              setDraft((prev) => ({ ...prev, [flag.key]: !prev[flag.key] }))
            }
          />
        ))}
      </div>
      <div className="flex justify-end">
        <EzButton
          type="button"
          size="small"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(draft)}
        >
          Salvar
        </EzButton>
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-red-600">
          Não foi possível salvar as opções da mesa.
        </p>
      )}
    </div>
  );
}
