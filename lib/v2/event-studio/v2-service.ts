import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { getScenarioStudioService, resetScenarioStudioService } from "./scenario-studio-service";
import { resetDraftStore } from "./draft-store";
import { getIntelligencePublishService, resetIntelligencePublishService } from "@/lib/v2/intelligence/publish-service";
import { resetIntelligencePublishStore } from "@/lib/v2/intelligence/publish-store";

export function getV2ScenarioStudio() {
  return getScenarioStudioService(getGameEngine);
}

export function getV2IntelligencePublish() {
  return getIntelligencePublishService(getGameEngine, getV2ScenarioStudio);
}

export function resetV2ScenarioStudio() {
  resetDraftStore({ persist: false });
  resetScenarioStudioService();
  resetIntelligencePublishStore({ persist: false });
  resetIntelligencePublishService();
}
