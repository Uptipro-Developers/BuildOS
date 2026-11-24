ALTER TABLE "Stakeholder" ADD COLUMN "isPartner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Stakeholder" ADD COLUMN "partnerCategory" TEXT;
ALTER TABLE "Stakeholder" ADD COLUMN "partnerTask" TEXT;
ALTER TABLE "Stakeholder" ADD COLUMN "inviteStatus" TEXT NOT NULL DEFAULT 'not_invited';
ALTER TABLE "Stakeholder" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "Stakeholder" ADD COLUMN "partnerUserId" TEXT;
ALTER TABLE "CommunicationLog" ADD COLUMN "partnerId" TEXT;
ALTER TABLE "CommunicationLog" ADD COLUMN "partnerName" TEXT;
CREATE INDEX "CommunicationLog_partnerId_projectId_idx" ON "CommunicationLog"("partnerId", "projectId");
