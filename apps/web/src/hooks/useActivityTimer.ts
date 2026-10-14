import { useEffect, useState } from 'react';

export interface ActivityTimerStore {
  startISO?: string;
  endISO?: string;
  paused?: boolean;
}

export interface ActivityTimer {
  timerStartISO: string | null;
  timerEndISO: string | null;
  timerPaused: boolean;
  timerActive: boolean;
  timerSeconds: number;
  handleStartTimer: () => void;
  handlePauseTimer: () => void;
  handleResumeTimer: () => void;
  handleStopTimer: () => void;
  handleCancelTimer: () => void;
}

export function activityTimerStorageKey(ticketId: string): string {
  return `aponta_activity_timer_${ticketId}`;
}

export function readActivityTimerStore(ticketId: string): ActivityTimerStore | null {
  try {
    const raw = localStorage.getItem(activityTimerStorageKey(ticketId));
    if (!raw) return null;
    return JSON.parse(raw) as ActivityTimerStore;
  } catch {
    return null;
  }
}

function persistActivityTimer(
  ticketId: string,
  next: { startISO?: string | null; endISO?: string | null; paused?: boolean },
) {
  try {
    if (!next.startISO) {
      localStorage.removeItem(activityTimerStorageKey(ticketId));
      return;
    }
    localStorage.setItem(
      activityTimerStorageKey(ticketId),
      JSON.stringify({ startISO: next.startISO, endISO: next.endISO || undefined, paused: next.paused }),
    );
  } catch {
    // ignore quota / private mode
  }
}

/**
 * TiFlux-style pré-apontamento timer. Play lives in the ticket header;
 * the Apontamentos tab only lists the resulting row.
 */
export function useActivityTimer(ticketId: string): ActivityTimer {
  const [timerStartISO, setTimerStartISO] = useState<string | null>(
    () => readActivityTimerStore(ticketId)?.startISO || null,
  );
  const [timerEndISO, setTimerEndISO] = useState<string | null>(
    () => readActivityTimerStore(ticketId)?.endISO || null,
  );
  const [timerPaused, setTimerPaused] = useState<boolean>(
    () => Boolean(readActivityTimerStore(ticketId)?.paused),
  );
  const [timerActive, setTimerActive] = useState<boolean>(() => {
    const stored = readActivityTimerStore(ticketId);
    return Boolean(stored?.startISO && !stored?.endISO);
  });
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

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

  const handleStartTimer = () => {
    const iso = new Date().toISOString();
    setTimerStartISO(iso);
    setTimerEndISO(null);
    setTimerActive(true);
    setTimerPaused(false);
    setTimerSeconds(0);
    persistActivityTimer(ticketId, { startISO: iso, endISO: null, paused: false });
  };

  const handlePauseTimer = () => {
    setTimerPaused(true);
    persistActivityTimer(ticketId, { startISO: timerStartISO, endISO: timerEndISO, paused: true });
  };

  const handleResumeTimer = () => {
    setTimerPaused(false);
    persistActivityTimer(ticketId, { startISO: timerStartISO, endISO: null, paused: false });
  };

  const handleStopTimer = () => {
    const now = new Date();
    const start = timerStartISO ? new Date(timerStartISO) : new Date(now.getTime() - timerSeconds * 1000);
    const startISO = start.toISOString();
    const endISO = now.toISOString();
    setTimerStartISO(startISO);
    setTimerEndISO(endISO);
    setTimerActive(false);
    setTimerPaused(false);
    persistActivityTimer(ticketId, { startISO, endISO, paused: false });
  };

  const handleCancelTimer = () => {
    setTimerActive(false);
    setTimerPaused(false);
    setTimerSeconds(0);
    setTimerStartISO(null);
    setTimerEndISO(null);
    persistActivityTimer(ticketId, { startISO: null });
  };

  return {
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
