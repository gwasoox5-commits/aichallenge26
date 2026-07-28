/**
 * P8.1 review setup — operational GM state (teams, partial submit, audit entries)
 * Usage: node scripts/p8-review-setup.mjs [baseUrl]
 */
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3018";

async function api(pathname, opts = {}) {
  const res = await fetch(`${BASE}${pathname}`, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  const login = await api("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "bsp-admin-dev" }),
  });

  const session = await api("/api/v1/gm/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${login.accessToken}`,
    },
    body: JSON.stringify({ name: "P8.1 Review Session" }),
  });

  const gmHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.gmAccessToken}`,
  };

  const teams = ["Team-Alpha", "Team-Beta", "Team-Gamma"];
  const joined = [];
  for (const teamName of teams) {
    const j = await api("/api/v1/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: session.joinCode, teamName }),
    });
    joined.push({ teamName, companyId: j.companyId, accessToken: j.accessToken });
  }

  const alpha = joined[0];
  const dash = await fetch(`${BASE}/api/v1/play/companies/${alpha.companyId}/dashboard`, {
    headers: { Authorization: `Bearer ${alpha.accessToken}` },
  }).then((r) => r.json());

  await api(`/api/v1/play/companies/${alpha.companyId}/decisions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${alpha.accessToken}`,
    },
    body: JSON.stringify({
      step: "LOAN",
      payload: {
        loanEarly: 2,
        loanMid: 0,
        deposit: 1,
        loanRepayment: 0,
      },
      companyStatusVersion: dash.statusVersion ?? 0,
    }),
  });

  await api(`/api/v1/gm/sessions/${session.sessionId}/pause`, {
    method: "POST",
    headers: gmHeaders,
    body: JSON.stringify({ reason: "P8.1 캡처 — 토론 시간" }),
  });

  await api(`/api/v1/gm/sessions/${session.sessionId}/resume`, {
    method: "POST",
    headers: gmHeaders,
    body: JSON.stringify({ reason: "P8.1 캡처 — Step 재개" }),
  });

  const audit = await fetch(`${BASE}/api/v1/gm/sessions/${session.sessionId}/audit-log`, {
    headers: { Authorization: `Bearer ${session.gmAccessToken}` },
  }).then((r) => r.json());

  const out = {
    base: BASE,
    sessionId: session.sessionId,
    joinCode: session.joinCode,
    gmAccessToken: session.gmAccessToken,
    adminAccessToken: login.accessToken,
    teams: joined,
    submittedTeam: alpha.teamName,
    auditEntryCount: Array.isArray(audit) ? audit.length : 0,
    createdAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../docs/release/p8-setup-data.json");
  await writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(`P8.1 setup written to ${outPath}`);
  console.log(`Session: ${session.sessionId} · Teams: 3 · Submitted: 1 · Audit: ${out.auditEntryCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
