-- Persist the Trade Types and Report Settings sections of Construction Settings.
--
-- Both sections were fully editable in the UI but were never part of the saved
-- payload and had no column to land in, so every change to them was discarded
-- the moment the page reloaded.

ALTER TABLE "ConstructionSetting"
  ADD COLUMN IF NOT EXISTS "tradeTypes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "reportSettings" JSONB NOT NULL DEFAULT '[]';
