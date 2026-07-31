-- Per-module reference numbering, moved out of the client-side React context that
-- lost every configuration change and every allocated number on reload.
--
-- IF NOT EXISTS so this is safe to re-run against a database where an earlier
-- partial apply already created the table.
CREATE TABLE IF NOT EXISTS "NumberingConfig" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "separator" TEXT NOT NULL DEFAULT '-',
    "padLength" INTEGER NOT NULL DEFAULT 3,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberingConfig_pkey" PRIMARY KEY ("id")
);

-- The unique module is what lets allocation be a single atomic UPDATE.
CREATE UNIQUE INDEX IF NOT EXISTS "NumberingConfig_module_key" ON "NumberingConfig"("module");
CREATE INDEX IF NOT EXISTS "NumberingConfig_app_idx" ON "NumberingConfig"("app");
