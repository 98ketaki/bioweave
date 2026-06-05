import { useCallback, useState } from 'react';
import './App.css';
import { GraphView } from './GraphView';
import { Chat, type ChatMessage } from './Chat';
import type { GraphData, GraphNode } from './types';
import { searchGene, type GeneHit } from './api/gene';
import { parseQuery, type ParsedGene } from './api/parse';
import { fetchPubmedForGene } from './api/pubmed';
import { fetchProteinsForGene } from './api/protein';

const EMPTY: GraphData = { nodes: [], edges: [] };

let msgCounter = 0;
const nextId = () => `m${++msgCounter}`;

function summarizeHit(hit: GeneHit, requested: string): string {
  const parts = [`${hit.name} — ${hit.description || 'gene record'}.`];
  if (hit.chromosome) parts.push(`Chromosome ${hit.chromosome}.`);
  if (hit.summary) {
    const firstSentence = hit.summary.split(/(?<=\.)\s/)[0];
    parts.push(firstSentence);
  }
  if (hit.name.toLowerCase() !== requested.toLowerCase()) {
    parts.unshift(`Matched "${requested}" →`);
  }
  return parts.join(' ');
}

function summarizeAnswer(
  results: Array<{ requested: ParsedGene; hit: GeneHit | null }>,
): string {
  const hits = results.filter((r) => r.hit) as Array<{
    requested: ParsedGene;
    hit: GeneHit;
  }>;
  const misses = results.filter((r) => !r.hit);

  if (hits.length === 0) {
    return `No gene found for ${results.map((r) => `"${r.requested.term}"`).join(', ')}.`;
  }

  const lines: string[] = [];
  if (hits.length === 1) {
    lines.push(summarizeHit(hits[0].hit, hits[0].requested.term));
  } else {
    lines.push(`Found ${hits.length} genes:`);
    for (const h of hits) lines.push(`• ${summarizeHit(h.hit, h.requested.term)}`);
  }
  for (const m of misses) {
    lines.push(`No match for "${m.requested.term}".`);
  }
  lines.push('Click a node to expand to PubMed + Protein.');
  return lines.join('\n');
}

export default function App() {
  const [graph, setGraph] = useState<GraphData>(EMPTY);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

  const mergeGraph = (
    g: GraphData,
    add: GraphNode[],
    edges: GraphData['edges'],
  ): GraphData => {
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    for (const n of add) if (!byId.has(n.id)) byId.set(n.id, n);
    const edgeKey = (e: GraphData['edges'][number]) =>
      `${e.source}->${e.target}:${e.kind}`;
    const seen = new Set(g.edges.map(edgeKey));
    const nextEdges = [...g.edges];
    for (const e of edges) if (!seen.has(edgeKey(e))) nextEdges.push(e);
    return { nodes: [...byId.values()], edges: nextEdges };
  };

  const onAsk = async (text: string) => {
    const userMsg: ChatMessage = { id: nextId(), role: 'user', text };
    const pendingId = nextId();
    setMessages((m) => [
      ...m,
      userMsg,
      { id: pendingId, role: 'assistant', text: 'Looking that up', pending: true },
    ]);
    setBusy(true);
    try {
      const parsed = await parseQuery(text);
      const results = await Promise.all(
        parsed.genes.map(async (g) => ({
          requested: g,
          hit: await searchGene(g.term, g.organism),
        })),
      );

      const newNodes: GraphNode[] = [];
      let firstNode: GraphNode | null = null;
      for (const r of results) {
        if (!r.hit) continue;
        const node: GraphNode = {
          id: `gene:${r.hit.uid}`,
          kind: 'gene',
          label: r.hit.name,
          data: r.hit,
        };
        newNodes.push(node);
        if (!firstNode) firstNode = node;
      }
      setGraph((g) => mergeGraph(g, newNodes, []));
      if (firstNode) setSelected(firstNode);

      const answer = summarizeAnswer(results);
      setMessages((m) =>
        m.map((x) =>
          x.id === pendingId ? { ...x, text: answer, pending: false } : x,
        ),
      );
    } catch (e: any) {
      const errText = `Sorry — ${e?.message ?? String(e)}`;
      setMessages((m) =>
        m.map((x) =>
          x.id === pendingId ? { ...x, text: errText, pending: false } : x,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const onNodeClick = useCallback(async (node: GraphNode) => {
    setSelected(node);
    if (node.expanded || node.kind !== 'gene') return;

    const uid = node.id.split(':')[1];
    setBusy(true);
    try {
      const [papers, proteins] = await Promise.all([
        fetchPubmedForGene(uid),
        fetchProteinsForGene(uid),
      ]);
      const newNodes: GraphNode[] = [
        ...papers.map<GraphNode>((p) => ({
          id: `pubmed:${p.pmid}`,
          kind: 'pubmed',
          label: p.title.slice(0, 40) + (p.title.length > 40 ? '…' : ''),
          data: p,
        })),
        ...proteins.map<GraphNode>((p) => ({
          id: `protein:${p.uid}`,
          kind: 'protein',
          label: p.title.slice(0, 30) + (p.title.length > 30 ? '…' : ''),
          data: p,
        })),
      ];
      const newEdges = [
        ...papers.map((p) => ({
          source: node.id,
          target: `pubmed:${p.pmid}`,
          kind: 'mentions' as const,
        })),
        ...proteins.map((p) => ({
          source: node.id,
          target: `protein:${p.uid}`,
          kind: 'encodes' as const,
        })),
      ];
      setGraph((g) => {
        const merged = mergeGraph(g, newNodes, newEdges);
        return {
          ...merged,
          nodes: merged.nodes.map((n) =>
            n.id === node.id ? { ...n, expanded: true } : n,
          ),
        };
      });
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          text: `Couldn't expand ${node.label}: ${e?.message ?? String(e)}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, []);

  const clearAll = () => {
    setGraph(EMPTY);
    setSelected(null);
    setMessages([]);
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
        height: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Gene / Protein Knowledge Graph</h2>
        <button onClick={clearAll} disabled={busy && messages.length === 0}>
          Clear
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        <Chat
          messages={messages}
          onSubmit={onAsk}
          disabled={busy}
          placeholder='e.g. "Find the human gene for insulin"'
        />
        <GraphView data={graph} onNodeClick={onNodeClick} />
        <aside style={{ width: 240, flex: '0 0 240px', fontSize: 13, overflow: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Selected</h3>
          {selected ? (
            <>
              <div>
                <strong>{selected.label}</strong>{' '}
                <span style={{ color: '#666' }}>({selected.kind})</span>
              </div>
              <pre
                style={{
                  background: '#f3f4f6',
                  padding: 8,
                  borderRadius: 4,
                  maxHeight: 480,
                  overflow: 'auto',
                  fontSize: 11,
                }}
              >
                {JSON.stringify(selected.data, null, 2)}
              </pre>
            </>
          ) : (
            <div style={{ color: '#666' }}>Click a node to inspect.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
