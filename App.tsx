import React, { Suspense, lazy } from 'react';
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
import ErrorBoundary from './components/ErrorBoundary';
import { UserRole } from './types';

// Pages — Landing/Login/Register load eagerly (first thing most visitors hit).
// Everything else is lazy so the initial bundle doesn't ship all 30 pages upfront.
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Receipts = lazy(() => import('./pages/Receipts'));
const Payrolls = lazy(() => import('./pages/Payrolls'));
const Users = lazy(() => import('./pages/Users'));
const BusinessPage = lazy(() => import('./pages/Businesses'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Reports = lazy(() => import('./pages/Reports'));
const Invoices = lazy(() => import('./pages/Invoices'));
const ScannedTransactions = lazy(() => import('./pages/ScannedTransactions'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const Automation = lazy(() => import('./pages/Automation'));
const Projects = lazy(() => import('./pages/Projects'));
const Tax = lazy(() => import('./pages/Tax'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Proposals = lazy(() => import('./pages/Proposals'));
const PublicProposal = lazy(() => import('./pages/PublicProposal'));
const Products = lazy(() => import('./pages/Products'));
const PublicPayslip = lazy(() => import('./pages/PublicPayslip'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const CapitalAssets = lazy(() => import('./pages/CapitalAssets'));
const Budgets = lazy(() => import('./pages/Budgets'));
const PublicReceipt = lazy(() => import('./pages/PublicReceipt'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

const RouteFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
  </div>
);

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<RouteFallback />}>
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
        <Route path="/receipts" element={<Layout><Receipts /></Layout>} />
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
    </Suspense>
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
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
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