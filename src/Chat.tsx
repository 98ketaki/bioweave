import { useEffect, useRef, useState } from 'react';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  pending?: boolean;
}

interface Props {
  messages: ChatMessage[];
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Chat({ messages, onSubmit, disabled, placeholder }: Props) {
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
        width: 280,
        flex: '0 0 280px',
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
            Ask about a gene — e.g. <em>"Find the human gene for insulin"</em>.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                background: m.role === 'user' ? '#2563eb' : '#f3f4f6',
                color: m.role === 'user' ? '#fff' : '#111827',
                padding: '8px 10px',
                borderRadius: 10,
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                opacity: m.pending ? 0.7 : 1,
              }}
            >
              {m.text}
              {m.pending && <span style={{ marginLeft: 6 }}>…</span>}
            </div>
          </div>
        ))}
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
