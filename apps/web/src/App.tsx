import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ServiceDesksPage } from './pages/ServiceDesksPage';
import { TicketDetailPage } from './pages/TicketDetailPage';

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
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tickets/new" element={<CreateTicketPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/service-desks" element={<ServiceDesksPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
