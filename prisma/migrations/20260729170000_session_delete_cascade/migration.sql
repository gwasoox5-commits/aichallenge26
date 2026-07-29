-- Allow fiscal period cleanup when purging sessions with decisions/progress.
ALTER TABLE "BspGameProgress" DROP CONSTRAINT "BspGameProgress_periodId_fkey";
ALTER TABLE "BspDecision" DROP CONSTRAINT "BspDecision_periodId_fkey";

ALTER TABLE "BspGameProgress"
  ADD CONSTRAINT "BspGameProgress_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "BspFiscalPeriod"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BspDecision"
  ADD CONSTRAINT "BspDecision_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "BspFiscalPeriod"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
