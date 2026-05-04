-- Reference type enum
CREATE TYPE "ReferenceType" AS ENUM (
  'BOOK',
  'JOURNAL_ARTICLE',
  'CONFERENCE_PAPER',
  'THESIS',
  'BOOK_CHAPTER',
  'REPORT',
  'WEBSITE',
  'PREPRINT',
  'OTHER'
);

-- Add REFERENCE to TaggableEntity enum
ALTER TYPE "TaggableEntity" ADD VALUE 'REFERENCE';

-- References table
CREATE TABLE "references" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "project_id" TEXT,
  "type" "ReferenceType" NOT NULL DEFAULT 'JOURNAL_ARTICLE',
  "title" TEXT NOT NULL,
  "authors" TEXT,
  "year" INTEGER,
  "source" TEXT,
  "volume" TEXT,
  "issue" TEXT,
  "pages" TEXT,
  "doi" TEXT,
  "isbn" TEXT,
  "url" TEXT,
  "abstract" TEXT,
  "notes" TEXT,
  "citation" TEXT,
  "file_upload_id" TEXT,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "references_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "references_file_upload_id_key" ON "references"("file_upload_id");
CREATE INDEX "references_owner_id_workspace_id_idx" ON "references"("owner_id", "workspace_id");
CREATE INDEX "references_owner_id_project_id_idx" ON "references"("owner_id", "project_id");
CREATE INDEX "references_workspace_id_idx" ON "references"("workspace_id");
CREATE INDEX "references_project_id_idx" ON "references"("project_id");
CREATE INDEX "references_type_idx" ON "references"("type");
CREATE INDEX "references_year_idx" ON "references"("year");
CREATE INDEX "references_deleted_at_idx" ON "references"("deleted_at");

ALTER TABLE "references"
  ADD CONSTRAINT "references_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "references"
  ADD CONSTRAINT "references_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "references"
  ADD CONSTRAINT "references_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
