import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { FullPageLoader } from './components/common/FullPageLoader';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Every page below is split into its own chunk, so the landing page (and each
// dashboard tab) only downloads the code it actually needs.
const Login = lazy(() => import('./pages/Login'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ServerSelect = lazy(() => import('./pages/ServerSelect'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Updates = lazy(() => import('./pages/Updates'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Review = lazy(() => import('./pages/Review'));
const Overview = lazy(() => import('./pages/dashboard/Overview'));
const Welcome = lazy(() => import('./pages/dashboard/Welcome'));
const Moderation = lazy(() => import('./pages/dashboard/Moderation'));
const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const Leveling = lazy(() => import('./pages/dashboard/Leveling'));
const RoleMenus = lazy(() => import('./pages/dashboard/RoleMenus'));
const Logs = lazy(() => import('./pages/dashboard/Logs'));
const Premium = lazy(() => import('./pages/dashboard/Premium'));
const PremiumInfo = lazy(() => import('./pages/PremiumInfo'));
const Panels = lazy(() => import('./pages/dashboard/Panels'));
const Applications = lazy(() => import('./pages/dashboard/Applications'));
const Tickets = lazy(() => import('./pages/dashboard/Tickets'));
const Giveaways = lazy(() => import('./pages/dashboard/Giveaways'));
const Templates = lazy(() => import('./pages/dashboard/Templates'));
const Socials = lazy(() => import('./pages/dashboard/Socials'));
const UserStats = lazy(() => import('./pages/dashboard/UserStats'));
const Automod = lazy(() => import('./pages/dashboard/Automod'));
const Commands = lazy(() => import('./pages/dashboard/Commands'));

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/updates" element={<Updates />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/review" element={<Review />} />
        <Route path="/premium" element={<PremiumInfo />} />
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
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
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
          {/* The old Server page was split into Settings (autorole) and Role Menus. */}
          <Route path="server" element={<Navigate to="../rolemenus" replace />} />
          <Route path="leveling" element={<Leveling />} />
          <Route path="rolemenus" element={<RoleMenus />} />
          <Route path="logs" element={<Logs />} />
          <Route path="premium" element={<Premium />} />
          <Route path="panels" element={<Panels />} />
          <Route path="applications" element={<Applications />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="giveaways" element={<Giveaways />} />
          <Route path="templates" element={<Templates />} />
          <Route path="socials" element={<Socials />} />
          <Route path="stats" element={<UserStats />} />
          <Route path="automod" element={<Automod />} />
          <Route path="commands" element={<Commands />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
