import { Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ServerSelect from './pages/ServerSelect';
import NotFound from './pages/NotFound';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import Welcome from './pages/dashboard/Welcome';
import Moderation from './pages/dashboard/Moderation';
import Analytics from './pages/dashboard/Analytics';
import Settings from './pages/dashboard/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/servers"
        element={
          <ProtectedRoute>
            <ServerSelect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/:guildId"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
