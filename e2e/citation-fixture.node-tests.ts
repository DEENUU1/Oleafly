import assert from "node:assert/strict";
import test from "node:test";
import { startCitationFixture } from "./citation-fixture.ts";

test("citation fixtures answer provider-shaped requests and reject unknown requests", async () => {
  const fixture = await startCitationFixture();
  try {
    const doi = await fetch(`${fixture.origin}/doi.org/10.1093/comjnl/27.2.97`);
    assert.equal(doi.headers.get("Content-Type"), "application/x-bibtex");
    assert.match(await doi.text(), /Literate Programming/u);
    const isbn = await fetch(`${fixture.origin}/openlibrary.org/api/books?bibkeys=ISBN:9780262035613&jscmd=data&format=json`);
    assert.match(await isbn.text(), /Deep Learning/u);
    const pmid = await fetch(`${fixture.origin}/eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=32172672&retmode=json`);
    assert.match(await pmid.text(), /32172672/u);
    const missing = await fetch(`${fixture.origin}/doi.org/10.9999/unavailable`);
    assert.equal(missing.status, 503);
    assert.equal(fixture.requests.length, 4);
  } finally {
    await fixture.close();
  }
});
