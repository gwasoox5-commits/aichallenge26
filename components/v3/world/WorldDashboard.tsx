"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventApplyTiming } from "@/src/bsp/domain/events/event-types";
import { authFetch } from "@/lib/bsp/auth-client";
import type {
  DirectorSuggestion,
  WorldEvolutionProposal,
  WorldForecast,
  WorldProfileId,
  WorldSessionRecord,
} from "@/lib/v3/world/types";
import { WORLD_PROFILES } from "@/lib/v3/world/world-profiles";
import { WORLD_UI } from "@/lib/v3/world/world-ui-labels";
import { WorldStatePanel } from "./WorldStatePanel";
import { RiskMapPanel } from "./RiskMapPanel";
import { ForecastPanel } from "./ForecastPanel";
import { AISuggestionsPanel } from "./AISuggestionsPanel";
import { UpcomingEventsPanel } from "./UpcomingEventsPanel";
import { WorldTimelinePanel } from "./WorldTimelinePanel";
import { EventChainGraphPanel } from "./EventChainGraphPanel";

const PROFILES = Object.values(WORLD_PROFILES).filter((p) => p.id !== "CUSTOM");

export function WorldDashboard() {
  const [sessionId, setSessionId] = useState("");
  const [profileId, setProfileId] = useState<WorldProfileId>("STABLE_GROWTH");
  const [world, setWorld] = useState<WorldSessionRecord | null>(null);
  const [forecast, setForecast] = useState<WorldForecast | null>(null);
  const [director, setDirector] = useState<DirectorSuggestion | null>(null);
  const [proposals, setProposals] = useState<WorldEvolutionProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorld = useCallback(async (sid: string) => {
    if (!sid) return;
    const res = await authFetch(`/api/v3/world/sessions/${encodeURIComponent(sid)}/state`);
    if (res.ok) {
      const data = (await res.json()) as { world: WorldSessionRecord | null };
      if (data.world) {
        setWorld(data.world);
        setProfileId(data.world.profileId);
        setProposals(data.world.proposals);
      }
    }
    const fRes = await authFetch(`/api/v3/world/sessions/${encodeURIComponent(sid)}/forecast`);
    if (fRes.ok) {
      const fData = (await fRes.json()) as { forecast: WorldForecast };
      setForecast(fData.forecast);
    }
    const dRes = await authFetch(`/api/v3/world/sessions/${encodeURIComponent(sid)}/director`);
    if (dRes.ok) {
      const dData = (await dRes.json()) as { director: DirectorSuggestion };
      setDirector(dData.director);
    }
    const pRes = await authFetch(`/api/v3/world/sessions/${encodeURIComponent(sid)}/proposals`);
    if (pRes.ok) {
      const pData = (await pRes.json()) as { proposals: WorldEvolutionProposal[] };
      setProposals(pData.proposals);
    }
  }, []);

  useEffect(() => {
    if (sessionId) loadWorld(sessionId);
  }, [sessionId, loadWorld]);

  const initWorld = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/v3/world/sessions/${encodeURIComponent(sessionId)}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!res.ok) throw new Error("World init failed");
      const data = (await res.json()) as { world: WorldSessionRecord };
      setWorld(data.world);
      setProfileId(data.world.profileId);
      await loadWorld(sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "초기화 실패");
    } finally {
      setLoading(false);
    }
  };

  const evolve = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/v3/world/sessions/${encodeURIComponent(sessionId)}/evolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Evolution failed");
      await loadWorld(sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evolution 실패");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (proposalId: string) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await authFetch(`/api/v3/world/proposals/${proposalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, reason: "GM approved world proposal" }),
      });
      await loadWorld(sessionId);
    } finally {
      setLoading(false);
    }
  };

  const publish = async (proposalId: string, applyTiming: EventApplyTiming) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await authFetch(`/api/v3/world/proposals/${proposalId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          applyTiming,
          reason: "V3 World proposal publish",
        }),
      });
      await loadWorld(sessionId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">V3.0 {WORLD_UI.pageTitle} Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          살아있는 경제 세계 — GM 설정 · {WORLD_UI.evolveButton} · Event Chain · V2.4 Publish
        </p>
      </header>

      <div className="flex flex-wrap gap-3 items-end rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="text-sm">
          <span className="text-slate-600">Session ID</span>
          <input
            className="mt-1 block w-64 rounded border border-slate-300 p-2 text-sm"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="GM session ID"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">{WORLD_UI.profile}</span>
          <select
            className="mt-1 block rounded border border-slate-300 p-2 text-sm"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value as WorldProfileId)}
          >
            {PROFILES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={loading || !sessionId}
          onClick={initWorld}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {WORLD_UI.initButton}
        </button>
        {world && (
          <button
            type="button"
            disabled={loading}
            onClick={evolve}
            className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            {WORLD_UI.evolveButton}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {world && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <WorldStatePanel dimensions={world.currentState.dimensions} />
            <RiskMapPanel
              regions={world.currentState.regions}
              industries={world.currentState.industries}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AISuggestionsPanel director={director} />
            <ForecastPanel forecast={forecast} />
          </div>

          <UpcomingEventsPanel
            proposals={proposals}
            onApprove={approve}
            onPublish={publish}
            loading={loading}
          />

          <EventChainGraphPanel chains={world.activeChains} />
          <WorldTimelinePanel timeline={world.timeline} />

          <p className="text-xs text-slate-400">
            Seed: {world.randomSeed} · Profile: {world.profileId} · Focus: {world.educationalBalance.focusAreas.join(", ") || "균형"}
          </p>
        </>
      )}

      {!world && sessionId && (
        <p className="text-sm text-slate-500">
          {WORLD_UI.profile}을 선택하고 &quot;{WORLD_UI.initButton}&quot;을 클릭하세요.
        </p>
      )}
    </div>
  );
}
