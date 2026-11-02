import { createServer } from "node:http";

export interface CitationFixture {
  origin: string;
  requests: readonly string[];
  close(): Promise<void>;
}

export async function startCitationFixture(): Promise<CitationFixture> {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    requests.push(url.pathname + url.search);
    if (url.pathname === "/doi.org/10.1093/comjnl/27.2.97") {
      response.setHeader("Content-Type", "application/x-bibtex");
      response.end("@article{knuth1984, title={Literate Programming}, author={Knuth, Donald}, year={1984}}");
    } else if (url.pathname === "/openlibrary.org/api/books" && url.searchParams.get("bibkeys") === "ISBN:9780262035613") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ "ISBN:9780262035613": {
        title: "Deep Learning", authors: [{ name: "Ian Goodfellow" }],
        publish_date: "2016", publishers: [{ name: "MIT Press" }],
      } }));
    } else if (url.pathname === "/eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi" && url.searchParams.get("id") === "32172672") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ result: { "32172672": {
        title: "Clinical features of patients", authors: [{ name: "Author A" }], pubdate: "2020", source: "BMJ",
      } } }));
    } else {
      response.writeHead(503, { "Content-Type": "text/plain" });
      response.end("Citation fixture has no response for this request.");
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The citation fixture has no TCP address.");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
