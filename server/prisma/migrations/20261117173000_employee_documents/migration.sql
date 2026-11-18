ALTER TABLE "DocumentUpload" ADD COLUMN "employeeId" TEXT;
CREATE INDEX "DocumentUpload_employeeId_idx" ON "DocumentUpload"("employeeId");
