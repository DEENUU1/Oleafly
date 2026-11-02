import { startCitationFixture, type CitationFixture } from "../citation-fixture";
import { test, expect } from "../fixtures";
import { evaluateLong, type Page } from "../helpers";
import { scriptValue } from "../script-value";

function lookup(page: Page, identifier: string) {
  return evaluateLong<{ bibtex?: string; error?: string }>(page,
    `import("/src/features/citation.ts").then((m) => m.resolveCitation(${scriptValue(identifier)}))`, 60_000);
}

test.describe("citation lookups through the native transport", () => {
  let fixture: CitationFixture;
  test.beforeEach(async ({ tauriPage }) => {
    fixture = await startCitationFixture();
    await tauriPage.evaluate(`window.__TAURI_INTERNALS__.invoke("debug_citation_fixture", { baseUrl: ${scriptValue(fixture.origin)} })`);
    await evaluateLong(tauriPage, `import("/src/store/settings.ts").then(m => m.useSettingsStore.setState({ offline: false }))`, 10_000);
  });
  test.afterEach(async ({ tauriPage }) => {
    try {
      await tauriPage.evaluate(`window.__TAURI_INTERNALS__.invoke("debug_citation_fixture", { baseUrl: null })`);
    } finally {
      await fixture?.close();
    }
  });

  test("DOI, ISBN and PMID resolve without public services", async ({ tauriPage }) => {
    for (const [identifier, pattern, title] of [
      ["10.1093/comjnl/27.2.97", /@article\{/u, "Literate Programming"],
      ["978-0-262-03561-3", /@book\{/u, "Deep Learning"],
      ["32172672", /@article\{/u, "pmid = {32172672}"],
    ] as const) {
      const result = await lookup(tauriPage, identifier);
      expect(result.error).toBeUndefined();
      expect(result.bibtex).toMatch(pattern);
      expect(result.bibtex).toContain(title);
    }
    expect(fixture.requests).toHaveLength(3);
  });

  test("a provider refusal remains an error", async ({ tauriPage }) => {
    const result = await lookup(tauriPage, "10.9999/unavailable");
    expect(result.error).toBeTruthy();
    expect(result.bibtex).toBeUndefined();
    expect(fixture.requests).toEqual(["/doi.org/10.9999/unavailable"]);
  });
});

test("live citation service smoke check", async ({ tauriPage }) => {
  test.skip(process.env.OLEAFLY_E2E_LIVE_CITATIONS !== "1" || process.env.E2E_SKIP_NETWORK === "1", "Set OLEAFLY_E2E_LIVE_CITATIONS=1 to check public services.");
  test.setTimeout(120_000);
  for (const [identifier, title] of [
    ["10.1093/comjnl/27.2.97", "Literate Programming"],
    ["978-0-262-03561-3", "Deep Learning"],
    ["32172672", "pmid = {32172672}"],
  ]) {
    const result = await lookup(tauriPage, identifier);
    expect(result.error).toBeUndefined();
    expect(result.bibtex).toContain(title);
  }
});
