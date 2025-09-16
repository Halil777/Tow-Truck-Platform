import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { UIProvider } from './contexts/UIContext';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import OrdersPage from './pages/Orders';
import DriversPage from './pages/Drivers';
import DriversPerformancePage from './pages/DriversPerformance';
import PaymentsPage from './pages/Payments';
import PayoutsPage from './pages/Payouts';
import TransactionsPage from './pages/Transactions';
import RevenuePage from './pages/Revenue';
import DriverActivityPage from './pages/DriverActivity';
import HeatmapPage from './pages/Heatmap';
import SettingsSystemPage from './pages/SettingsSystem';
import SettingsAdminsPage from './pages/SettingsAdmins';
import Login from './pages/Login';
import ProtectedRoute from './routes/ProtectedRoute';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="drivers/performance" element={<DriversPerformancePage />} />
            <Route path="finance">
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="payouts" element={<PayoutsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
            </Route>
            <Route path="analytics">
              <Route path="revenue" element={<RevenuePage />} />
              <Route path="drivers" element={<DriverActivityPage />} />
              <Route path="heatmap" element={<HeatmapPage />} />
            </Route>
            <Route path="settings">
              <Route path="system" element={<SettingsSystemPage />} />
              <Route path="admins" element={<SettingsAdminsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </UIProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
