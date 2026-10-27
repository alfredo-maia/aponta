import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface AppTab {
  /** Dedup key — always equal to `path`. */
  id: string;
  path: string;
  title: string;
  /** The fixed "Tickets" home tab can't be closed. */
  closable: boolean;
}

interface TabsContextValue {
  tabs: AppTab[];
  openTab: (path: string, title: string) => void;
  closeTab: (path: string) => void;
}

const STORAGE_KEY = 'aponta_tabs';

const FIXED_TAB: AppTab = {
  id: '/',
  path: '/',
  title: 'Tickets',
  closable: false,
};

function loadTabs(): AppTab[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [FIXED_TAB];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [FIXED_TAB];
    return parsed;
  } catch {
    return [FIXED_TAB];
  }
}

function persistTabs(tabs: AppTab[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // ignore storage errors (e.g. private mode quota)
  }
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function TabsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tabs, setTabs] = useState<AppTab[]>(loadTabs);

  useEffect(() => {
    persistTabs(tabs);
  }, [tabs]);

  const openTab = useCallback(
    (path: string, title: string) => {
      setTabs((prev) => {
        if (prev.some((tab) => tab.path === path)) return prev;
        return [...prev, { id: path, path, title, closable: true }];
      });
      navigate(path);
    },
    [navigate],
  );

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const index = prev.findIndex((tab) => tab.path === path);
        if (index === -1) return prev;
        const next = prev.filter((tab) => tab.path !== path);
        if (location.pathname === path) {
          const neighbor = prev[index - 1] ?? prev[index + 1] ?? FIXED_TAB;
          navigate(neighbor.path);
        }
        return next;
      });
    },
    [location.pathname, navigate],
  );

  return (
    <TabsContext.Provider value={{ tabs, openTab, closeTab }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return ctx;
}

/**
 * Opens `path` as an internal workspace tab when rendered inside a
 * `TabsProvider`, or falls back to a plain SPA navigation otherwise — so
 * components reusing this hook (e.g. `TicketCard`) work unchanged in
 * isolated unit tests that don't mount the full `AppLayout` tree.
 */
export function useOpenInTab(): (path: string, title: string) => void {
  const ctx = useContext(TabsContext);
  const navigate = useNavigate();
  return useCallback(
    (path: string, title: string) => {
      if (ctx) {
        ctx.openTab(path, title);
      } else {
        navigate(path);
      }
    },
    [ctx, navigate],
  );
}
