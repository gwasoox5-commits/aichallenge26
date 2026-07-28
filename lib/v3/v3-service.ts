import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { getWorldSimulationService, resetWorldSimulationService } from "./world/world-simulation-service";
import { resetWorldStore } from "./world/world-store";

export function getV3WorldSimulation() {
  return getWorldSimulationService(getGameEngine);
}

export function resetV3WorldSimulation() {
  resetWorldStore({ persist: false });
  resetWorldSimulationService();
}
