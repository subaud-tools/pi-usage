import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { OPENROUTER_CREDITS_URL } from "./constants.js";
import { throwUsageEndpointError } from "./errors.js";
import { fetchWithTimeout } from "./http.js";
import { openRouterAuthCandidateModels } from "./models.js";
import type { OpenRouterUsageReport } from "./types.js";
import { parseJsonObject } from "./utils.js";

/** Resolve the OpenRouter API key pi uses for its openrouter models. Only the
 * key is sent: a model's other headers are for chat requests, not /credits. */
export async function resolvePiOpenRouterAuth(
  ctx: ExtensionContext,
): Promise<{ headers: Record<string, string> } | undefined> {
  const errors: string[] = [];
  for (const model of openRouterAuthCandidateModels(ctx)) {
    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
    if (!auth.ok) {
      errors.push(auth.error);
      continue;
    }
    if (auth.apiKey) {
      return {
        headers: { Authorization: `Bearer ${auth.apiKey}`, Accept: "application/json", "User-Agent": "pi-usage" },
      };
    }
  }

  if (errors.length > 0) throw new Error(errors.join("; "));
  return undefined;
}

/** GET /api/v1/credits with pi's OpenRouter key; the response body is read. */
export async function fetchOpenRouterCredits(
  ctx: ExtensionContext,
  timeoutMs: number,
): Promise<{ response: Response; text: string }> {
  const auth = await resolvePiOpenRouterAuth(ctx);
  if (!auth) throw new Error("No Pi OpenRouter API key was available. Run /login for OpenRouter.");
  const response = await fetchWithTimeout(
    OPENROUTER_CREDITS_URL,
    { headers: auth.headers },
    timeoutMs,
    "OpenRouter credits",
  );
  return { response, text: await response.text() };
}

export async function queryOpenRouterUsage(ctx: ExtensionContext, timeoutMs: number): Promise<OpenRouterUsageReport> {
  const { response, text } = await fetchOpenRouterCredits(ctx, timeoutMs);
  if (!response.ok) throwUsageEndpointError("OpenRouter", response, text);
  const payload = parseJsonObject(text, "OpenRouter credits endpoint response");
  return normalizeOpenRouterCreditsPayload(payload, Date.now());
}

/** Normalize `{ data: { total_credits, total_usage } }` from /api/v1/credits. */
export function normalizeOpenRouterCreditsPayload(payload: unknown, capturedAt: number): OpenRouterUsageReport {
  const data = typeof payload === "object" && payload !== null ? (Reflect.get(payload, "data") as unknown) : undefined;
  const totalCredits = typeof data === "object" && data !== null ? Reflect.get(data, "total_credits") : undefined;
  const totalUsage = typeof data === "object" && data !== null ? Reflect.get(data, "total_usage") : undefined;
  if (!isFiniteNumber(totalCredits) || !isFiniteNumber(totalUsage)) {
    throw new Error("OpenRouter credits response is missing data.total_credits or data.total_usage.");
  }
  return { provider: "openrouter", source: "openrouter-api", capturedAt, totalCredits, totalUsage };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
