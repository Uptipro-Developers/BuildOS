-- CreateTable: Project Types (Settings) as real reference data, not a JSON
-- blob on ConstructionSetting — same reasoning that gave MaterialCategory/
-- MaterialType their own tables.
CREATE TABLE "ProjectSector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSector_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectSector_name_key" ON "ProjectSector"("name");

CREATE TABLE "ProjectCategory" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "descriptorMode" TEXT NOT NULL DEFAULT 'free_text',
    "descriptorOptions" JSONB NOT NULL DEFAULT '[]',
    "structureHeaderLabel" TEXT,
    "structureDescription" TEXT,
    "structureFields" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectCategory_sectorId_idx" ON "ProjectCategory"("sectorId");

ALTER TABLE "ProjectCategory" ADD CONSTRAINT "ProjectCategory_sectorId_fkey"
    FOREIGN KEY ("sectorId") REFERENCES "ProjectSector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
