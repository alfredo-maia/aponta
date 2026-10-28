import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { TicketAdvancedSearchPage } from './pages/TicketAdvancedSearchPage';
import { LoginPage } from './pages/LoginPage';
import { MyAccountPage } from './pages/MyAccountPage';
import { RegisterPage } from './pages/RegisterPage';
import { ServiceDesksPage } from './pages/ServiceDesksPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { PublicCsatPage } from './pages/PublicCsatPage';
import { VaultPage } from './pages/VaultPage';
import { VaultAuditPage } from './pages/VaultAuditPage';
import { ContractsPage } from './pages/ContractsPage';
import { DocsPage } from './pages/DocsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { TechnicalGroupsPage } from './pages/TechnicalGroupsPage';
import { PermissionGroupsPage } from './pages/PermissionGroupsPage';
import { SchedulePage } from './pages/SchedulePage';

/**
 * App-wide Tanstack Query client. The provider lives here (rather than in
 * main.tsx) alongside the router so `<App />` stays self-contained: any test
 * that renders the app gets a working query context without extra wrappers.
 * Tests that exercise query-backed components directly create their own
 * client (typically with `retry: false`).
 */
const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/avaliar/:token" element={<PublicCsatPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<TicketsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tickets/search" element={<TicketAdvancedSearchPage />} />
              <Route path="/tickets/new" element={<CreateTicketPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/service-desks" element={<ServiceDesksPage />} />
              <Route path="/organizations" element={<OrganizationsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/vault" element={<VaultPage />} />
              <Route path="/vault/audit" element={<VaultAuditPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/my-account" element={<MyAccountPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/users" element={<UsersPage />} />
              <Route path="/settings/technical-groups" element={<TechnicalGroupsPage />} />
              <Route path="/settings/permission-groups" element={<PermissionGroupsPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
