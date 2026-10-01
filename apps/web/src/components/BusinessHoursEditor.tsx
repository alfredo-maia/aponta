import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

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
      <p className="text-sm text-muted-foreground">Carregando expediente…</p>
    );
  }

  return (
    <div className="mt-2 space-y-3 border-t pt-2 border-gray-100 text-sm">
      <span className="font-semibold">Expediente (SLA em horas úteis)</span>

      {windows.length === 0 && holidays.length === 0 && (
        <p className="text-xs text-muted-foreground">
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
              <label className="sr-only" htmlFor={`weekday-${i}`}>
                Dia da semana
              </label>
              <select
                id={`weekday-${i}`}
                aria-label="Dia da semana"
                value={w.weekday}
                onChange={(e) =>
                  updateWindow(i, { weekday: Number(e.target.value) })
                }
                className="rounded border px-2 py-1 text-xs"
              >
                {WEEKDAY_LABELS.map((label, weekday) => (
                  <option key={weekday} value={weekday}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor={`start-${i}`}>
                Início
              </label>
              <input
                id={`start-${i}`}
                aria-label="Início"
                type="text"
                placeholder="08:00"
                value={w.startTime}
                onChange={(e) => updateWindow(i, { startTime: e.target.value })}
                className="w-20 rounded border px-2 py-1 text-xs"
              />
              <span className="text-muted-foreground">-</span>
              <label className="sr-only" htmlFor={`end-${i}`}>
                Fim
              </label>
              <input
                id={`end-${i}`}
                aria-label="Fim"
                type="text"
                placeholder="18:00"
                value={w.endTime}
                onChange={(e) => updateWindow(i, { endTime: e.target.value })}
                className="w-20 rounded border px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => removeWindow(i)}
                className="text-xs text-red-600 hover:underline"
              >
                Remover
              </button>
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
              <label className="sr-only" htmlFor={`holiday-date-${i}`}>
                Data
              </label>
              <input
                id={`holiday-date-${i}`}
                aria-label="Data"
                type="date"
                value={toDateInputValue(h.date)}
                onChange={(e) => updateHoliday(i, { date: e.target.value })}
                className="rounded border px-2 py-1 text-xs"
              />
              <label className="sr-only" htmlFor={`holiday-name-${i}`}>
                Nome do feriado
              </label>
              <input
                id={`holiday-name-${i}`}
                aria-label="Nome do feriado"
                type="text"
                placeholder="Natal"
                value={h.name}
                onChange={(e) => updateHoliday(i, { name: e.target.value })}
                className="rounded border px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => removeHoliday(i)}
                className="text-xs text-red-600 hover:underline"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addWindow}
          className="text-xs text-blue-600 hover:underline"
        >
          + Adicionar horário
        </button>
        <button
          type="button"
          onClick={addHoliday}
          className="text-xs text-blue-600 hover:underline"
        >
          + Adicionar feriado
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded border border-dashed p-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="shortcut-start" className="text-xs text-muted-foreground">
            Horário Seg-Sex (início)
          </label>
          <input
            id="shortcut-start"
            aria-label="Horário Seg-Sex (início)"
            type="text"
            placeholder="08:00"
            value={shortcutStart}
            onChange={(e) => setShortcutStart(e.target.value)}
            className="w-20 rounded border px-2 py-1 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="shortcut-end" className="text-xs text-muted-foreground">
            Horário Seg-Sex (fim)
          </label>
          <input
            id="shortcut-end"
            aria-label="Horário Seg-Sex (fim)"
            type="text"
            placeholder="18:00"
            value={shortcutEnd}
            onChange={(e) => setShortcutEnd(e.target.value)}
            className="w-20 rounded border px-2 py-1 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={applyMondayToFridayWindow}
          className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
        >
          Aplicar Seg-Sex
        </button>
        <span className="text-xs text-muted-foreground">
          Cria as 5 janelas (Seg a Sex) de uma vez com o mesmo horário.
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded border border-dashed p-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="import-year" className="text-xs text-muted-foreground">
            Ano para importar feriados
          </label>
          <input
            id="import-year"
            aria-label="Ano para importar feriados"
            type="text"
            value={importYear}
            onChange={(e) => setImportYear(e.target.value)}
            className="w-20 rounded border px-2 py-1 text-xs"
          />
        </div>
        <button
          type="button"
          disabled={importHolidaysMutation.isPending}
          onClick={() => importHolidaysMutation.mutate(importYear)}
          className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Importar feriados nacionais
        </button>
        <span className="text-xs text-muted-foreground">
          Busca os feriados nacionais do ano via BrasilAPI (feriados
          estaduais/municipais precisam ser adicionados manualmente).
        </span>
        {importHolidaysMutation.isError && (
          <p role="alert" className="w-full text-xs text-red-600">
            Falha ao importar feriados. Tente novamente.
          </p>
        )}
      </div>

      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600">
          Falha ao salvar o expediente. Tente novamente.
        </p>
      )}

      {isDirty && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="text-xs px-2 py-1 border rounded text-muted-foreground hover:bg-gray-50"
            onClick={() => setDraft(null)}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            Salvar expediente
          </button>
        </div>
      )}
    </div>
  );
}

export default BusinessHoursEditor;
