import { useEffect, useRef, useState } from 'react';
import type { Citation, Followup } from './api/ask';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
  citations?: Citation[];
  followups?: Followup[];
  usedSources?: string[];
}

interface Props {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
  onFollowup?: (f: Followup) => void;
  disabled?: boolean;
  placeholder?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  gene: '#2563eb',
  protein: '#16a34a',
  pubmed: '#dc2626',
};

// Replace inline [PMID nnn] markers with anchors back to the matching citation.
function renderAnswer(text: string, citations: Citation[]) {
  const byPmid = new Map(
    citations.filter((c) => c.source === 'pubmed').map((c) => [c.id, c]),
  );
  const parts: Array<string | { c: Citation }> = [];
  const re = /\[PMID\s+(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const c = byPmid.get(m[1]);
    if (c) parts.push({ c });
    else parts.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) =>
    typeof p === 'string' ? (
      <span key={i}>{p}</span>
    ) : (
      <a
        key={i}
        href={p.c.url}
        target="_blank"
        rel="noreferrer"
        style={{ color: SOURCE_COLORS.pubmed, textDecoration: 'underline' }}
      >
        [PMID {p.c.id}]
      </a>
    ),
  );
}

export function Chat({ messages, onSubmit, onFollowup, disabled, placeholder }: Props) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    const t = draft.trim();
    if (!t || disabled) return;
    onSubmit(t);
    setDraft('');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 320,
        flex: '0 0 320px',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#6b7280', fontSize: 13 }}>
            Ask about a gene — e.g. <em>"What does TP53 do?"</em>
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const cites = m.citations ?? [];
          const fups = m.followups ?? [];
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: '92%',
                  background: isUser ? '#2563eb' : '#f3f4f6',
                  color: isUser ? '#fff' : '#111827',
                  padding: '8px 10px',
                  borderRadius: 10,
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                  opacity: m.pending ? 0.7 : 1,
                }}
              >
                {cites.length > 0 ? renderAnswer(m.text, cites) : m.text}
                {m.pending && <span style={{ marginLeft: 6 }}>…</span>}
              </div>

              {m.usedSources && m.usedSources.length > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#6b7280',
                    marginTop: 4,
                    maxWidth: '92%',
                  }}
                >
                  answered using: {m.usedSources.join(', ')}
                </div>
              )}

              {cites.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    marginTop: 6,
                    maxWidth: '92%',
                  }}
                >
                  {cites.map((c) => (
                    <a
                      key={`${c.source}:${c.id}`}
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      title={c.label}
                      style={{
                        background: '#fff',
                        border: `1px solid ${SOURCE_COLORS[c.source] ?? '#9ca3af'}`,
                        color: SOURCE_COLORS[c.source] ?? '#374151',
                        padding: '2px 6px',
                        borderRadius: 999,
                        fontSize: 11,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.label.length > 28 ? c.label.slice(0, 28) + '…' : c.label}
                    </a>
                  ))}
                </div>
              )}

              {fups.length > 0 && onFollowup && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    marginTop: 6,
                    maxWidth: '92%',
                  }}
                >
                  {fups.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => onFollowup(f)}
                      style={{
                        textAlign: 'left',
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 8,
          borderTop: '1px solid #e5e7eb',
          background: '#fafafa',
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={placeholder ?? 'Ask a question…'}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: 13,
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: '#fff',
          }}
        />
        <button onClick={submit} disabled={disabled || !draft.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
