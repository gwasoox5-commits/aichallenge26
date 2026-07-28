-- Session Wizard persistence (step duration, max periods, wizard metadata)
ALTER TABLE "BspGameSession" ADD COLUMN IF NOT EXISTS "stepDurationSec" INTEGER NOT NULL DEFAULT 900;
ALTER TABLE "BspGameSession" ADD COLUMN IF NOT EXISTS "maxPeriodIndex" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "BspGameSession" ADD COLUMN IF NOT EXISTS "economyPresetId" TEXT;
ALTER TABLE "BspGameSession" ADD COLUMN IF NOT EXISTS "wizardMeta" JSONB;
