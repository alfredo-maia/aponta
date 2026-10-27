import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';
import { TabBar } from './TabBar';
import { TabsProvider } from '../../contexts/TabsContext';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-80 text-gray-900">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex justify-end border-b border-gray-200 bg-white p-3">
          <UserMenu />
        </header>
        <TabsProvider>
          <TabBar />
          <main className="flex-1 overflow-auto p-6 min-w-0">
            <Outlet />
          </main>
        </TabsProvider>
      </div>
    </div>
  );
}

export default AppLayout;
