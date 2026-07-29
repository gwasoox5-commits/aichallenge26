import type { Server as HttpServer, IncomingMessage } from "http";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "../auth/token-service";
import type { AuthContext } from "../../domain/auth/types";
import {
  REALTIME_HEARTBEAT_MS,
  REALTIME_PONG_TIMEOUT_MS,
  REALTIME_WS_PATH,
  type RealtimeClientMessage,
  type RealtimeEventEnvelope,
  type RealtimeServerMessage,
  type RealtimeSyncHint,
} from "../../domain/realtime/realtime-event-types";

interface ClientConn {
  id: string;
  ws: WebSocket;
  auth: AuthContext;
  sessionId: string;
  lastPongAt: number;
  pongTimer?: ReturnType<typeof setTimeout>;
  duplicateKey: string;
}

export interface RealtimeHubStats {
  sessions: number;
  connections: number;
  eventsSent: number;
}

export class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private readonly bySession = new Map<string, Set<ClientConn>>();
  private readonly byDuplicateKey = new Map<string, ClientConn>();
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private eventsSent = 0;

  attach(server: HttpServer) {
    if (this.wss) return this;
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (url.pathname !== REALTIME_WS_PATH) return;
      this.wss!.handleUpgrade(req, socket, head, (ws) => {
        this.wss!.emit("connection", ws, req);
      });
    });

    this.wss.on("connection", (ws, req) => this.onConnection(ws, req));
    this.heartbeatTimer = setInterval(() => this.tickHeartbeat(), REALTIME_HEARTBEAT_MS);
    return this;
  }

  /** Standalone listen for tests */
  listen(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer((_req, res) => {
        res.writeHead(404);
        res.end();
      });
      this.attach(server);
      server.listen(port, () => {
        const addr = server.address();
        const resolved = typeof addr === "object" && addr ? addr.port : port;
        resolve(resolved);
      });
      server.on("error", reject);
    });
  }

  close() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const set of this.bySession.values()) {
      for (const c of set) {
        c.ws.close();
      }
    }
    this.bySession.clear();
    this.byDuplicateKey.clear();
    this.wss?.close();
    this.wss = null;
  }

  disconnectSession(sessionId: string) {
    const clients = this.bySession.get(sessionId);
    if (!clients) return;
    for (const conn of [...clients]) {
      conn.ws.close(4003, "Session deleted");
      this.removeClient(conn);
    }
  }

  broadcast(sessionId: string, event: Omit<RealtimeEventEnvelope, "eventId">) {
    const envelope: RealtimeEventEnvelope = {
      ...event,
      eventId: crypto.randomUUID(),
    };
    const clients = this.bySession.get(sessionId);
    if (!clients?.size) return envelope;
    const msg: RealtimeServerMessage = { op: "event", event: envelope };
    const raw = JSON.stringify(msg);
    for (const c of clients) {
      if (this.shouldReceive(c, envelope)) {
        this.send(c, msg, raw);
        this.eventsSent += 1;
      }
    }
    return envelope;
  }

  getStats(): RealtimeHubStats {
    let connections = 0;
    for (const set of this.bySession.values()) connections += set.size;
    return { sessions: this.bySession.size, connections, eventsSent: this.eventsSent };
  }

  private shouldReceive(client: ClientConn, event: RealtimeEventEnvelope): boolean {
    if (client.auth.role === "PLATFORM_ADMIN" || client.auth.role === "GM") return true;
    if (client.auth.role === "CEO") {
      if (event.companyId && client.auth.companyId && event.companyId !== client.auth.companyId) {
        const sessionScoped = [
          "step.advanced",
          "step.reopened",
          "session.paused",
          "session.resumed",
          "step.locked",
          "step.unlocked",
          "settlement.completed",
          "period.started",
          "game.ended",
          "economy.changed",
          "event.fired",
          "ranking.updated",
        ];
        if (sessionScoped.includes(event.type)) return true;
        return event.companyId === client.auth.companyId;
      }
      return true;
    }
    return false;
  }

  private onConnection(ws: WebSocket, req: IncomingMessage) {
    let conn: ClientConn | null = null;
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const token = url.searchParams.get("token") ?? this.extractBearer(req);
      if (!token) {
        this.sendRaw(ws, { op: "error", code: "ERR_NO_TOKEN", message: "Missing token" });
        ws.close(4401, "Unauthorized");
        return;
      }
      const auth = verifyToken(token);
      if (!auth.sessionId) {
        this.sendRaw(ws, { op: "error", code: "ERR_NO_SESSION", message: "Token missing sessionId" });
        ws.close(4401, "Unauthorized");
        return;
      }
      if (auth.role === "CEO" && !auth.companyId) {
        this.sendRaw(ws, { op: "error", code: "ERR_NO_COMPANY", message: "CEO token missing companyId" });
        ws.close(4401, "Unauthorized");
        return;
      }

      const duplicateKey = `${auth.sessionId}:${auth.userId}:${auth.role}`;
      const existing = this.byDuplicateKey.get(duplicateKey);
      if (existing) {
        existing.ws.close(4000, "Duplicate connection");
        this.removeClient(existing);
      }

      conn = {
        id: crypto.randomUUID(),
        ws,
        auth,
        sessionId: auth.sessionId,
        lastPongAt: Date.now(),
        duplicateKey,
      };
      this.addClient(conn);
      this.send(conn, {
        op: "connected",
        sessionId: auth.sessionId,
        role: auth.role,
        connectionId: conn.id,
      });
      this.send(conn, { op: "sync", hint: {} });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Auth failed";
      this.sendRaw(ws, { op: "error", code: "ERR_AUTH", message });
      ws.close(4401, "Unauthorized");
      return;
    }

    ws.on("message", (data) => {
      if (!conn) return;
      try {
        const msg = JSON.parse(String(data)) as RealtimeClientMessage;
        if (msg.op === "ping" || msg.op === "pong") {
          conn.lastPongAt = Date.now();
          if (conn.pongTimer) clearTimeout(conn.pongTimer);
          this.send(conn, { op: "pong" });
        } else if (msg.op === "sync") {
          this.send(conn, { op: "sync", hint: {} });
        }
      } catch {
        /* ignore malformed */
      }
    });

    ws.on("close", () => {
      if (conn) this.removeClient(conn);
    });
  }

  pushSyncHint(sessionId: string, hint: RealtimeSyncHint) {
    const clients = this.bySession.get(sessionId);
    if (!clients) return;
    const msg: RealtimeServerMessage = { op: "sync", hint };
    for (const c of clients) {
      this.send(c, msg);
    }
  }

  private tickHeartbeat() {
    const now = Date.now();
    for (const set of this.bySession.values()) {
      for (const c of set) {
        if (now - c.lastPongAt > REALTIME_HEARTBEAT_MS + REALTIME_PONG_TIMEOUT_MS) {
          c.ws.close(4001, "Heartbeat timeout");
          continue;
        }
        this.send(c, { op: "pong" });
        if (c.pongTimer) clearTimeout(c.pongTimer);
        c.pongTimer = setTimeout(() => {
          if (Date.now() - c.lastPongAt > REALTIME_HEARTBEAT_MS + REALTIME_PONG_TIMEOUT_MS) {
            c.ws.close(4001, "Heartbeat timeout");
          }
        }, REALTIME_PONG_TIMEOUT_MS);
      }
    }
  }

  private addClient(conn: ClientConn) {
    let set = this.bySession.get(conn.sessionId);
    if (!set) {
      set = new Set();
      this.bySession.set(conn.sessionId, set);
    }
    set.add(conn);
    this.byDuplicateKey.set(conn.duplicateKey, conn);
  }

  private removeClient(conn: ClientConn) {
    const set = this.bySession.get(conn.sessionId);
    set?.delete(conn);
    if (set?.size === 0) this.bySession.delete(conn.sessionId);
    if (this.byDuplicateKey.get(conn.duplicateKey)?.id === conn.id) {
      this.byDuplicateKey.delete(conn.duplicateKey);
    }
    if (conn.pongTimer) clearTimeout(conn.pongTimer);
  }

  private extractBearer(req: IncomingMessage): string | null {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    return auth.slice(7);
  }

  private send(conn: ClientConn, msg: RealtimeServerMessage, raw?: string) {
    if (conn.ws.readyState !== WebSocket.OPEN) return;
    conn.ws.send(raw ?? JSON.stringify(msg));
  }

  private sendRaw(ws: WebSocket, msg: RealtimeServerMessage) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }
}

const globalHub = globalThis as unknown as { bspRealtimeHub?: RealtimeHub };

export function getRealtimeHub(): RealtimeHub | undefined {
  return globalHub.bspRealtimeHub;
}

export function setRealtimeHub(hub: RealtimeHub | undefined) {
  globalHub.bspRealtimeHub = hub;
}

export function initRealtimeHub(server: HttpServer): RealtimeHub {
  if (!globalHub.bspRealtimeHub) {
    globalHub.bspRealtimeHub = new RealtimeHub();
  }
  globalHub.bspRealtimeHub.attach(server);
  return globalHub.bspRealtimeHub;
}
