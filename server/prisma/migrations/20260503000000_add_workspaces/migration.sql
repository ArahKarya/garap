-- ─── Add workspaces table ──────────────────────────────────────────────────
CREATE TABLE "workspaces" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "icon" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "archived_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspaces_owner_id_name_key" ON "workspaces"("owner_id", "name");
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");
CREATE INDEX "workspaces_deleted_at_idx" ON "workspaces"("deleted_at");

ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Add workspace_id to projects (nullable initially for backfill) ────────
ALTER TABLE "projects" ADD COLUMN "workspace_id" TEXT;

-- ─── Backfill: create one default "Personal" workspace per project owner ──
-- Use distinct owner_id from existing projects to seed workspaces.
INSERT INTO "workspaces" ("id", "owner_id", "name", "description", "is_default", "sort_order", "created_at", "updated_at")
SELECT
  'ws_' || substr(md5(random()::text || p.owner_id), 1, 21) AS id,
  p.owner_id,
  'Personal',
  'Workspace default',
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (SELECT DISTINCT owner_id FROM "projects") p
ON CONFLICT ("owner_id", "name") DO NOTHING;

-- Assign each project to its owner's default workspace.
UPDATE "projects" p
SET "workspace_id" = w."id"
FROM "workspaces" w
WHERE w."owner_id" = p."owner_id"
  AND w."is_default" = true
  AND p."workspace_id" IS NULL;

-- ─── Enforce NOT NULL on workspace_id ─────────────────────────────────────
ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET NOT NULL;

-- ─── Index + FK on projects.workspace_id ──────────────────────────────────
CREATE INDEX "projects_workspace_id_idx" ON "projects"("workspace_id");

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
