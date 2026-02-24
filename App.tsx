import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { NotificationProvider } from './context/NotificationContext';
import { PrintProvider } from './context/PrintContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';
import { UserRole } from './types';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Transactions from './pages/Transactions';
import Payrolls from './pages/Payrolls';
import Users from './pages/Users';
import BusinessPage from './pages/Businesses';
import Login from './pages/Login';
import Register from './pages/Register';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import ScannedTransactions from './pages/ScannedTransactions';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* Protected Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/clients" element={<Layout><Clients /></Layout>} />
        <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
        <Route path="/scanned-transactions" element={<Layout><ScannedTransactions /></Layout>} />
        <Route path="/payroll" element={<Layout><Payrolls /></Layout>} />
        <Route path="/reports" element={<Layout><Reports /></Layout>} />
        <Route path="/invoices" element={<Layout><Invoices /></Layout>} />
        <Route path="/business" element={<Layout><BusinessPage /></Layout>} />

        {/* Admin Only */}
        <Route element={<ProtectedRoute requiredRole={UserRole.ADMIN} />}>
          <Route path="/users" element={<Layout><Users /></Layout>} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CurrencyProvider>
          <PrintProvider>
            <Router>
              <AppRoutes />
            </Router>
            <ToastContainer />
          </PrintProvider>
        </CurrencyProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;