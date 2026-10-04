import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EzAlert, EzButton, EzComboBox, EzTextInput } from './ds';

interface BusinessHourWindow {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface HolidayEntry {
  id?: string;
  date: string;
  name: string;
}

interface BusinessHoursConfig {
  businessHours: BusinessHourWindow[];
  holidays: HolidayEntry[];
}

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function toDateInputValue(date: string): string {
  // Accepts both plain "2026-12-25" and full ISO timestamps.
  return date.length >= 10 ? date.slice(0, 10) : date;
}

/**
 * Lets ADMIN/AGENT_MASTER configure a ServiceDesk's Expediente (weekly
 * business-hour windows + holidays). This directly feeds SLA deadline
 * math on the backend (business hours instead of wall-clock hours) — see
 * `apps/api/src/scheduling/business-hours.ts`.
 */
export function BusinessHoursEditor({
  serviceDeskId,
}: {
  serviceDeskId: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ['service-desks', serviceDeskId, 'business-hours'];

  const { data, isLoading } = useQuery<BusinessHoursConfig>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<BusinessHoursConfig>(
        `/service-desks/${serviceDeskId}/business-hours`,
      );
      return data;
    },
  });

  // Local draft, only populated once the user starts editing. While null,
  // the component renders straight from server data (read-only summary).
  const [draft, setDraft] = useState<BusinessHoursConfig | null>(null);
  const isDirty = draft !== null;
  const windows = draft?.businessHours ?? data?.businessHours ?? [];
  const holidays = draft?.holidays ?? data?.holidays ?? [];

  // Shortcut state: "same window every Mon-Fri" so admins don't have to
  // add+fill 5 identical rows by hand.
  const [shortcutStart, setShortcutStart] = useState('');
  const [shortcutEnd, setShortcutEnd] = useState('');

  // National holiday import state.
  const currentYear = new Date().getFullYear();
  const [importYear, setImportYear] = useState(String(currentYear));

  const ensureDraft = (): BusinessHoursConfig =>
    draft ?? {
      businessHours: data?.businessHours ?? [],
      holidays: data?.holidays ?? [],
    };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        businessHours: windows.map(({ weekday, startTime, endTime }) => ({
          weekday,
          startTime,
          endTime,
        })),
        holidays: holidays.map(({ date, name }) => ({
          date: toDateInputValue(date),
          name,
        })),
      };
      const { data } = await api.put<BusinessHoursConfig>(
        `/service-desks/${serviceDeskId}/business-hours`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setDraft(null);
    },
  });

  const importHolidaysMutation = useMutation({
    mutationFn: async (year: string) => {
      const { data } = await api.get<{ date: string; name: string }[]>(
        `/service-desks/holidays/national/${year}`,
      );
      return data;
    },
    onSuccess: (imported) => {
      const current = ensureDraft();
      setDraft({
        ...current,
        holidays: [
          ...current.holidays,
          ...imported.map((h) => ({ date: h.date, name: h.name })),
        ],
      });
    },
  });

  const addWindow = () => {
    const current = ensureDraft();
    setDraft({
      ...current,
      businessHours: [
        ...current.businessHours,
        { weekday: 1, startTime: '08:00', endTime: '18:00' },
      ],
    });
  };

  const addHoliday = () => {
    const current = ensureDraft();
    setDraft({
      ...current,
      holidays: [...current.holidays, { date: '', name: '' }],
    });
  };

  const updateWindow = (index: number, patch: Partial<BusinessHourWindow>) => {
    const current = ensureDraft();
    setDraft({
      ...current,
      businessHours: current.businessHours.map((w, i) =>
        i === index ? { ...w, ...patch } : w,
      ),
    });
  };

  const removeWindow = (index: number) => {
    const current = ensureDraft();
    setDraft({
      ...current,
      businessHours: current.businessHours.filter((_, i) => i !== index),
    });
  };

  const updateHoliday = (index: number, patch: Partial<HolidayEntry>) => {
    const current = ensureDraft();
    setDraft({
      ...current,
      holidays: current.holidays.map((h, i) =>
        i === index ? { ...h, ...patch } : h,
      ),
    });
  };

  const removeHoliday = (index: number) => {
    const current = ensureDraft();
    setDraft({
      ...current,
      holidays: current.holidays.filter((_, i) => i !== index),
    });
  };

  const applyMondayToFridayWindow = () => {
    if (!shortcutStart.trim() || !shortcutEnd.trim()) return;
    const current = ensureDraft();
    const mondayToFriday = [1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      startTime: shortcutStart,
      endTime: shortcutEnd,
    }));
    setDraft({
      ...current,
      businessHours: [...current.businessHours, ...mondayToFriday],
    });
  };

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500">Carregando expediente…</p>
    );
  }

  return (
    <div className="mt-2 space-y-3 border-t pt-2 border-gray-100 text-sm">
      <span className="font-semibold text-gray-900">Expediente (SLA em horas úteis)</span>

      {windows.length === 0 && holidays.length === 0 && (
        <p className="text-xs text-gray-500">
          Sem expediente configurado — SLA conta horas corridas (24/7).
        </p>
      )}

      {windows.length > 0 && (
        <div className="space-y-2">
          {windows.map((w, i) => (
            <div
              key={i}
              data-testid={`business-hour-row-${i}`}
              className="flex flex-wrap items-center gap-2"
            >
              <EzComboBox
                id={`weekday-${i}`}
                aria-label="Dia da semana"
                value={w.weekday}
                onChange={(e) =>
                  updateWindow(i, { weekday: Number(e.target.value) })
                }
                className="!w-auto text-xs"
              >
                {WEEKDAY_LABELS.map((label, weekday) => (
                  <option key={weekday} value={weekday}>
                    {label}
                  </option>
                ))}
              </EzComboBox>
              <EzTextInput
                id={`start-${i}`}
                aria-label="Início"
                type="text"
                size="slim"
                placeholder="08:00"
                value={w.startTime}
                onChange={(e) => updateWindow(i, { startTime: e.target.value })}
                className="!w-20 text-xs"
              />
              <span className="text-gray-500">-</span>
              <EzTextInput
                id={`end-${i}`}
                aria-label="Fim"
                type="text"
                size="slim"
                placeholder="18:00"
                value={w.endTime}
                onChange={(e) => updateWindow(i, { endTime: e.target.value })}
                className="!w-20 text-xs"
              />
              <EzButton
                type="button"
                variant="tertiary"
                size="x-small"
                onClick={() => removeWindow(i)}
                className="!text-red-600 hover:!text-red-700"
              >
                Remover
              </EzButton>
            </div>
          ))}
        </div>
      )}

      {holidays.length > 0 && (
        <div className="space-y-2">
          {holidays.map((h, i) => (
            <div
              key={i}
              data-testid={`holiday-row-${i}`}
              className="flex flex-wrap items-center gap-2"
            >
              <EzTextInput
                id={`holiday-date-${i}`}
                aria-label="Data"
                type="date"
                size="slim"
                value={toDateInputValue(h.date)}
                onChange={(e) => updateHoliday(i, { date: e.target.value })}
                className="text-xs"
              />
              <EzTextInput
                id={`holiday-name-${i}`}
                aria-label="Nome do feriado"
                type="text"
                size="slim"
                placeholder="Natal"
                value={h.name}
                onChange={(e) => updateHoliday(i, { name: e.target.value })}
                className="text-xs"
              />
              <EzButton
                type="button"
                variant="tertiary"
                size="x-small"
                onClick={() => removeHoliday(i)}
                className="!text-red-600 hover:!text-red-700"
              >
                Remover
              </EzButton>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <EzButton
          type="button"
          variant="tertiary"
          size="x-small"
          onClick={addWindow}
        >
          + Adicionar horário
        </EzButton>
        <EzButton
          type="button"
          variant="tertiary"
          size="x-small"
          onClick={addHoliday}
        >
          + Adicionar feriado
        </EzButton>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-[8px] border border-dashed border-gray-200 p-2">
        <EzTextInput
          id="shortcut-start"
          aria-label="Horário Seg-Sex (início)"
          label="Horário Seg-Sex (início)"
          type="text"
          size="slim"
          placeholder="08:00"
          value={shortcutStart}
          onChange={(e) => setShortcutStart(e.target.value)}
          className="!w-20 text-xs"
        />
        <EzTextInput
          id="shortcut-end"
          aria-label="Horário Seg-Sex (fim)"
          label="Horário Seg-Sex (fim)"
          type="text"
          size="slim"
          placeholder="18:00"
          value={shortcutEnd}
          onChange={(e) => setShortcutEnd(e.target.value)}
          className="!w-20 text-xs"
        />
        <EzButton
          type="button"
          variant="secondary"
          size="small"
          onClick={applyMondayToFridayWindow}
        >
          Aplicar Seg-Sex
        </EzButton>
        <span className="text-xs text-gray-500">
          Cria as 5 janelas (Seg a Sex) de uma vez com o mesmo horário.
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-[8px] border border-dashed border-gray-200 p-2">
        <EzTextInput
          id="import-year"
          aria-label="Ano para importar feriados"
          label="Ano para importar feriados"
          type="text"
          size="slim"
          value={importYear}
          onChange={(e) => setImportYear(e.target.value)}
          className="!w-20 text-xs"
        />
        <EzButton
          type="button"
          variant="secondary"
          size="small"
          disabled={importHolidaysMutation.isPending}
          onClick={() => importHolidaysMutation.mutate(importYear)}
        >
          Importar feriados nacionais
        </EzButton>
        <span className="text-xs text-gray-500">
          Busca os feriados nacionais do ano via BrasilAPI (feriados
          estaduais/municipais precisam ser adicionados manualmente).
        </span>
        {importHolidaysMutation.isError && (
          <EzAlert variant="error" role="alert" className="w-full">
            Falha ao importar feriados. Tente novamente.
          </EzAlert>
        )}
      </div>

      {mutation.isError && (
        <EzAlert variant="error" role="alert">
          Falha ao salvar o expediente. Tente novamente.
        </EzAlert>
      )}

      {isDirty && (
        <div className="flex justify-end gap-2">
          <EzButton
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setDraft(null)}
          >
            Cancelar
          </EzButton>
          <EzButton
            type="button"
            size="small"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Salvar expediente
          </EzButton>
        </div>
      )}
    </div>
  );
}

export default BusinessHoursEditor;
