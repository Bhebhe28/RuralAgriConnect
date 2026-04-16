import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import { AdvisoriesList, AdvisoryDetail } from './pages/Advisories';
import Weather from './pages/Weather';
import Chatbot from './pages/Chatbot';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import PublishAdvisory from './pages/PublishAdvisory';
import ManageFarmers from './pages/ManageFarmers';
import AdminPanel from './pages/AdminPanel';
import YieldReport from './pages/YieldReport';
import SubsidyRequest from './pages/SubsidyRequest';
import CropCalendar from './pages/CropCalendar';
import Community from './pages/Community';
import OutbreakDashboard from './pages/OutbreakDashboard';
import FarmFields from './pages/FarmFields';
import Analytics from './pages/Analytics';
import ExportReports from './pages/ExportReports';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', color: '#c00' }}>
          <h2>App crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      {/* Landing page always shows at / — logged in users see "Go to Dashboard" in nav */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Private routes — all under /app layout */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="advisories"     element={<AdvisoriesList />} />
        <Route path="advisories/:id" element={<AdvisoryDetail />} />
        <Route path="weather"        element={<Weather />} />
        <Route path="chatbot"        element={<Chatbot />} />
        <Route path="notifications"  element={<Notifications />} />
        <Route path="profile"        element={<Profile />} />
        <Route path="yields"         element={<YieldReport />} />
        <Route path="subsidies"      element={<SubsidyRequest />} />
        <Route path="calendar"       element={<CropCalendar />} />
        <Route path="community"      element={<Community />} />
        <Route path="outbreaks"      element={<OutbreakDashboard />} />
        <Route path="fields"         element={<FarmFields />} />
        <Route path="analytics"      element={<AdminRoute><Analytics /></AdminRoute>} />
        <Route path="export"         element={<AdminRoute><ExportReports /></AdminRoute>} />
        <Route path="publish"   element={<AdminRoute><PublishAdvisory /></AdminRoute>} />
        <Route path="farmers"   element={<AdminRoute><ManageFarmers /></AdminRoute>} />
        <Route path="admin"     element={<AdminRoute><AdminPanel /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </LanguageProvider>
  );
}
