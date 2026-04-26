import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './auth/AuthContext';
import PrivateRoute from './auth/PrivateRoute';
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
        <AuthProvider>
          <BrowserRouter>
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
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/sales" element={<SalesPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/abonos" element={<AbonosPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/sellers" element={<SellersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}