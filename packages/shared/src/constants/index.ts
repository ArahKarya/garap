export const APP_NAME = 'Garap';
export const APP_VERSION = '0.1.0';

export const BRANDING = {
  APP_NAME: 'Garap',
  TAGLINE: 'Tempat menggarap task, project, dan file kerja',
  LEGAL_NAME: 'PT Arah Karya Sinergi',
  COPYRIGHT: '© Garap — Built on ArahKarya by PT Arah Karya Sinergi',
  LOGO_LIGHT: '/icons/icon-arah-bk.png?v=2026060402',
  LOGO_DARK: '/icons/icon-arah-wh.png?v=2026060402',
  LOGO_192: '/icons/icon-192.png?v=2026060402',
  LOGO_512: '/icons/icon-512.png?v=2026060402',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  VIEWER: 'VIEWER',
  /** Pelanggan SaaS biasa (B2C): CRUD penuh atas DATA SENDIRI, tanpa akses admin. */
  MEMBER: 'MEMBER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role default untuk setiap signup publik baru (B2C). User pertama di sistem
 * (platform owner) tetap SUPER_ADMIN; selebihnya MEMBER.
 */
export const DEFAULT_SIGNUP_ROLE: RoleName = ROLES.MEMBER;

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

/**
 * Permission set untuk role MEMBER (pelanggan SaaS B2C): CRUD penuh atas data
 * miliknya sendiri (di-scope `ownerId` di service layer), tanpa permission admin
 * (user/role/audit/job/settings-write/backup-restore).
 */
export const MEMBER_PERMISSIONS: Permission[] = [
  PERMISSIONS.WORKSPACE_READ,
  PERMISSIONS.WORKSPACE_WRITE,
  PERMISSIONS.WORKSPACE_DELETE,
  PERMISSIONS.TASK_READ,
  PERMISSIONS.TASK_WRITE,
  PERMISSIONS.TASK_DELETE,
  PERMISSIONS.PROJECT_READ,
  PERMISSIONS.PROJECT_WRITE,
  PERMISSIONS.PROJECT_DELETE,
  PERMISSIONS.LINK_READ,
  PERMISSIONS.LINK_WRITE,
  PERMISSIONS.LINK_DELETE,
  PERMISSIONS.NOTE_READ,
  PERMISSIONS.NOTE_WRITE,
  PERMISSIONS.NOTE_DELETE,
  PERMISSIONS.DOCUMENT_READ,
  PERMISSIONS.DOCUMENT_WRITE,
  PERMISSIONS.DOCUMENT_DELETE,
  PERMISSIONS.REFERENCE_READ,
  PERMISSIONS.REFERENCE_WRITE,
  PERMISSIONS.REFERENCE_DELETE,
  PERMISSIONS.TAG_READ,
  PERMISSIONS.TAG_WRITE,
  PERMISSIONS.FILE_UPLOAD,
  PERMISSIONS.FILE_DELETE,
  PERMISSIONS.BACKUP_CREATE,
  PERMISSIONS.REPORT_READ,
  PERMISSIONS.REPORT_EXPORT,
  PERMISSIONS.SETTINGS_READ,
];

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

/**
 * Batas paket per-user (anti-abuse untuk signup publik). Saat ini hanya tier FREE
 * (semua user). Nanti saat billing aktif, map ke plan berbayar (limit lebih tinggi).
 * `null` = tak terbatas. Storage dalam MB.
 */
export const PLAN_LIMITS = {
  FREE: {
    workspaces: 10,
    projects: 100,
    tasks: 2000,
    notes: 1000,
    links: 1000,
    documents: 500,
    references: 500,
    storageMb: 500,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
export type QuotaResource = keyof (typeof PLAN_LIMITS)['FREE'];

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
