import type { BspGameStep, CompanyOperationalState } from "../types";

/** D-10 zero / GM force-submit payloads per step */
export function getZeroPayload(step: BspGameStep, state: CompanyOperationalState): unknown {
  switch (step) {
    case "LOAN":
      return { loanEarly: 0, loanMid: 0, deposit: 0, loanRepayment: 0 };
    case "FACILITY":
      return { landPlotsPurchased: 0, machineBigPurchased: 0, machineSmallPurchased: 0 };
    case "HIRING":
      return {
        headPurchase: state.headPurchase,
        headProduction: state.headProduction,
        headSales: state.headSales,
      };
    case "MATERIAL":
      return { lines: [] };
    case "PRODUCTION":
      return { productionQty: 0, machineBigRun: 0, machineSmallRun: 0 };
    case "SALES":
      return { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 0 }] };
    default:
      throw new Error(`No zero payload for step ${step}`);
  }
}
