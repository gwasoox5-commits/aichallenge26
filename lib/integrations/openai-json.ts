type OutputBlock = {
  type?: string;
  text?: string;
  json?: unknown;
  content?: OutputBlock[];
};

export type OpenAiResponsesBody = {
  id?: string;
  status?: string;
  incomplete_details?: { reason?: string };
  output_text?: string;
  output?: OutputBlock[];
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
};

function collectOutputText(blocks: OutputBlock[] | undefined, out: string[]): void {
  for (const block of blocks ?? []) {
    if (block.type === "output_json" && block.json != null) {
      out.push(JSON.stringify(block.json));
      continue;
    }
    if (block.type === "output_text" && block.text?.trim()) {
      out.push(block.text.trim());
      continue;
    }
    if (block.type === "text" && block.text?.trim()) {
      out.push(block.text.trim());
      continue;
    }
    if (block.text?.trim() && (!block.type || block.type === "message")) {
      out.push(block.text.trim());
    }
    collectOutputText(block.content, out);
  }
}

/** Aggregate JSON/text from OpenAI Responses API (matches SDK output_text aggregation). */
export function extractOpenAiResponseText(body: OpenAiResponsesBody): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text.trim();
  }

  const parts: string[] = [];
  for (const item of body.output ?? []) {
    if (item.type && item.type !== "message" && item.type !== "output_text" && item.type !== "text") {
      if (item.type === "output_json" && item.json != null) {
        parts.push(JSON.stringify(item.json));
      }
      continue;
    }
    collectOutputText(item.content, parts);
    if (item.text?.trim()) parts.push(item.text.trim());
  }

  return parts.join("").trim();
}

/** Parse JSON from model text — handles raw JSON, markdown fences, or embedded objects. */
export function parseModelJsonText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new SyntaxError("empty");

  try {
    return JSON.parse(trimmed);
  } catch {
    /* try fenced or embedded JSON */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new SyntaxError("invalid json");
}

export function extractOpenAiStructuredPayload(body: OpenAiResponsesBody): unknown {
  for (const item of body.output ?? []) {
    if (item.type === "output_json" && item.json != null) {
      return item.json;
    }
    for (const block of item.content ?? []) {
      if (block.type === "output_json" && block.json != null) {
        return block.json;
      }
    }
  }

  const text = extractOpenAiResponseText(body);
  if (!text) return null;
  return parseModelJsonText(text);
}

export function openAiResponseIssue(body: OpenAiResponsesBody): string | null {
  if (body.status === "incomplete") {
    const reason = body.incomplete_details?.reason ?? "unknown";
    if (reason === "max_output_tokens") {
      return "OpenAI 출력 토큰 한도에 도달해 응답이 잘렸습니다.";
    }
    return `OpenAI 응답이 완료되지 않았습니다 (${reason}).`;
  }
  if (body.status === "failed") {
    return "OpenAI가 요청 처리에 실패했습니다.";
  }
  return null;
}
