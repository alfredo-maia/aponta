import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { TabBar } from './TabBar';
import { TabsProvider } from '../../contexts/TabsContext';
import { useEscapeLayer } from '../../hooks/useEscapeLayer';

/**
 * Shell do app. Desde 768px o menu lateral é fixo; abaixo disso ele vira um
 * menu retrátil (DMTE-427, AC-17): botão no cabeçalho, painel em `role="dialog"`,
 * que fecha por Esc, toque fora ou ao escolher um destino.
 */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEscapeLayer(() => setMenuOpen(false), menuOpen);

  // Menu modal: trava a rolagem do fundo e fecha se a tela crescer até o menu fixo,
  // para o painel e a barra fixa nunca coexistirem.
  useEffect(() => {
    if (!menuOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const desktop =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 768px)')
        : null;
    const closeOnDesktop = (event: { matches: boolean }) => {
      if (event.matches) setMenuOpen(false);
    };
    desktop?.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = '';
      desktop?.removeEventListener('change', closeOnDesktop);
    };
  }, [menuOpen]);

  // Foco: entra no painel ao abrir e volta ao botão ao fechar (menu modal).
  useEffect(() => {
    if (menuOpen) {
      dialogRef.current?.focus();
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = menuOpen;
  }, [menuOpen]);

  return (
    <TabsProvider>
      <div className="flex min-h-screen bg-gray-80 text-gray-900">
        <div
          data-testid="desktop-sidebar"
          inert={menuOpen}
          className="sticky top-0 hidden h-screen shrink-0 md:block"
        >
          <Sidebar />
        </div>

        {menuOpen && (
          <div className="md:hidden">
            <div
              data-testid="menu-backdrop"
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-gray-900/40"
              onClick={() => setMenuOpen(false)}
            />
            <div
              ref={dialogRef}
              id="menu-principal"
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal"
              tabIndex={-1}
              className="fixed inset-y-0 left-0 z-50 max-w-[85vw] shadow-popover outline-none"
            >
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMenuOpen(false)}
                className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-control text-gray-700 outline-none hover:bg-gray-80 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
              <Sidebar inDrawer onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        )}

        <div
          data-testid="app-content"
          inert={menuOpen}
          className="flex min-w-0 flex-1 flex-col"
        >
          <header className="flex items-center justify-between border-b border-gray-200 bg-white p-3">
            <button
              ref={toggleRef}
              type="button"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              aria-controls="menu-principal"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-control text-gray-700 outline-none hover:bg-gray-80 focus-visible:ring-2 focus-visible:ring-brand-500 md:hidden"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="ml-auto flex min-w-0 items-center gap-1">
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <TabBar />
          <main className="min-w-0 flex-1 overflow-auto p-3 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TabsProvider>
  );
}

export default AppLayout;
