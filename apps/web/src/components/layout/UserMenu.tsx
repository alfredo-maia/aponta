import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Avatar/email dropdown in the top-right corner, mirroring the Tiflux
 * reference UI: clicking the signed-in user's name opens a small menu
 * with "Minha Conta" and "Sair" (Tema/Ajuda/Status do Tiflux from the
 * reference are out of scope — no equivalent feature exists yet).
 */
export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {user.email.charAt(0).toUpperCase()}
        </span>
        {user.email}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border bg-background shadow-md">
          <Link
            to="/my-account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-muted"
          >
            Minha Conta
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
