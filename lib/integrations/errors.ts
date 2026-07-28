export type IntegrationErrorCode =
  | "API_KEY_MISSING"
  | "API_KEY_INVALID"
  | "PROVIDER_DISABLED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "SCHEMA_VALIDATION_FAILED"
  | "PROVIDER_UNAVAILABLE"
  | "QUOTA_EXCEEDED";

const USER_MESSAGES: Record<IntegrationErrorCode, string> = {
  API_KEY_MISSING: "OpenAI 연결 설정이 필요합니다.",
  API_KEY_INVALID: "API Key가 올바르지 않습니다. 설정을 확인하세요.",
  PROVIDER_DISABLED: "해당 Provider가 비활성화되어 있습니다.",
  RATE_LIMITED: "API 호출 한도에 도달했습니다. 잠시 후 다시 시도하세요.",
  TIMEOUT: "외부 API 응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요.",
  NETWORK_ERROR: "네트워크 오류로 외부 API에 연결할 수 없습니다.",
  INVALID_RESPONSE: "외부 API 응답 형식이 올바르지 않습니다.",
  SCHEMA_VALIDATION_FAILED: "응답 형식 검증에 실패했습니다. 다시 생성해 주세요.",
  PROVIDER_UNAVAILABLE: "외부 서비스를 일시적으로 사용할 수 없습니다.",
  QUOTA_EXCEEDED: "OpenAI 사용 한도 또는 결제 설정이 필요합니다. platform.openai.com에서 Billing을 확인하세요.",
};

export class IntegrationError extends Error {
  readonly code: IntegrationErrorCode;
  readonly status: number;
  readonly correlationId?: string;
  readonly retryable: boolean;

  constructor(code: IntegrationErrorCode, opts?: { message?: string; status?: number; correlationId?: string; cause?: unknown }) {
    super(opts?.message ?? USER_MESSAGES[code]);
    this.name = "IntegrationError";
    this.code = code;
    this.status = opts?.status ?? statusForCode(code);
    this.correlationId = opts?.correlationId;
    this.retryable = ["RATE_LIMITED", "TIMEOUT", "NETWORK_ERROR", "PROVIDER_UNAVAILABLE"].includes(code);
    if (opts?.cause) (this as Error & { cause?: unknown }).cause = opts.cause;
  }

  toClientJson() {
    return {
      error: this.message,
      code: this.code,
      correlationId: this.correlationId,
    };
  }
}

function statusForCode(code: IntegrationErrorCode): number {
  switch (code) {
    case "API_KEY_MISSING":
    case "API_KEY_INVALID":
    case "PROVIDER_DISABLED":
      return 503;
    case "RATE_LIMITED":
    case "QUOTA_EXCEEDED":
      return 429;
    case "TIMEOUT":
      return 504;
    case "SCHEMA_VALIDATION_FAILED":
    case "INVALID_RESPONSE":
      return 422;
    default:
      return 502;
  }
}

export function mapHttpStatusToIntegrationError(status: number, provider: string, bodyText?: string): IntegrationError {
  if (status === 401 || status === 403) {
    return new IntegrationError("API_KEY_INVALID", { message: `${provider} API Key가 올바르지 않습니다.` });
  }
  if (status === 429) {
    const parsed = parseProviderErrorBody(bodyText);
    if (parsed?.code === "insufficient_quota" || parsed?.type === "insufficient_quota") {
      return new IntegrationError("QUOTA_EXCEEDED");
    }
    return new IntegrationError("RATE_LIMITED");
  }
  if (status >= 500) return new IntegrationError("PROVIDER_UNAVAILABLE", { status });
  return new IntegrationError("INVALID_RESPONSE", { status });
}

function parseProviderErrorBody(bodyText?: string): { code?: string; type?: string; message?: string } | null {
  if (!bodyText) return null;
  try {
    const j = JSON.parse(bodyText) as { error?: { code?: string; type?: string; message?: string } };
    return j.error ?? null;
  } catch {
    return null;
  }
}

export function mapOpenAiHttpError(status: number, bodyText: string): IntegrationError {
  return mapHttpStatusToIntegrationError(status, "OpenAI", bodyText);
}

export function integrationErrorResponse(e: unknown) {
  if (e instanceof IntegrationError) {
    return Response.json(e.toClientJson(), { status: e.status });
  }
  return Response.json({ error: "외부 API 처리 중 오류가 발생했습니다.", code: "PROVIDER_UNAVAILABLE" }, { status: 502 });
}
