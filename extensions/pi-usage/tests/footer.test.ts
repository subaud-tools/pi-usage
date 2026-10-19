import assert from "node:assert/strict";
import test from "node:test";
import { STATUS_KEY } from "../src/constants.js";
import { renderUsageStatusLine } from "../src/footer.js";
import type { FooterDataView, FooterTheme } from "../src/types.js";

const theme: FooterTheme = { fg: (_color, text) => text, bold: (text) => text };

function footerWith(statuses: Record<string, string>): FooterDataView {
  return {
    getGitBranch: () => null,
    getExtensionStatuses: () => new Map(Object.entries(statuses)),
    getAvailableProviderCount: () => 1,
    onBranchChange: () => () => {},
  };
}

const others = { "pi-channels": "channels 6/6", "permission-system": "yolo" };

void test("usage leads the status line, so its start never moves as its text changes length", () => {
  const full = renderUsageStatusLine(
    theme,
    footerWith({ ...others, [STATUS_KEY]: "Claude · 5h 5% ↻2h · 7d 50% ↻1d" }),
    120,
  );
  const stale = renderUsageStatusLine(
    theme,
    footerWith({ ...others, [STATUS_KEY]: "Claude · 5h 5% ↻2h · 7d 50% ↻1d (5m old)" }),
    120,
  );
  const checking = renderUsageStatusLine(theme, footerWith({ ...others, [STATUS_KEY]: "checking" }), 120);

  assert.equal(full, "Claude · 5h 5% ↻2h · 7d 50% ↻1d  yolo channels 6/6");
  assert.equal(stale, "Claude · 5h 5% ↻2h · 7d 50% ↻1d (5m old)  yolo channels 6/6");
  assert.equal(checking, "checking  yolo channels 6/6");
});

void test("a narrow terminal cuts the other statuses before the usage text", () => {
  const line = renderUsageStatusLine(theme, footerWith({ ...others, [STATUS_KEY]: "Claude · 5h 5% ↻2h" }), 26);
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strips the reset codes truncation adds
  assert.equal(line?.replace(/\x1B\[[0-9;]*m/g, ""), "Claude · 5h 5% ↻2h  yol...");
});

void test("without usage the line holds only the other statuses", () => {
  assert.equal(renderUsageStatusLine(theme, footerWith(others), 120), "yolo channels 6/6");
  assert.equal(renderUsageStatusLine(theme, footerWith({}), 120), undefined);
});
