import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

export interface SavedFilter {
  id: string;
  name: string;
  criteria: Record<string, any>;
}

export interface UserScreenConfig {
  grid: {
    columnVisibility: Record<string, boolean>;
    density: 'compact' | 'comfortable';
    columnOrder?: string[];
  };
  form: {
    layout: 'CASCADE' | 'SIDE_BY_SIDE';
  };
  viewMode: 'GRID' | 'FORM';
  savedFilters: SavedFilter[];
  /** Generic "Agrupar por" preference (e.g. Lista de Tickets, D5) — an opaque key the caller defines. */
  groupBy: string;
}

const DEFAULT_CONFIG: UserScreenConfig = {
  grid: {
    columnVisibility: {},
    density: 'compact',
    columnOrder: undefined,
  },
  form: {
    layout: 'CASCADE',
  },
  viewMode: 'GRID',
  savedFilters: [],
  groupBy: '',
};

function getStorageKey(userId: string | null | undefined, screenId: string): string {
  const uid = userId ?? 'default';
  return `aponta_screen_config_${uid}_${screenId}`;
}

/**
 * Manages user-specific screen configurations for both Grid Mode and Form Mode
 * (parity with Sankhya ERP personalização de tela por usuário).
 * Automatically persists to localStorage keyed by userId and screenId.
 */
export function useUserScreenConfig(
  screenId: string,
  initialDefaults?: Partial<UserScreenConfig>
) {
  const user = useAuthStore((state) => state.user);
  const userId = user ? ((user as any).id ?? user.sub) : null;

  const resolvedDefaults: UserScreenConfig = {
    grid: {
      columnVisibility: initialDefaults?.grid?.columnVisibility ?? DEFAULT_CONFIG.grid.columnVisibility,
      density: initialDefaults?.grid?.density ?? DEFAULT_CONFIG.grid.density,
      columnOrder: initialDefaults?.grid?.columnOrder ?? DEFAULT_CONFIG.grid.columnOrder,
    },
    form: {
      layout: initialDefaults?.form?.layout ?? DEFAULT_CONFIG.form.layout,
    },
    viewMode: initialDefaults?.viewMode ?? DEFAULT_CONFIG.viewMode,
    savedFilters: initialDefaults?.savedFilters ?? DEFAULT_CONFIG.savedFilters,
    groupBy: initialDefaults?.groupBy ?? DEFAULT_CONFIG.groupBy,
  };

  const loadConfig = useCallback((): UserScreenConfig => {
    try {
      const raw = localStorage.getItem(getStorageKey(userId, screenId));
      if (!raw) return resolvedDefaults;
      const parsed = JSON.parse(raw);
      return {
        grid: {
          columnVisibility: { ...resolvedDefaults.grid.columnVisibility, ...(parsed.grid?.columnVisibility ?? {}) },
          density: parsed.grid?.density ?? resolvedDefaults.grid.density,
          columnOrder: parsed.grid?.columnOrder ?? resolvedDefaults.grid.columnOrder,
        },
        form: {
          layout: parsed.form?.layout ?? resolvedDefaults.form.layout,
        },
        viewMode: parsed.viewMode ?? resolvedDefaults.viewMode,
        savedFilters: Array.isArray(parsed.savedFilters) ? parsed.savedFilters : resolvedDefaults.savedFilters,
        groupBy: parsed.groupBy ?? resolvedDefaults.groupBy,
      };
    } catch {
      return resolvedDefaults;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, screenId]);

  const [config, setConfig] = useState<UserScreenConfig>(loadConfig);

  useEffect(() => {
    setConfig(loadConfig());
  }, [loadConfig]);

  const setColumnVisibility = useCallback(
    (updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
      setConfig((prev) => {
        const nextColVis = typeof updater === 'function' ? updater(prev.grid.columnVisibility) : updater;
        const next: UserScreenConfig = {
          ...prev,
          grid: {
            ...prev.grid,
            columnVisibility: nextColVis,
          },
        };
        try {
          localStorage.setItem(getStorageKey(userId, screenId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId, screenId]
  );

  const setColumnOrder = useCallback(
    (columnOrder: string[]) => {
      setConfig((prev) => {
        const next: UserScreenConfig = {
          ...prev,
          grid: {
            ...prev.grid,
            columnOrder,
          },
        };
        try {
          localStorage.setItem(getStorageKey(userId, screenId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId, screenId]
  );

  const setDensity = useCallback(
    (density: 'compact' | 'comfortable') => {
      setConfig((prev) => {
        const next: UserScreenConfig = {
          ...prev,
          grid: {
            ...prev.grid,
            density,
          },
        };
        try {
          localStorage.setItem(getStorageKey(userId, screenId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId, screenId]
  );

  const setFormLayout = useCallback(
    (layout: 'CASCADE' | 'SIDE_BY_SIDE') => {
      setConfig((prev) => {
        const next: UserScreenConfig = {
          ...prev,
          form: {
            ...prev.form,
            layout,
          },
        };
        try {
          localStorage.setItem(getStorageKey(userId, screenId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId, screenId]
  );

  const setViewMode = useCallback(
    (viewMode: 'GRID' | 'FORM') => {
      setConfig((prev) => {
        const next: UserScreenConfig = {
          ...prev,
          viewMode,
        };
        try {
          localStorage.setItem(getStorageKey(userId, screenId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId, screenId]
  );

  const setGroupBy = useCallback(
    (groupBy: string) => {
      setConfig((prev) => {
        const next: UserScreenConfig = { ...prev, groupBy };
        try {
          localStorage.setItem(getStorageKey(userId, screenId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId, screenId]
  );

  const saveFilter = useCallback(
    (name: string, criteria: Record<string, any>) => {
      setConfig((prev) => {
        const id = `filter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const nextSaved = [...(prev.savedFilters ?? []), { id, name, criteria }];
        const next: UserScreenConfig = {
          ...prev,
          savedFilters: nextSaved,
        };
        try {
          localStorage.setItem(getStorageKey(userId, screenId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId, screenId]
  );

  const deleteFilter = useCallback(
    (filterId: string) => {
      setConfig((prev) => {
        const nextSaved = (prev.savedFilters ?? []).filter((f) => f.id !== filterId);
        const next: UserScreenConfig = {
          ...prev,
          savedFilters: nextSaved,
        };
        try {
          localStorage.setItem(getStorageKey(userId, screenId), JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [userId, screenId]
  );

  const restoreDefaults = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey(userId, screenId));
    } catch {
      // ignore
    }
    setConfig(resolvedDefaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, screenId]);

  return {
    config,
    setColumnVisibility,
    setColumnOrder,
    setDensity,
    setFormLayout,
    setViewMode,
    setGroupBy,
    saveFilter,
    deleteFilter,
    restoreDefaults,
  };
}
