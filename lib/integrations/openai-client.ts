import { randomUUID } from "crypto";
import { getOpenAiConfig } from "./config";
import { IntegrationError, mapOpenAiHttpError } from "./errors";
import type { AiFeature } from "./types";
import { makeAiMeta } from "./usage-store";

export interface StructuredOpenAiRequest<T> {
  feature: AiFeature;
  input: string;
  schema: Record<string, unknown>;
  schemaName: string;
  promptVersion?: string;
  sessionId?: string;
  userRole?: string;
  idempotencyKey?: string;
  maxOutputTokens?: number;
  correlationId?: string;
}

export interface OpenAiCallMeta {
  model: string;
  responseId: string;
  requestId: string;
  correlationId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  retryCount: number;
  promptVersion?: string;
  usedLive: boolean;
}

export interface StructuredOpenAiResult<T> {
  data: T;
  meta: OpenAiCallMeta;
}

type ResponsesOutputBlock = {
  type?: string;
  text?: string;
  content?: Array<{ type?: string; text?: string }>;
};

/** Extract JSON text from OpenAI Responses API (message + output_text blocks). */
export function extractOpenAiResponseText(body: {
  output_text?: string;
  output?: ResponsesOutputBlock[];
}): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text.trim();
  }

  for (const item of body.output ?? []) {
    if (item.type && item.type !== "message") continue;
    for (const block of item.content ?? []) {
      if (block.type === "output_text" && block.text?.trim()) {
        return block.text.trim();
      }
      if (block.text?.trim()) {
        return block.text.trim();
      }
    }
  }

  return body.output?.[0]?.content?.[0]?.text?.trim() ?? "";
}

export function sanitizeJsonSchemaForOpenAi(schema: Record<string, unknown>): Record<string, unknown> {
  const { $schema, $id, title, description, ...rest } = schema;
  return rest;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function validateAgainstSchema(data: unknown, schema: Record<string, unknown>): boolean {
  if (schema.type === "object" && typeof data === "object" && data !== null) {
    const req = (schema.required as string[] | undefined) ?? [];
    for (const key of req) {
      if (!(key in (data as Record<string, unknown>))) return false;
    }
    return true;
  }
  return data !== null && data !== undefined;
}

/** OpenAI Responses API with structured JSON schema, retry, repair, usage tracking */
export async function callOpenAiStructured<T>(req: StructuredOpenAiRequest<T>): Promise<StructuredOpenAiResult<T>> {
  const cfg = getOpenAiConfig();
  const correlationId = req.correlationId ?? randomUUID();
  const requestId = randomUUID();

  if (!cfg.configured) {
    throw new IntegrationError("API_KEY_MISSING");
  }
  if (!cfg.enabled) {
    throw new IntegrationError("PROVIDER_DISABLED");
  }

  const started = Date.now();
  let retryCount = 0;
  let lastError: unknown;
  const openAiSchema = sanitizeJsonSchemaForOpenAi(req.schema);

  const attempt = async (repairHint?: string): Promise<StructuredOpenAiResult<T>> => {
    const input = repairHint
      ? `${req.input}\n\nPrevious output failed schema validation. Return ONLY valid JSON matching the schema. Error: ${repairHint}`
      : req.input;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.model,
          input,
          text: {
            format: {
              type: "json_schema",
              name: req.schemaName,
              schema: openAiSchema,
              strict: false,
            },
          },
          max_output_tokens: req.maxOutputTokens ?? cfg.intelligenceMaxTokens,
        }),
      });

      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && retryCount < cfg.maxRetries) {
          retryCount += 1;
          await sleep(Math.min(1000 * 2 ** retryCount, 8000));
          return attempt(repairHint);
        }
        const errText = await res.text();
        throw mapOpenAiHttpError(res.status, errText);
      }

      const body = (await res.json()) as {
        id: string;
        output_text?: string;
        output?: ResponsesOutputBlock[];
        usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
      };
      const text = extractOpenAiResponseText(body);
      if (!text) throw new IntegrationError("INVALID_RESPONSE", { message: "OpenAI가 빈 응답을 반환했습니다." });

      let parsed: T;
      try {
        parsed = JSON.parse(text) as T;
      } catch {
        throw new IntegrationError("INVALID_RESPONSE");
      }

      if (!validateAgainstSchema(parsed, req.schema)) {
        throw new IntegrationError("SCHEMA_VALIDATION_FAILED");
      }

      const latencyMs = Date.now() - started;
      const meta: OpenAiCallMeta = {
        model: cfg.model,
        responseId: body.id,
        requestId,
        correlationId,
        inputTokens: body.usage?.input_tokens ?? 0,
        outputTokens: body.usage?.output_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
        latencyMs,
        retryCount,
        promptVersion: req.promptVersion,
        usedLive: true,
      };

      makeAiMeta(req.feature, {
        ...meta,
        sessionId: req.sessionId,
        userRole: req.userRole,
        success: true,
        resultStatus: "success",
        idempotencyKey: req.idempotencyKey,
        cacheHit: false,
      });

      return { data: parsed, meta };
    } catch (e) {
      lastError = e;
      if (e instanceof IntegrationError && e.retryable && retryCount < cfg.maxRetries) {
        retryCount += 1;
        await sleep(Math.min(1000 * 2 ** retryCount, 8000));
        return attempt(repairHint);
      }
      if ((e as Error).name === "AbortError") {
        throw new IntegrationError("TIMEOUT", { correlationId });
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (e) {
    if (e instanceof IntegrationError && e.code === "SCHEMA_VALIDATION_FAILED") {
      try {
        return await attempt("schema_validation_failed");
      } catch (repairErr) {
        makeAiMeta(req.feature, {
          model: cfg.model,
          requestId,
          correlationId,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          latencyMs: Date.now() - started,
          success: false,
          resultStatus: "failed",
          retryCount,
          errorCode: "SCHEMA_VALIDATION_FAILED",
          sessionId: req.sessionId,
          userRole: req.userRole,
          promptVersion: req.promptVersion,
          cacheHit: false,
        });
        throw repairErr;
      }
    }
    if (e instanceof IntegrationError) {
      makeAiMeta(req.feature, {
        model: cfg.model,
        requestId,
        correlationId,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencyMs: Date.now() - started,
        success: false,
        resultStatus: "failed",
        retryCount,
        errorCode: e.code,
        sessionId: req.sessionId,
        userRole: req.userRole,
        promptVersion: req.promptVersion,
        cacheHit: false,
      });
      throw e;
    }
    throw new IntegrationError("NETWORK_ERROR", { correlationId, cause: lastError });
  }
}

/** Minimal connectivity test — no schema, tiny prompt */
export async function testOpenAiConnection(): Promise<{ ok: boolean; latencyMs: number; model: string }> {
  const cfg = getOpenAiConfig();
  if (!cfg.configured) throw new IntegrationError("API_KEY_MISSING");
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(cfg.timeoutMs, 15_000));
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ model: cfg.model, input: "Reply with JSON: {\"ok\":true}", max_output_tokens: 32 }),
    });
    const errText = !res.ok ? await res.text() : "";
    if (!res.ok) throw mapOpenAiHttpError(res.status, errText);
    return { ok: true, latencyMs: Date.now() - started, model: cfg.model };
  } finally {
    clearTimeout(timer);
  }
}
