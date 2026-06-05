import { useCallback, useState } from 'react';
import './App.css';
import { GraphView } from './GraphView';
import { Chat, type ChatMessage } from './Chat';
import type { GraphData, GraphNode } from './types';
import {
  askQuestion,
  fetchDetail,
  type AskResult,
  type Followup,
  type DetailResult,
} from './api/ask';
import { fetchPubmedForGene } from './api/pubmed';
import { fetchProteinsForGene } from './api/protein';

const EMPTY: GraphData = { nodes: [], edges: [] };

let msgCounter = 0;
const nextId = () => `m${++msgCounter}`;

function nodeFromDetail(d: DetailResult): GraphNode {
  if (d.type === 'gene') {
    return {
      id: `gene:${d.record.geneUid}`,
      kind: 'gene',
      label: d.record.officialSymbol || d.record.fullName || d.record.geneUid,
      data: d.record,
    };
  }
  return {
    id: `protein:${d.record.proteinUid}`,
    kind: 'protein',
    label: d.record.accession || d.record.title.slice(0, 30),
    data: d.record,
  };
}

// Promote gene/protein citations from an answer into graph nodes, so the user
// can see the entities they read about and expand them in the graph.
function nodesFromAnswer(r: AskResult): GraphNode[] {
  const nodes: GraphNode[] = [];
  for (const c of r.citations) {
    if (c.source === 'gene') {
      nodes.push({
        id: `gene:${c.id}`,
        kind: 'gene',
        label: c.label.replace(/\s*\(NCBI Gene\)\s*$/, ''),
        data: c,
      });
    } else if (c.source === 'protein') {
      nodes.push({
        id: `protein:${c.id}`,
        kind: 'protein',
        label: c.label.split(' — ')[0] || c.label,
        data: c,
      });
    }
  }
  return nodes;
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
      { id: pendingId, role: 'assistant', text: 'Thinking', pending: true },
    ]);
    setBusy(true);
    try {
      const result = await askQuestion(text);
      const newNodes = nodesFromAnswer(result);
      const firstGene = newNodes.find((n) => n.kind === 'gene');
      setGraph((g) => mergeGraph(g, newNodes, []));
      if (firstGene) setSelected(firstGene);

      setMessages((m) =>
        m.map((x) =>
          x.id === pendingId
            ? {
                ...x,
                text: result.answer,
                citations: result.citations,
                followups: result.followups,
                usedSources: result.usedSources,
                pending: false,
              }
            : x,
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

  const onFollowup = async (f: Followup) => {
    setBusy(true);
    try {
      const detail = await fetchDetail(f.detail);
      const node = nodeFromDetail(detail);
      setGraph((g) => mergeGraph(g, [node], []));
      setSelected({ ...node, data: detail.record });
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          text: `Couldn't load "${f.label}": ${e?.message ?? String(e)}`,
        },
      ]);
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
          onFollowup={onFollowup}
          disabled={busy}
          placeholder='e.g. "What does TP53 do?"'
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
