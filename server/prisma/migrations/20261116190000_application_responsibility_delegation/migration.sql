CREATE TABLE "ApplicationOwner" (
  "id" TEXT NOT NULL,
  "app" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "appointedById" TEXT,
  "canConfigure" BOOLEAN NOT NULL DEFAULT true,
  "canAssign" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationOwner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationAssignment" (
  "id" TEXT NOT NULL,
  "app" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "scopeId" TEXT,
  "scopeName" TEXT,
  "responsibility" TEXT,
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "assignedById" TEXT,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationOwner_app_userId_key" ON "ApplicationOwner"("app", "userId");
CREATE INDEX "ApplicationOwner_app_active_idx" ON "ApplicationOwner"("app", "active");
CREATE INDEX "ApplicationAssignment_app_userId_status_idx" ON "ApplicationAssignment"("app", "userId", "status");
CREATE INDEX "ApplicationAssignment_app_scopeType_scopeId_status_idx" ON "ApplicationAssignment"("app", "scopeType", "scopeId", "status");

ALTER TABLE "ApplicationOwner" ADD CONSTRAINT "ApplicationOwner_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationOwner" ADD CONSTRAINT "ApplicationOwner_appointedById_fkey"
  FOREIGN KEY ("appointedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApplicationAssignment" ADD CONSTRAINT "ApplicationAssignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationAssignment" ADD CONSTRAINT "ApplicationAssignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
