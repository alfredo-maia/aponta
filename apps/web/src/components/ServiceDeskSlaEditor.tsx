import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EzAlert, EzButton, EzComboBox, EzTextInput } from './ds';

interface Organization {
  id: string;
  name: string;
}

interface ServiceDeskSlaFields {
  organizationId?: string | null;
  organizationName?: string | null;
  slaCriticalResponseHours?: number | null;
  slaCriticalResolveHours?: number | null;
  slaHighResponseHours?: number | null;
  slaHighResolveHours?: number | null;
  slaMediumResponseHours?: number | null;
  slaMediumResolveHours?: number | null;
  slaLowResponseHours?: number | null;
  slaLowResolveHours?: number | null;
}

const PRIORITIES: { key: 'Critical' | 'High' | 'Medium' | 'Low'; label: string; defaults: { response: number; resolve: number } }[] = [
  { key: 'Critical', label: 'Crítica', defaults: { response: 1, resolve: 4 } },
  { key: 'High', label: 'Alta', defaults: { response: 4, resolve: 8 } },
  { key: 'Medium', label: 'Média', defaults: { response: 8, resolve: 24 } },
  { key: 'Low', label: 'Baixa', defaults: { response: 24, resolve: 72 } },
];

function toFormValue(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : String(n);
}

function toApiValue(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lets ADMIN link a ServiceDesk to a specific client (Organization) and
 * configure per-priority SLA targets that override the global defaults
 * in `tickets.service.ts`'s SLA_HOURS — Tiflux-parity "Mesa do cliente"
 * + "Meta de SLA". A blank field falls back to the global default for
 * that priority (see `calculateSla`/`buildSlaOverrides` on the API).
 */
export function ServiceDeskSlaEditor({
  deskId,
  initial,
}: {
  deskId: string;
  initial: ServiceDeskSlaFields;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [organizationId, setOrganizationId] = useState(initial.organizationId ?? '');
  const [slaValues, setSlaValues] = useState<Record<string, string>>(() => ({
    CriticalResponse: toFormValue(initial.slaCriticalResponseHours),
    CriticalResolve: toFormValue(initial.slaCriticalResolveHours),
    HighResponse: toFormValue(initial.slaHighResponseHours),
    HighResolve: toFormValue(initial.slaHighResolveHours),
    MediumResponse: toFormValue(initial.slaMediumResponseHours),
    MediumResolve: toFormValue(initial.slaMediumResolveHours),
    LowResponse: toFormValue(initial.slaLowResponseHours),
    LowResolve: toFormValue(initial.slaLowResolveHours),
  }));

  const { data: organizations } = useQuery({
    queryKey: ['organizations', 'all-for-desk-link'],
    queryFn: async () => {
      const { data } = await api.get<Organization[]>('/organizations');
      return data;
    },
    enabled: isEditing,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/service-desks/${deskId}`, {
        organizationId: organizationId || null,
        slaCriticalResponseHours: toApiValue(slaValues.CriticalResponse),
        slaCriticalResolveHours: toApiValue(slaValues.CriticalResolve),
        slaHighResponseHours: toApiValue(slaValues.HighResponse),
        slaHighResolveHours: toApiValue(slaValues.HighResolve),
        slaMediumResponseHours: toApiValue(slaValues.MediumResponse),
        slaMediumResolveHours: toApiValue(slaValues.MediumResolve),
        slaLowResponseHours: toApiValue(slaValues.LowResponse),
        slaLowResolveHours: toApiValue(slaValues.LowResolve),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-desks'] });
      setIsEditing(false);
    },
  });

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          <span className="mb-1 block text-xs font-medium text-gray-500">Cliente vinculado</span>
          <strong className="text-gray-900">
            {initial.organizationName ?? 'Mesa compartilhada (sem cliente)'}
          </strong>
        </div>
        <EzButton type="button" variant="secondary" size="small" onClick={() => setIsEditing(true)}>
          Editar cliente e SLA
        </EzButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="max-w-md">
        <EzComboBox
          id={`desk-org-${deskId}`}
          label="Cliente vinculado (opcional)"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        >
          <option value="">Mesa compartilhada (sem cliente)</option>
          {(organizations ?? []).map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </EzComboBox>
      </div>

      <div>
        <label className="font-semibold block mb-1 text-gray-900">
          Meta de SLA por prioridade (horas úteis)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Deixe em branco para usar o padrão global do sistema.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRIORITIES.map(({ key, label, defaults }) => (
            <div key={key} className="rounded-[8px] border border-gray-200 p-2">
              <div className="text-xs font-medium text-gray-700 mb-1">{label}</div>
              <div className="flex gap-2">
                <EzTextInput
                  id={`desk-sla-${deskId}-${key}-response`}
                  label={`1ª resposta (pad. ${defaults.response}h)`}
                  type="number"
                  min={0}
                  value={slaValues[`${key}Response`]}
                  onChange={(e) =>
                    setSlaValues((prev) => ({ ...prev, [`${key}Response`]: e.target.value }))
                  }
                />
                <EzTextInput
                  id={`desk-sla-${deskId}-${key}-resolve`}
                  label={`Resolução (pad. ${defaults.resolve}h)`}
                  type="number"
                  min={0}
                  value={slaValues[`${key}Resolve`]}
                  onChange={(e) =>
                    setSlaValues((prev) => ({ ...prev, [`${key}Resolve`]: e.target.value }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {mutation.isError && (
        <EzAlert variant="error">Falha ao salvar. Tente novamente.</EzAlert>
      )}

      <div className="flex gap-2 justify-end">
        <EzButton type="button" variant="secondary" size="small" onClick={() => setIsEditing(false)}>
          Cancelar
        </EzButton>
        <EzButton
          type="button"
          size="small"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Salvar cliente e SLA
        </EzButton>
      </div>
    </div>
  );
}
