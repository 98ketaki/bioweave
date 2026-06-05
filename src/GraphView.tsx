import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphData, GraphNode } from './types';

const COLORS: Record<GraphNode['kind'], string> = {
  gene: '#4f46e5',
  protein: '#059669',
  pubmed: '#dc2626',
  'related-gene': '#7c3aed',
};

interface Props {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  width?: number;
  height?: number;
}

export function GraphView({ data, onNodeClick, width = 900, height = 600 }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    // Work on copies — d3-force mutates.
    const nodes = data.nodes.map((n) => ({ ...n }));
    const links = data.edges.map((e) => ({ ...e }));

    const sim = d3
      .forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(28));

    const link = svg
      .append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.5)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1.4);

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_e, d: any) => onNodeClick?.(d));

    node
      .append('circle')
      .attr('r', (d: any) => (d.kind === 'gene' ? 18 : 11))
      .attr('fill', (d: any) => COLORS[d.kind as GraphNode['kind']])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node
      .append('text')
      .text((d: any) => d.label)
      .attr('x', 14)
      .attr('y', 4)
      .attr('font-size', 11)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('fill', '#111');

    node.call(
      d3
        .drag<any, any>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }),
    );

    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      sim.stop();
    };
  }, [data, width, height, onNodeClick]);

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}
    />
  );
}
