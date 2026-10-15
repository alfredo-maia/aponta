import { useEffect, useState } from 'react';
import { brasiliaTimeString } from '../lib/brasiliaTime';
import {
  useCreatePreAppointment,
  useDeletePreAppointment,
  usePreAppointments,
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
  handleStartTimer: () => Promise<void>;
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

  const running = items.find((item) => !item.ending);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const timerActive = Boolean(running);
  const timerStartISO = running?.beginning ?? null;
  const timerEndISO = running ? null : null;

  useEffect(() => {
    if (!running) {
      setTimerPaused(false);
      setTimerSeconds(0);
    }
  }, [running?.id]);

  useEffect(() => {
    if (!timerActive || timerPaused || !timerStartISO) return;

    const startMs = new Date(timerStartISO).getTime();
    setTimerSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

    const interval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setTimerSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timerPaused, timerStartISO]);

  const handleStartTimer = async () => {
    const beginning = new Date().toISOString();
    await createMut.mutateAsync({
      beginning,
      initTime: brasiliaTimeString(new Date(beginning)),
    });
    setTimerPaused(false);
    setTimerSeconds(0);
  };

  const handlePauseTimer = () => {
    setTimerPaused(true);
  };

  const handleResumeTimer = () => {
    setTimerPaused(false);
  };

  const handleStopTimer = async () => {
    if (!running) return;
    const ending = new Date().toISOString();
    await stopMut.mutateAsync({
      id: running.id,
      ending,
      endTime: brasiliaTimeString(new Date(ending)),
    });
    setTimerPaused(false);
  };

  const handleCancelTimer = async (id?: string) => {
    const targetId = id || running?.id;
    if (!targetId) return;
    await deleteMut.mutateAsync(targetId);
    setTimerPaused(false);
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
