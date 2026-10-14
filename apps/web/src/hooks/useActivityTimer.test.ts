import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activityTimerStorageKey, useActivityTimer } from './useActivityTimer';

describe('useActivityTimer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T22:36:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('starts a running pré-apontamento and persists Brasília-instant start', () => {
    const { result } = renderHook(() => useActivityTimer('ticket-1'));

    act(() => {
      result.current.handleStartTimer();
    });

    expect(result.current.timerActive).toBe(true);
    expect(result.current.timerEndISO).toBeNull();
    expect(result.current.timerStartISO).toBe('2026-10-14T22:36:00.000Z');
    expect(JSON.parse(localStorage.getItem(activityTimerStorageKey('ticket-1'))!)).toMatchObject({
      startISO: '2026-10-14T22:36:00.000Z',
      paused: false,
    });
  });

  it('stop fills end time without clearing the pré-apontamento', () => {
    const { result } = renderHook(() => useActivityTimer('ticket-1'));

    act(() => {
      result.current.handleStartTimer();
    });
    vi.setSystemTime(new Date('2026-10-14T22:51:00.000Z'));
    act(() => {
      result.current.handleStopTimer();
    });

    expect(result.current.timerActive).toBe(false);
    expect(result.current.timerStartISO).toBe('2026-10-14T22:36:00.000Z');
    expect(result.current.timerEndISO).toBe('2026-10-14T22:51:00.000Z');
    expect(localStorage.getItem(activityTimerStorageKey('ticket-1'))).not.toBeNull();
  });

  it('cancel removes the stored pré-apontamento', () => {
    const { result } = renderHook(() => useActivityTimer('ticket-1'));

    act(() => {
      result.current.handleStartTimer();
      result.current.handleCancelTimer();
    });

    expect(result.current.timerStartISO).toBeNull();
    expect(localStorage.getItem(activityTimerStorageKey('ticket-1'))).toBeNull();
  });
});
