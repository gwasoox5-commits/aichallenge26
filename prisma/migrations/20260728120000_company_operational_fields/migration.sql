-- Align BspCompanyOperational with CompanyOperationalState (HR heads, inventory, settlement flags)

ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "headPurchase" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "headProduction" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "headSales" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "purchaseCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "productionCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "salesCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "payrollForecastHalfManwon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "welfareForecastHalfManwon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "inventory" JSONB NOT NULL DEFAULT '{"A":0,"B":0,"C":0,"D":0}';
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "inventoryCostManwon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "finishedGoodsQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "finishedGoodsCostManwon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "unitFinishedGoodsCostManwon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "halfYearProductionQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "halfYearSalesQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "halfYearRevenueManwon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "openBranches" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "openSalesBranches" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "miscIncomeManwon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "netIncomeManwon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "journalsLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "settlementComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "periodOpenFinancials" JSONB;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "lastBalanceSheetValidation" JSONB;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "lastTrialBalanceValidation" JSONB;
ALTER TABLE "BspCompanyOperational" ADD COLUMN IF NOT EXISTS "lastExcelDiffReport" JSONB;
