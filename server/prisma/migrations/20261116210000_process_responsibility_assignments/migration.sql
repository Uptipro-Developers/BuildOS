ALTER TABLE "ApplicationAssignment"
  ADD COLUMN "processId" TEXT,
  ADD COLUMN "processName" TEXT;

CREATE INDEX "ApplicationAssignment_app_processId_userId_status_idx"
  ON "ApplicationAssignment"("app", "processId", "userId", "status");
