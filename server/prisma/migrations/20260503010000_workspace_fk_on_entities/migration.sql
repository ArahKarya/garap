-- ─── Workspace FK on Task/Link/Note/Document ──────────────────────────────
-- Add workspace_id column (nullable for backfill), then assign:
--   1) From project.workspace_id when project_id is set
--   2) From owner's default workspace when project_id is NULL
-- Then enforce NOT NULL + add FK + indexes.

-- 1. Add nullable columns + composite index for workspace+isDefault lookup
ALTER TABLE "tasks"     ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "links"     ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "notes"     ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "documents" ADD COLUMN "workspace_id" TEXT;

CREATE INDEX "workspaces_owner_id_is_default_idx"
  ON "workspaces"("owner_id", "is_default");

-- 2. Backfill from project when present
UPDATE "tasks" t
   SET "workspace_id" = p."workspace_id"
  FROM "projects" p
 WHERE t."project_id" = p."id" AND t."workspace_id" IS NULL;

UPDATE "links" l
   SET "workspace_id" = p."workspace_id"
  FROM "projects" p
 WHERE l."project_id" = p."id" AND l."workspace_id" IS NULL;

UPDATE "notes" n
   SET "workspace_id" = p."workspace_id"
  FROM "projects" p
 WHERE n."project_id" = p."id" AND n."workspace_id" IS NULL;

UPDATE "documents" d
   SET "workspace_id" = p."workspace_id"
  FROM "projects" p
 WHERE d."project_id" = p."id" AND d."workspace_id" IS NULL;

-- 3. Backfill orphans (no project) from owner's default workspace
UPDATE "tasks" t
   SET "workspace_id" = w."id"
  FROM "workspaces" w
 WHERE t."workspace_id" IS NULL
   AND w."owner_id" = t."owner_id"
   AND w."is_default" = true
   AND w."deleted_at" IS NULL;

UPDATE "links" l
   SET "workspace_id" = w."id"
  FROM "workspaces" w
 WHERE l."workspace_id" IS NULL
   AND w."owner_id" = l."owner_id"
   AND w."is_default" = true
   AND w."deleted_at" IS NULL;

UPDATE "notes" n
   SET "workspace_id" = w."id"
  FROM "workspaces" w
 WHERE n."workspace_id" IS NULL
   AND w."owner_id" = n."owner_id"
   AND w."is_default" = true
   AND w."deleted_at" IS NULL;

UPDATE "documents" d
   SET "workspace_id" = w."id"
  FROM "workspaces" w
 WHERE d."workspace_id" IS NULL
   AND w."owner_id" = d."owner_id"
   AND w."is_default" = true
   AND w."deleted_at" IS NULL;

-- 4. Safety: any remaining NULLs (no default workspace?) — create one
INSERT INTO "workspaces" ("id", "owner_id", "name", "description", "is_default", "sort_order", "created_at", "updated_at")
SELECT
  'ws_' || encode(sha256(t."owner_id"::bytea), 'hex'),
  t."owner_id",
  'Personal',
  'Workspace default (auto)',
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT owner_id FROM (
    SELECT owner_id FROM "tasks"     WHERE "workspace_id" IS NULL
    UNION SELECT owner_id FROM "links"     WHERE "workspace_id" IS NULL
    UNION SELECT owner_id FROM "notes"     WHERE "workspace_id" IS NULL
    UNION SELECT owner_id FROM "documents" WHERE "workspace_id" IS NULL
  ) sub
) t
ON CONFLICT ("owner_id", "name") DO NOTHING;

UPDATE "tasks" t
   SET "workspace_id" = w."id"
  FROM "workspaces" w
 WHERE t."workspace_id" IS NULL
   AND w."owner_id" = t."owner_id"
   AND w."is_default" = true;

UPDATE "links" l
   SET "workspace_id" = w."id"
  FROM "workspaces" w
 WHERE l."workspace_id" IS NULL
   AND w."owner_id" = l."owner_id"
   AND w."is_default" = true;

UPDATE "notes" n
   SET "workspace_id" = w."id"
  FROM "workspaces" w
 WHERE n."workspace_id" IS NULL
   AND w."owner_id" = n."owner_id"
   AND w."is_default" = true;

UPDATE "documents" d
   SET "workspace_id" = w."id"
  FROM "workspaces" w
 WHERE d."workspace_id" IS NULL
   AND w."owner_id" = d."owner_id"
   AND w."is_default" = true;

-- 5. Enforce NOT NULL
ALTER TABLE "tasks"     ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "links"     ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "notes"     ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "workspace_id" SET NOT NULL;

-- 6. Add FKs (RESTRICT so workspace can't be hard-deleted with live data)
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "links"
  ADD CONSTRAINT "links_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notes"
  ADD CONSTRAINT "notes_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Indexes for the new column + composite for the hot path
CREATE INDEX "tasks_workspace_id_idx"     ON "tasks"("workspace_id");
CREATE INDEX "links_workspace_id_idx"     ON "links"("workspace_id");
CREATE INDEX "notes_workspace_id_idx"     ON "notes"("workspace_id");
CREATE INDEX "documents_workspace_id_idx" ON "documents"("workspace_id");

CREATE INDEX "tasks_owner_workspace_idx"     ON "tasks"("owner_id", "workspace_id");
CREATE INDEX "links_owner_workspace_idx"     ON "links"("owner_id", "workspace_id");
CREATE INDEX "notes_owner_workspace_idx"     ON "notes"("owner_id", "workspace_id");
CREATE INDEX "documents_owner_workspace_idx" ON "documents"("owner_id", "workspace_id");

CREATE INDEX "tasks_owner_project_idx"     ON "tasks"("owner_id", "project_id");
CREATE INDEX "links_owner_project_idx"     ON "links"("owner_id", "project_id");
CREATE INDEX "notes_owner_project_idx"     ON "notes"("owner_id", "project_id");
CREATE INDEX "documents_owner_project_idx" ON "documents"("owner_id", "project_id");
