import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { rolesRouter } from '../modules/roles/roles.routes.js';
import { auditRouter } from '../modules/audit/audit.routes.js';
import { settingsRouter } from '../modules/settings/settings.routes.js';
import { notificationsRouter } from '../modules/notifications/notifications.routes.js';
import { healthRouter } from '../modules/health/health.routes.js';
// Garap domain routers
import { workspacesRouter } from '../modules/workspaces/workspaces.routes.js';
import { tasksRouter } from '../modules/tasks/tasks.routes.js';
import { projectsRouter } from '../modules/projects/projects.routes.js';
import { linksRouter } from '../modules/links/links.routes.js';
import { tagsRouter } from '../modules/tags/tags.routes.js';
import { notesRouter } from '../modules/notes/notes.routes.js';
import { documentsRouter } from '../modules/documents/documents.routes.js';
import { referencesRouter } from '../modules/references/references.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { searchRouter } from '../modules/search/search.routes.js';
import { backupRouter } from '../modules/backup/backup.routes.js';
import { billingRouter } from '../modules/billing/billing.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/roles', rolesRouter);
apiRouter.use('/audit-logs', auditRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/notifications', notificationsRouter);
// ─── Garap domain ────────────────────────────────────────────────
apiRouter.use('/workspaces', workspacesRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/links', linksRouter);
apiRouter.use('/tags', tagsRouter);
apiRouter.use('/notes', notesRouter);
apiRouter.use('/documents', documentsRouter);
apiRouter.use('/references', referencesRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/backup', backupRouter);
apiRouter.use('/billing', billingRouter);
