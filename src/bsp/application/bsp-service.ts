import { getBspContainer } from "./di/container";

export function getGameEngine() {
  return getBspContainer().gameEngine;
}

export function getDashboardService() {
  return getBspContainer().dashboardService;
}

export { BspError } from "./game-engine";
export { listPresets, GAME_CONSTANTS } from "./game-engine";
