ALTER TABLE "AttendanceRecord" ADD COLUMN "projectId" TEXT;
ALTER TABLE "AttendanceRecord" ADD COLUMN "projectName" TEXT;
ALTER TABLE "AttendanceRecord" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'hr';
ALTER TABLE "AttendanceRecord" ADD COLUMN "partnerId" TEXT;
ALTER TABLE "AttendanceRecord" ADD COLUMN "partnerName" TEXT;
CREATE INDEX "AttendanceRecord_projectId_date_idx" ON "AttendanceRecord"("projectId", "date");
CREATE INDEX "AttendanceRecord_partnerId_date_idx" ON "AttendanceRecord"("partnerId", "date");
