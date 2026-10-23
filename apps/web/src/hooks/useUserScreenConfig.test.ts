import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserScreenConfig } from './useUserScreenConfig';
import { useAuthStore } from '../stores/authStore';

describe('useUserScreenConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      token: null,
      user: { sub: 'user-123', email: 'test@dm.com', role: 'ADMIN', organizationId: null } as any,
    });
  });

  it('initializes with provided defaults', () => {
    const { result } = renderHook(() =>
      useUserScreenConfig('tickets', {
        grid: { columnVisibility: { protocol: true, updatedAt: false }, density: 'compact' },
        form: { layout: 'CASCADE' },
        viewMode: 'GRID',
      })
    );

    expect(result.current.config.grid.columnVisibility).toEqual({
      protocol: true,
      updatedAt: false,
    });
    expect(result.current.config.grid.density).toBe('compact');
    expect(result.current.config.form.layout).toBe('CASCADE');
    expect(result.current.config.viewMode).toBe('GRID');
  });

  it('persists column visibility to localStorage per user', () => {
    const { result } = renderHook(() =>
      useUserScreenConfig('tickets', {
        grid: { columnVisibility: { protocol: true }, density: 'compact' },
      })
    );

    act(() => {
      result.current.setColumnVisibility({ protocol: true, title: false });
    });

    expect(result.current.config.grid.columnVisibility).toEqual({
      protocol: true,
      title: false,
    });

    const stored = JSON.parse(
      localStorage.getItem('aponta_screen_config_user-123_tickets') || '{}'
    );
    expect(stored.grid.columnVisibility).toEqual({ protocol: true, title: false });
  });

  it('persists form layout and density per user', () => {
    const { result } = renderHook(() => useUserScreenConfig('tickets'));

    act(() => {
      result.current.setFormLayout('SIDE_BY_SIDE');
      result.current.setDensity('comfortable');
    });

    expect(result.current.config.form.layout).toBe('SIDE_BY_SIDE');
    expect(result.current.config.grid.density).toBe('comfortable');

    const stored = JSON.parse(
      localStorage.getItem('aponta_screen_config_user-123_tickets') || '{}'
    );
    expect(stored.form.layout).toBe('SIDE_BY_SIDE');
    expect(stored.grid.density).toBe('comfortable');
  });

  it('switches config when another user logs in', () => {
    // User 1 sets custom config
    const { result, rerender } = renderHook(() => useUserScreenConfig('tickets'));
    act(() => {
      result.current.setFormLayout('SIDE_BY_SIDE');
    });

    // Switch to User 2
    act(() => {
      useAuthStore.setState({
        token: null,
        user: { sub: 'user-456', email: 'other@dm.com', role: 'CLIENT', organizationId: null } as any,
      });
    });
    rerender();

    // User 2 sees default layout
    expect(result.current.config.form.layout).toBe('CASCADE');
  });

  it('restores defaults when restoreDefaults is called', () => {
    const { result } = renderHook(() =>
      useUserScreenConfig('tickets', {
        form: { layout: 'CASCADE' },
      })
    );

    act(() => {
      result.current.setFormLayout('SIDE_BY_SIDE');
    });
    expect(result.current.config.form.layout).toBe('SIDE_BY_SIDE');

    act(() => {
      result.current.restoreDefaults();
    });
    expect(result.current.config.form.layout).toBe('CASCADE');
    expect(localStorage.getItem('aponta_screen_config_user-123_tickets')).toBeNull();
  });

  it('persists groupBy per user (D5: Lista "Agrupar por")', () => {
    const { result } = renderHook(() =>
      useUserScreenConfig('tickets-list', { groupBy: 'organization' }),
    );

    expect(result.current.config.groupBy).toBe('organization');

    act(() => {
      result.current.setGroupBy('stage');
    });

    expect(result.current.config.groupBy).toBe('stage');
    const stored = JSON.parse(
      localStorage.getItem('aponta_screen_config_user-123_tickets-list') || '{}',
    );
    expect(stored.groupBy).toBe('stage');
  });

  it('persists columnOrder and savedFilters per user', () => {
    const { result } = renderHook(() => useUserScreenConfig('organizations'));

    act(() => {
      result.current.setColumnOrder(['name', 'document', 'legalName']);
      result.current.saveFilter('Filtro VIP', { status: 'ACTIVE', search: 'VIP' });
    });

    expect(result.current.config.grid.columnOrder).toEqual(['name', 'document', 'legalName']);
    expect(result.current.config.savedFilters).toHaveLength(1);
    expect(result.current.config.savedFilters[0].name).toBe('Filtro VIP');
    expect(result.current.config.savedFilters[0].criteria).toEqual({ status: 'ACTIVE', search: 'VIP' });

    const filterId = result.current.config.savedFilters[0].id;
    act(() => {
      result.current.deleteFilter(filterId);
    });

    expect(result.current.config.savedFilters).toHaveLength(0);
  });
});
