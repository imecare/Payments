import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './auth/AuthContext';
import PrivateRoute from './auth/PrivateRoute';
import RoleRoute from './auth/RoleRoute';
import LoginPage from './auth/LoginPage';
import SidebarLayout from './layout/SidebarLayout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const SellersPage = lazy(() => import('./pages/SellersPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const AbonosPage = lazy(() => import('./pages/AbonosPage'));
const ConsultaPage = lazy(() => import('./pages/ConsultaPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CommissionistDashboardPage = lazy(() => import('./pages/CommissionistDashboardPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingSpinner message="Cargando..." fullPage />}>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/consulta" element={<ConsultaPage />} />
                <Route
                  element={
                    <PrivateRoute>
                      <SidebarLayout />
                    </PrivateRoute>
                  }
                >
                  <Route
                    path="/dashboard"
                    element={
                      <RoleRoute allow={['super_admin']} fallbackTo="/forbidden">
                        <Dashboard />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/sales"
                    element={
                      <RoleRoute allow={['super_admin', 'commissionist']}>
                        <SalesPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/payments"
                    element={
                      <RoleRoute allow={['super_admin']} fallbackTo="/forbidden">
                        <PaymentsPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/abonos"
                    element={
                      <RoleRoute allow={['super_admin']} fallbackTo="/forbidden">
                        <AbonosPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/clients"
                    element={
                      <RoleRoute allow={['super_admin', 'commissionist']} fallbackTo="/forbidden">
                        <ClientsPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/sellers"
                    element={
                      <RoleRoute allow={['super_admin']} fallbackTo="/forbidden">
                        <SellersPage />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/mi-cartera"
                    element={
                      <RoleRoute allow={['commissionist']} fallbackTo="/forbidden">
                        <CommissionistDashboardPage />
                      </RoleRoute>
                    }
                  />
                  <Route path="/forbidden" element={<ForbiddenPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                {/* Cualquier otra ruta redirige al login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}