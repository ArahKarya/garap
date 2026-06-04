export const APP_NAME = 'Garap';
export const APP_VERSION = '0.1.0';

export const BRANDING = {
  APP_NAME: 'Garap',
  TAGLINE: 'Tempat menggarap task, project, dan file kerja',
  LEGAL_NAME: 'PT Arah Karya Sinergi',
  COPYRIGHT: '© Garap — Built on ArahKarya by PT Arah Karya Sinergi',
  LOGO_LIGHT: '/icons/icon-arah-bk.png?v=2026051901',
  LOGO_DARK: '/icons/icon-arah-wh.png?v=2026051901',
  LOGO_192: '/icons/icon-192.png?v=2026051901',
  LOGO_512: '/icons/icon-512.png?v=2026051901',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  VIEWER: 'VIEWER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  ROLE_READ: 'role:read',
  ROLE_WRITE: 'role:write',
  AUDIT_READ: 'audit:read',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  FILE_UPLOAD: 'file:upload',
  FILE_DELETE: 'file:delete',
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  REPORT_READ: 'report:read',
  REPORT_EXPORT: 'report:export',
  JOB_READ: 'job:read',
  JOB_MANAGE: 'job:manage',
  // Domain permissions for Panggon Mikir
  WORKSPACE_READ: 'workspace:read',
  WORKSPACE_WRITE: 'workspace:write',
  WORKSPACE_DELETE: 'workspace:delete',
  TASK_READ: 'task:read',
  TASK_WRITE: 'task:write',
  TASK_DELETE: 'task:delete',
  PROJECT_READ: 'project:read',
  PROJECT_WRITE: 'project:write',
  PROJECT_DELETE: 'project:delete',
  LINK_READ: 'link:read',
  LINK_WRITE: 'link:write',
  LINK_DELETE: 'link:delete',
  TAG_READ: 'tag:read',
  TAG_WRITE: 'tag:write',
  NOTE_READ: 'note:read',
  NOTE_WRITE: 'note:write',
  NOTE_DELETE: 'note:delete',
  DOCUMENT_READ: 'document:read',
  DOCUMENT_WRITE: 'document:write',
  DOCUMENT_DELETE: 'document:delete',
  REFERENCE_READ: 'reference:read',
  REFERENCE_WRITE: 'reference:write',
  REFERENCE_DELETE: 'reference:delete',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const JOB_QUEUES = {
  EMAIL: 'email',
  EXPORT: 'export',
  REPORT: 'report',
  NOTIFICATION: 'notification',
  CLEANUP: 'cleanup',
  // Panggon Mikir domain queues
  LINK_HEALTH: 'link-health',
  REMINDER: 'reminder',
} as const;

export type JobQueueName = (typeof JOB_QUEUES)[keyof typeof JOB_QUEUES];

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  BACKUP: 'BACKUP',
  RESTORE: 'RESTORE',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// Panggon Mikir domain enums (mirrors Prisma enums)
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// Recurrence presets — kept simple (no full RRULE) to dodge UX/parser
// complexity. When a recurring task is marked DONE, the server creates a
// new instance with `dueDate` shifted by this preset.
export const TASK_RECURRENCES = ['daily', 'weekdays', 'weekly', 'monthly'] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

export const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  daily: 'Setiap hari',
  weekdays: 'Hari kerja (Sen–Jum)',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
};

export const PROJECT_STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const LINK_PLATFORMS = [
  'GOOGLE_DRIVE',
  'GITHUB',
  'FIGMA',
  'NOTION',
  'YOUTUBE',
  'GENERIC',
] as const;
export type LinkPlatform = (typeof LINK_PLATFORMS)[number];

export const TAGGABLE_ENTITIES = ['TASK', 'PROJECT', 'LINK', 'NOTE', 'DOCUMENT', 'REFERENCE'] as const;
export type TaggableEntity = (typeof TAGGABLE_ENTITIES)[number];

export const REFERENCE_TYPES = [
  'BOOK',
  'JOURNAL_ARTICLE',
  'CONFERENCE_PAPER',
  'THESIS',
  'BOOK_CHAPTER',
  'REPORT',
  'WEBSITE',
  'PREPRINT',
  'OTHER',
] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  BOOK: 'Buku',
  JOURNAL_ARTICLE: 'Artikel Jurnal',
  CONFERENCE_PAPER: 'Paper Konferensi',
  THESIS: 'Skripsi/Tesis/Disertasi',
  BOOK_CHAPTER: 'Bab Buku',
  REPORT: 'Laporan',
  WEBSITE: 'Website',
  PREPRINT: 'Preprint',
  OTHER: 'Lainnya',
};
