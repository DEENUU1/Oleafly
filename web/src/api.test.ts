import { describe, expect, it, vi } from "vitest";
import { createWebApi, MAIN_FILE_HEADER } from "./api";

describe("compiled output uploads", () => {
  it("names the PDF a SyncTeX upload belongs to without adding that header to PDFs", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({
      kind: "synctex", size: 3, compiledBy: "me", compiledAt: 1, mainFile: "main.tex",
    }), { status: 200 }));
    const api = createWebApi(fetcher);
    const hash = "ab".repeat(32);
    await api.putOutput("p1", "synctex", new Uint8Array([31, 139, 8]), "main file.tex", hash);
    expect(fetcher).toHaveBeenLastCalledWith("/web/api/projects/p1/output/synctex", expect.objectContaining({
      headers: expect.objectContaining({ [MAIN_FILE_HEADER]: "main%20file.tex", "X-Oleafly-For-Pdf": hash }),
    }));
    await api.putOutput("p1", "pdf", new Uint8Array([1]), "main.tex");
    expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).has("X-Oleafly-For-Pdf")).toBe(false);
  });
});
