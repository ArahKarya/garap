import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/auth';

// Eagerly load pages reachable on first paint after auth (Dashboard) so the
// initial render is instant. Everything else is split into route chunks.
import { DashboardPage } from './pages/DashboardPage';

// Route-level lazy chunks — Vite emits one .js per entry, drastically
// reducing the initial bundle. Heavy deps (marked, dompurify, dnd-kit) only
// download when their respective routes are visited.
const SharePage = lazy(() => import('./pages/SharePage').then((m) => ({ default: m.SharePage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then((m) => ({ default: m.TasksPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const LinksPage = lazy(() => import('./pages/LinksPage').then((m) => ({ default: m.LinksPage })));
const NotesPage = lazy(() => import('./pages/NotesPage').then((m) => ({ default: m.NotesPage })));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const ReferencesPage = lazy(() => import('./pages/ReferencesPage').then((m) => ({ default: m.ReferencesPage })));
const WorkspacesPage = lazy(() => import('./pages/WorkspacesPage').then((m) => ({ default: m.WorkspacesPage })));
const TagsPage = lazy(() => import('./pages/TagsPage').then((m) => ({ default: m.TagsPage })));
const TagDetailPage = lazy(() => import('./pages/TagDetailPage').then((m) => ({ default: m.TagDetailPage })));
const TrashPage = lazy(() => import('./pages/TrashPage').then((m) => ({ default: m.TrashPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const BillingPage = lazy(() => import('./pages/BillingPage').then((m) => ({ default: m.BillingPage })));

// Public marketing + legal pages — reachable without auth, lazy-loaded.
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
);

/**
 * Root path `/`: public landing for guests, but logged-in users are sent
 * straight into the app at `/tasks`. Keeps the marketing page out of the
 * authenticated AppLayout shell.
 */
function RootIndex() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/tasks" replace />;
  return (
    <Suspense fallback={<PageFallback />}>
      <LandingPage />
    </Suspense>
  );
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Public marketing + legal — no auth, outside AppLayout/ProtectedRoute */}
      <Route index element={<RootIndex />} />
      <Route
        path="/terms"
        element={
          <Suspense fallback={<PageFallback />}>
            <TermsPage />
          </Suspense>
        }
      />
      <Route
        path="/privacy"
        element={
          <Suspense fallback={<PageFallback />}>
            <PrivacyPage />
          </Suspense>
        }
      />
      <Route
        path="/verify-email"
        element={
          <Suspense fallback={<PageFallback />}>
            <VerifyEmailPage />
          </Suspense>
        }
      />
      <Route
        path="/share"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageFallback />}>
              <SharePage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="calendar"
          element={
            <Suspense fallback={<PageFallback />}>
              <CalendarPage />
            </Suspense>
          }
        />
        <Route
          path="tasks"
          element={
            <Suspense fallback={<PageFallback />}>
              <TasksPage />
            </Suspense>
          }
        />
        <Route
          path="projects"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProjectsPage />
            </Suspense>
          }
        />
        <Route
          path="projects/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProjectDetailPage />
            </Suspense>
          }
        />
        <Route
          path="links"
          element={
            <Suspense fallback={<PageFallback />}>
              <LinksPage />
            </Suspense>
          }
        />
        <Route
          path="notes"
          element={
            <Suspense fallback={<PageFallback />}>
              <NotesPage />
            </Suspense>
          }
        />
        <Route
          path="documents"
          element={
            <Suspense fallback={<PageFallback />}>
              <DocumentsPage />
            </Suspense>
          }
        />
        <Route
          path="references"
          element={
            <Suspense fallback={<PageFallback />}>
              <ReferencesPage />
            </Suspense>
          }
        />
        <Route
          path="workspaces"
          element={
            <Suspense fallback={<PageFallback />}>
              <WorkspacesPage />
            </Suspense>
          }
        />
        <Route
          path="tags"
          element={
            <Suspense fallback={<PageFallback />}>
              <TagsPage />
            </Suspense>
          }
        />
        <Route
          path="tags/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <TagDetailPage />
            </Suspense>
          }
        />
        <Route
          path="search"
          element={
            <Suspense fallback={<PageFallback />}>
              <SearchPage />
            </Suspense>
          }
        />
        <Route
          path="trash"
          element={
            <Suspense fallback={<PageFallback />}>
              <TrashPage />
            </Suspense>
          }
        />
        <Route
          path="users"
          element={
            <Suspense fallback={<PageFallback />}>
              <UsersPage />
            </Suspense>
          }
        />
        <Route
          path="audit-logs"
          element={
            <Suspense fallback={<PageFallback />}>
              <AuditLogPage />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<PageFallback />}>
              <SettingsPage />
            </Suspense>
          }
        />
        <Route
          path="billing"
          element={
            <Suspense fallback={<PageFallback />}>
              <BillingPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
