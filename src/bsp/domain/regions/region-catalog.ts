export type RegionCode =
  | "EUROPE"
  | "ASIA"
  | "MIDDLE_EAST"
  | "AFRICA"
  | "OCEANIA"
  | "NORTH_AMERICA"
  | "SOUTH_AMERICA";

export interface RegionMaster {
  code: RegionCode;
  displayName: string;
  branchSetupFeeManwon: number;
  materialUnitPriceManwon: number;
  materialLimit: number;
  salesSetupFeeManwon: number;
  maxSalePriceManwon: number;
  saleLimit: number;
  importWeighted: boolean;
}

/** Rule Book §1.5 — seven regions (만원) */
export const REGION_CATALOG: RegionMaster[] = [
  {
    code: "EUROPE",
    displayName: "유럽",
    branchSetupFeeManwon: 500,
    materialUnitPriceManwon: 24,
    materialLimit: 300,
    salesSetupFeeManwon: 500,
    maxSalePriceManwon: 200,
    saleLimit: 50,
    importWeighted: true,
  },
  {
    code: "ASIA",
    displayName: "아시아",
    branchSetupFeeManwon: 300,
    materialUnitPriceManwon: 12,
    materialLimit: 600,
    salesSetupFeeManwon: 300,
    maxSalePriceManwon: 150,
    saleLimit: 100,
    importWeighted: false,
  },
  {
    code: "MIDDLE_EAST",
    displayName: "중동",
    branchSetupFeeManwon: 150,
    materialUnitPriceManwon: 15,
    materialLimit: 400,
    salesSetupFeeManwon: 150,
    maxSalePriceManwon: 120,
    saleLimit: 40,
    importWeighted: false,
  },
  {
    code: "AFRICA",
    displayName: "아프리카",
    branchSetupFeeManwon: 100,
    materialUnitPriceManwon: 10,
    materialLimit: 500,
    salesSetupFeeManwon: 100,
    maxSalePriceManwon: 100,
    saleLimit: 30,
    importWeighted: false,
  },
  {
    code: "OCEANIA",
    displayName: "오세아니아",
    branchSetupFeeManwon: 150,
    materialUnitPriceManwon: 18,
    materialLimit: 300,
    salesSetupFeeManwon: 150,
    maxSalePriceManwon: 150,
    saleLimit: 40,
    importWeighted: false,
  },
  {
    code: "NORTH_AMERICA",
    displayName: "북미",
    branchSetupFeeManwon: 500,
    materialUnitPriceManwon: 21,
    materialLimit: 500,
    salesSetupFeeManwon: 500,
    maxSalePriceManwon: 180,
    saleLimit: 100,
    importWeighted: true,
  },
  {
    code: "SOUTH_AMERICA",
    displayName: "남미",
    branchSetupFeeManwon: 200,
    materialUnitPriceManwon: 16,
    materialLimit: 300,
    salesSetupFeeManwon: 200,
    maxSalePriceManwon: 140,
    saleLimit: 50,
    importWeighted: false,
  },
];

export function getRegion(code: RegionCode): RegionMaster {
  const region = REGION_CATALOG.find((r) => r.code === code);
  if (!region) throw new Error(`Unknown region: ${code}`);
  return region;
}

export function isRegionCode(value: string): value is RegionCode {
  return REGION_CATALOG.some((r) => r.code === value);
}
