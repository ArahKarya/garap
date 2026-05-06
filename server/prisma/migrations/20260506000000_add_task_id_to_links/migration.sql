-- Add nullable task_id to links so a link can be attached to a specific task
ALTER TABLE "links" ADD COLUMN "task_id" TEXT;

CREATE INDEX "links_task_id_idx" ON "links"("task_id");

ALTER TABLE "links"
  ADD CONSTRAINT "links_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
