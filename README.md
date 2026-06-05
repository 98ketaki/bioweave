# bioweave

Exploring gene and protein relationships using NCBI data.

Interactive knowledge graph: search a gene symbol, fetch records from NCBI
E-utilities (Gene, PubMed, Protein) and render the relationships as a
force-directed graph. Click any node to expand it further.

## Stack

- React + TypeScript (Vite)
- d3-force for the graph layout
- NCBI E-utilities (`esearch` / `esummary` / `elink`) — no API key required

## Run

```bash
npm install
npm run dev
# open http://localhost:5173
```

## Layout

- `src/api/ncbi.ts` — shared E-utilities helpers
- `src/api/gene.ts` — Gene DB search (Ketaki)
- `src/api/pubmed.ts` — PubMed fetch (Steve)
- `src/api/protein.ts` — Protein records (stub)
- `src/GraphView.tsx` — d3 force-directed graph
- `src/App.tsx` — search box + side panel + click-to-expand
