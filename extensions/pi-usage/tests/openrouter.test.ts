import assert from "node:assert/strict";
import test from "node:test";
import { formatUsageStatusline } from "../src/format.js";
import { isUsageSupportedModel, reportMatchesModel } from "../src/models.js";
import { normalizeOpenRouterCreditsPayload } from "../src/openrouter-query.js";
import type { OpenRouterUsageReport } from "../src/types.js";

const creditsPayload = { data: { total_credits: 75, total_usage: 49.178867925 } };
const openRouterModel = { provider: "openrouter", id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" };
const anthropicModel = { provider: "anthropic", id: "claude-sonnet-4-5", name: "Claude Sonnet" };
const codexModel = { provider: "openai-codex", id: "gpt-5-codex", name: "GPT-5 Codex" };

const openRouterReport: OpenRouterUsageReport = {
  provider: "openrouter",
  source: "openrouter-api",
  capturedAt: 0,
  totalCredits: 75,
  totalUsage: 49.178867925,
};

void test("normalizes the OpenRouter /credits payload to a balance report", () => {
  assert.deepEqual(normalizeOpenRouterCreditsPayload(creditsPayload, 1234), {
    provider: "openrouter",
    source: "openrouter-api",
    capturedAt: 1234,
    totalCredits: 75,
    totalUsage: 49.178867925,
  });
});

void test("the status line shows the OpenRouter balance left of total credits", () => {
  assert.equal(formatUsageStatusline(openRouterReport, openRouterModel), "OpenRouter · $25.82 left of $75");
});

void test("openrouter models are supported and the OpenRouter report matches only them", () => {
  assert.equal(isUsageSupportedModel(openRouterModel), true);
  assert.equal(reportMatchesModel(openRouterReport, openRouterModel), true);
  assert.equal(reportMatchesModel(openRouterReport, anthropicModel), false);
  assert.equal(reportMatchesModel(openRouterReport, codexModel), false);
});
