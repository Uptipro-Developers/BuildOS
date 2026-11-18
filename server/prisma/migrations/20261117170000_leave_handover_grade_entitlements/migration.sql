ALTER TABLE "LeaveType" ADD COLUMN "gradeEntitlements" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "LeaveRequest" ADD COLUMN "handoverEmployeeId" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN "handoverEmployeeName" TEXT;
CREATE INDEX "LeaveRequest_handoverEmployeeId_idx" ON "LeaveRequest"("handoverEmployeeId");
