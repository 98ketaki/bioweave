# Frontend design: Q&A mode (discussion doc for Steve)

> Proposals + open questions, not final. The backend Q&A engine (`/api/ask`,
> `/api/detail`) is implemented on the `feat/qa-answer-engine` branch. This doc is
> about how the frontend consumes it. Backend owns parsing/routing/fetching/answer
> synthesis; the frontend is presentation + navigation.

## Purpose

Add a **Q&A mode**: the user types a question, gets a written answer with clickable
sources, and can pull up the full gene or protein record ("know more") or drop the
entity into the existing graph.

## API the frontend consumes

### `POST /api/ask` → `{ question: string }`
```jsonc
{
  "answer": "TP53 encodes a tumor suppressor ... [PMID 12345678].",
  "usedSources": ["gene", "pubmed"],            // sources actually grounded on
  "citations": [
    { "source": "gene",    "id": "7157",     "label": "TP53 (NCBI Gene)",        "url": "https://www.ncbi.nlm.nih.gov/gene/7157" },
    { "source": "protein", "id": "2246031144","label": "NP_001394193.1 — cellular tumor antigen p53 isoform a", "url": "https://www.ncbi.nlm.nih.gov/protein/2246031144" },
    { "source": "pubmed",  "id": "12345678", "label": "PMID 12345678",           "url": "https://pubmed.ncbi.nlm.nih.gov/12345678" }
  ],
  "followups": [
    { "label": "Know more: full TP53 gene record", "detail": { "type": "gene",    "uid": "7157" } },
    { "label": "Know more: protein NP_001394193.1", "detail": { "type": "protein", "uid": "2246031144" } }
  ]
}
```
- `answer` is prose with inline `[PMID nnnn]` markers and bare gene symbols.
- `citations[]` is the flat source list backing the answer.
- `followups[]` are the "know more" actions; each carries a `detail` payload to POST to `/api/detail`.
- Errors: `400` on missing/oversized `question`; `502 { error }` on failure. An ambiguous or not-found gene still returns `200` with an honest `answer` and partial/empty citations.

### `POST /api/detail` → `{ type: 'gene' | 'protein', uid: string }`
Returns the full normalized record. Gene and protein are **symmetric** (both are real DB layers):
```jsonc
// gene
{ "type": "gene", "record": {
  "geneUid": "7157", "officialSymbol": "TP53", "fullName": "tumor protein p53",
  "organism": { "scientificName": "Homo sapiens", "commonName": "human", "taxId": "9606" },
  "chromosomeLocation": "17", "description": "...", "refSeqSummary": "...",
  "aliases": ["P53", "..."], "source": "NCBI Gene"
}}
// protein
{ "type": "protein", "record": {
  "proteinUid": "2246031144", "accession": "NP_001394193.1",
  "title": "cellular tumor antigen p53 isoform a",
  "organism": { "scientificName": "Homo sapiens", "taxId": "9606" },
  "length": 393, "moleculeType": "aa", "chromosomeLocation": "17p13.1",
  "sourceDb": "refseq", "source": "NCBI Protein"
}}
```
- `400` on bad `type`/missing `uid`; `502` on fetch failure.

Existing `POST /api/parse`, `searchGene`, `fetchProteinsForGene`, `fetchPubmedForGene`
are unchanged — the graph keeps working as-is.

## Proposed UX

A mode toggle (or tabs) at the top: **Search** (today's graph) and **Ask** (new).

Ask view:
1. Question box + Ask button (Enter submits; disabled while loading).
2. **Answer card**: the prose answer; render inline `[PMID nnnn]`/symbol markers as links to the matching `citations[]` URL. A "Sources" chip row beneath (one chip per citation, colored by `source` like the graph nodes, opens `url` in a new tab).
3. **"Know more" buttons** from `followups[]`: clicking POSTs to `/api/detail` and shows the full record in the existing right-hand **Selected** panel (reuse the panel + JSON view), and/or seeds the graph with that gene node so the existing expand flow works.
4. `usedSources[]` shown as a small "answered using: gene, pubmed" caption.

## Suggested components (your call)

- `src/api/ask.ts` (app tier) — thin fetch wrappers mirroring `src/api/parse.ts`: `askQuestion(q): Promise<AskResult>` and `fetchDetail(type, uid): Promise<DetailResult>`.
- `AskPanel.tsx` — question box + submit + loading/error state.
- `AnswerCard.tsx` — renders `answer` + citation chips + followup buttons.
- Reuse `GraphView` and the Selected panel for drill-down.

## Connection points to agree on

- **Shared types.** The backend defines `AskResult`/`Citation`/`Followup`/`DetailResult` in `src/qa/types.ts` and `NormalizedProteinRecord` in `src/protein_db/types.ts`, but those live in the backend tsconfig project (node types) and shouldn't be imported by app code. Options: (a) duplicate the response types in `src/api/ask.ts`, or (b) create a neutral `src/contracts.ts` (no node imports) that both tiers import. I lean (b). Want me to extract the shared contract types?
- **Inline citations.** Backend emits `[PMID nnnn]` + bare symbols in the prose; frontend regex-links them against `citations[]`. Alternative would be answer-with-offsets from the backend — more work, probably unnecessary.
- **"Know more" → graph vs panel.** Proposal: do both — show the full record in the Selected panel AND add the entity as a graph node so the user can expand it.
- **Production.** `/api/ask` + `/api/detail` (like `/api/parse`) currently exist only in the Vite dev server. A deployed static build has no backend — we'll need to host these handlers (small Node server or serverless). Tracked as a shared deploy task.

## Open questions

1. One unified box (auto-detect "question vs gene symbol") or an explicit Search/Ask toggle?
2. Streaming the answer (nicer, more work — needs an SSE variant of `/api/ask`) vs the current single-JSON response?
3. In Ask mode, is the graph always visible or only after a "know more"?
