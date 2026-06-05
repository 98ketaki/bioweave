import { useCallback, useState } from 'react';
import './App.css';
import { GraphView } from './GraphView';
import type { GraphData, GraphNode } from './types';
import { searchGene } from './api/gene';
import { fetchPubmedForGene } from './api/pubmed';
import { fetchProteinsForGene } from './api/protein';

const EMPTY: GraphData = { nodes: [], edges: [] };

export default function App() {
  const [term, setTerm] = useState('BRCA1');
  const [graph, setGraph] = useState<GraphData>(EMPTY);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const hit = await searchGene(term.trim());
      if (!hit) {
        setError(`No gene found for "${term}"`);
        return;
      }
      const node: GraphNode = {
        id: `gene:${hit.uid}`,
        kind: 'gene',
        label: hit.name,
        data: hit,
      };
      setGraph({ nodes: [node], edges: [] });
      setSelected(node);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const onNodeClick = useCallback(async (node: GraphNode) => {
    setSelected(node);
    if (node.expanded || node.kind !== 'gene') return;

    const uid = node.id.split(':')[1];
    setLoading(true);
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
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Gene / Protein Knowledge Graph</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="Gene symbol, e.g. BRCA1"
          style={{ padding: '6px 10px', fontSize: 14, flex: '0 0 240px' }}
        />
        <button onClick={onSearch} disabled={loading || !term.trim()}>
          {loading ? 'Loading…' : 'Search'}
        </button>
        {error && (
          <span style={{ color: '#b91c1c', alignSelf: 'center' }}>{error}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <GraphView data={graph} onNodeClick={onNodeClick} />
        <aside style={{ width: 320, fontSize: 13 }}>
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

      <p style={{ color: '#666', fontSize: 12, marginTop: 12 }}>
        Click the gene node to expand to PubMed + Protein. Drag nodes to rearrange.
      </p>
    </div>
  );
}
