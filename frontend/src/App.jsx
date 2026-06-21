import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Layout         from './components/Layout';
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import NewsPage       from './pages/NewsPage';
import CVEPage        from './pages/CVEPage';
import KEVPage        from './pages/KEVPage';
import AlertsPage     from './pages/AlertsPage';
import SearchPage     from './pages/SearchPage';
import IOCPage        from './pages/IOCPage';
import VirusTotalPage from './pages/VirusTotalPage';
import AssetsPage     from './pages/AssetsPage';
import ReportsPage    from './pages/ReportsPage';
import SettingsPage   from './pages/SettingsPage';
import ThreatMapPage  from './pages/ThreatMapPage';
import RulesPage      from './pages/RulesPage';
import ScannerPage    from './pages/ScannerPage';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Wrap({ Page }) {
  return <ProtectedRoute><Layout><Page /></Layout></ProtectedRoute>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login"      element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/"           element={<Wrap Page={DashboardPage}  />} />
      <Route path="/news"       element={<Wrap Page={NewsPage}       />} />
      <Route path="/cves"       element={<Wrap Page={CVEPage}        />} />
      <Route path="/kev"        element={<Wrap Page={KEVPage}        />} />
      <Route path="/ioc"        element={<Wrap Page={IOCPage}        />} />
      <Route path="/virustotal" element={<Wrap Page={VirusTotalPage} />} />
      <Route path="/threatmap"  element={<Wrap Page={ThreatMapPage}  />} />
      <Route path="/alerts"     element={<Wrap Page={AlertsPage}     />} />
      <Route path="/rules"      element={<Wrap Page={RulesPage}      />} />
      <Route path="/search"     element={<Wrap Page={SearchPage}     />} />
      <Route path="/assets"     element={<Wrap Page={AssetsPage}     />} />
      <Route path="/reports"    element={<Wrap Page={ReportsPage}    />} />
      <Route path="/scanner"    element={<Wrap Page={ScannerPage}    />} />
      <Route path="/settings"   element={<Wrap Page={SettingsPage}   />} />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#f9fafb',
              border: '1px solid #374151',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            },
            success: { iconTheme: { primary: '#14b8a6', secondary: '#042f2e' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#450a0a' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
