import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { EzAvatar, EzDropdown } from '../ds';

/**
 * Avatar/email dropdown in the top-right corner, mirroring the Tiflux
 * reference UI: clicking the signed-in user's name opens a small menu
 * with "Minha Conta" and "Sair" (Tema/Ajuda/Status do Tiflux from the
 * reference are out of scope — no equivalent feature exists yet).
 */
export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  return (
    <EzDropdown
      align="right"
      trigger={
        <span className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[14px] font-medium text-gray-700 hover:bg-gray-80 hover:text-gray-900 transition-colors">
          <EzAvatar name={user.email} size={28} />
          {user.email}
        </span>
      }
      options={[
        {
          label: 'Minha Conta',
          icon: <User className="w-4 h-4" />,
          onClick: () => navigate('/my-account'),
        },
        {
          label: 'Sair',
          icon: <LogOut className="w-4 h-4" />,
          onClick: logout,
        },
      ]}
    />
  );
}

export default UserMenu;
