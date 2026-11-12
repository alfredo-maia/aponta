import { useEffect, useState } from 'react';
import { brasiliaTimeString } from '../lib/brasiliaTime';
import { api } from '../lib/api';
import type { Contract } from './useContracts';
import {
  useCreatePreAppointment,
  useDeletePreAppointment,
  usePausePreAppointment,
  usePreAppointments,
  useResumePreAppointment,
  useStopPreAppointment,
  type PreAppointment,
} from './usePreAppointments';

export interface ActivityTimer {
  items: PreAppointment[];
  running: PreAppointment | undefined;
  timerStartISO: string | null;
  timerEndISO: string | null;
  timerPaused: boolean;
  timerActive: boolean;
  timerSeconds: number;
  handleStartTimer: (contractId?: string) => Promise<void>;
  handlePauseTimer: () => void;
  handleResumeTimer: () => void;
  handleStopTimer: () => Promise<void>;
  handleCancelTimer: (id?: string) => Promise<void>;
}

/**
 * TiFlux-style pré-apontamento: play always appends a persisted row.
 * Stop fills Fim on the open row without deleting it.
 */
export function useActivityTimer(ticketId: string): ActivityTimer {
  const { data: items = [] } = usePreAppointments(ticketId);
  const createMut = useCreatePreAppointment(ticketId);
  const stopMut = useStopPreAppointment(ticketId);
  const deleteMut = useDeletePreAppointment(ticketId);
  const pauseMut = usePausePreAppointment(ticketId);
  const resumeMut = useResumePreAppointment(ticketId);

  const running = items.find((item) => !item.ending);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const timerActive = Boolean(running);
  const timerStartISO = running?.beginning ?? null;
  const timerEndISO = null;
  // DMTE-462 T4: a pausa vem do servidor; o relógio desconta as pausas já somadas e para no instante da pausa.
  const pausedAt = running?.pausedAt ?? null;
  const pausedMs = running?.pausedMs ?? 0;
  const timerPaused = Boolean(pausedAt);

  useEffect(() => {
    if (!timerStartISO) {
      setTimerSeconds(0);
      return;
    }
    const startMs = new Date(timerStartISO).getTime();
    const tick = () =>
      setTimerSeconds(
        Math.max(0, Math.floor(((pausedAt ? new Date(pausedAt).getTime() : Date.now()) - startMs - pausedMs) / 1000)),
      );
    tick();
    if (pausedAt) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerStartISO, pausedAt, pausedMs]);

  const handleStartTimer = async (contractId?: string) => {
    const beginning = new Date().toISOString();
    const { data: eligible } = await api.get<Contract[]>(
      `/tickets/${ticketId}/worklog-contracts`,
      {
        params: {
          startTime: beginning,
          endTime: new Date(Date.parse(beginning) + 60000).toISOString(),
        },
      },
    );
    const selected = contractId
      ? eligible.find((contract) => contract.id === contractId)?.id
      : eligible.length === 1
        ? eligible[0].id
        : undefined;
    if (!selected)
      throw new Error(
        eligible.length > 1
          ? 'Selecione o contrato no lançamento antes de iniciar o cronômetro.'
          : 'Cronômetro bloqueado: regularize contrato aprovado, vigência e vínculos com a mesa.',
      );
    await createMut.mutateAsync({
      contractId: selected,
      beginning,
      initTime: brasiliaTimeString(new Date(beginning)),
    });
    setTimerSeconds(0);
  };

  const handlePauseTimer = () => {
    if (running) void pauseMut.mutateAsync(running.id);
  };

  const handleResumeTimer = () => {
    if (running) void resumeMut.mutateAsync(running.id);
  };

  const handleStopTimer = async () => {
    if (!running) return;
    const ending = new Date().toISOString();
    await stopMut.mutateAsync({
      id: running.id,
      ending,
      endTime: brasiliaTimeString(new Date(ending)),
    });
  };

  const handleCancelTimer = async (id?: string) => {
    const targetId = id || running?.id;
    if (!targetId) return;
    await deleteMut.mutateAsync(targetId);
    setTimerSeconds(0);
  };

  return {
    items,
    running,
    timerStartISO,
    timerEndISO,
    timerPaused,
    timerActive,
    timerSeconds,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleStopTimer,
    handleCancelTimer,
  };
}
