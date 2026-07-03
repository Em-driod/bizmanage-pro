import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { NotificationProvider } from './context/NotificationContext';
import { PrintProvider } from './context/PrintContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';
import CommandPalette from './components/CommandPalette';
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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import ScannedTransactions from './pages/ScannedTransactions';
import ActivityLog from './pages/ActivityLog';
import Automation from './pages/Automation';
import Projects from './pages/Projects';
import Tax from './pages/Tax';
import PublicInvoice from './pages/PublicInvoice';
import PublicProfile from './pages/PublicProfile';
import Proposals from './pages/Proposals';
import PublicProposal from './pages/PublicProposal';
import Products from './pages/Products';
import PublicPayslip from './pages/PublicPayslip';
import ClientPortal from './pages/ClientPortal';
import CapitalAssets from './pages/CapitalAssets';
import Budgets from './pages/Budgets';
import PublicReceipt from './pages/PublicReceipt';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/invoice/:id" element={<PublicInvoice />} />
      <Route path="/biz/:slug" element={<PublicProfile />} />
      <Route path="/proposal/:id" element={<PublicProposal />} />
      <Route path="/payslip/:token" element={<PublicPayslip />} />
      <Route path="/portal/:token" element={<ClientPortal />} />
      <Route path="/receipt/:token" element={<PublicReceipt />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

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
        <Route path="/automation" element={<Layout><Automation /></Layout>} />
        <Route path="/projects" element={<Layout><Projects /></Layout>} />
        <Route path="/tax" element={<Layout><Tax /></Layout>} />
        <Route path="/proposals" element={<Layout><Proposals /></Layout>} />
        <Route path="/products" element={<Layout><Products /></Layout>} />
        <Route path="/capital-assets" element={<Layout><CapitalAssets /></Layout>} />
        <Route path="/budgets" element={<Layout><Budgets /></Layout>} />

        {/* Admin Only */}
        <Route element={<ProtectedRoute requiredRole={UserRole.ADMIN} />}>
          <Route path="/users" element={<Layout><Users /></Layout>} />
          <Route path="/activity" element={<Layout><ActivityLog /></Layout>} />
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
            <SocketProvider>
              <Router>
                <CommandPalette />
                <AppRoutes />
              </Router>
              <ToastContainer />
            </SocketProvider>
          </PrintProvider>
        </CurrencyProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;