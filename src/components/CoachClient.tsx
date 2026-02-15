'use client';

import { useState, useRef, useEffect } from 'react';
import { downloadCard } from '@/lib/share';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  userId: string;
  userName: string;
}

const SUGGESTIONS = [
  "What should I run today?",
  "How's my training load?",
  "I have a 10K race in 4 weeks. How should I prepare?",
  "What are my strengths and weaknesses as a runner?",
];

export default function CoachClient({ userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });

      if (!res.ok) throw new Error('Failed');
      const { reply } = await res.json();
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-bold mb-2">AI Running Coach</h2>
            <p className="text-sm text-text-muted mb-8 max-w-md">
              I know your entire Strava history. Ask me anything about training, races, recovery, or today&apos;s plan.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded-xl border border-border bg-surface text-sm text-text-muted hover:border-primary/30 hover:text-text transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-surface border border-border rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' && (
                  <span className="text-xs text-primary font-medium block mb-1">🤖 Coach</span>
                )}
                {msg.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <span className="text-xs text-primary font-medium block mb-1">🤖 Coach</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-bg px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask your coach anything, ${userName.split(' ')[0]}...`}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-text text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary resize-none"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0"
          >
            Send
          </button>
          {messages.length >= 2 && (
            <button
              onClick={async () => {
                if (!shareRef.current || saving) return;
                setSaving(true);
                try { await downloadCard(shareRef.current, 'rundna-coach-advice'); }
                finally { setSaving(false); }
              }}
              disabled={saving}
              className="px-3 py-2.5 rounded-xl border border-primary/30 text-primary text-sm hover:bg-primary/10 transition-all disabled:opacity-50 shrink-0"
              title="Save last advice as image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hidden share card — last Q&A pair */}
      {messages.length >= 2 && (
        <div className="fixed -left-[9999px] top-0">
          <div ref={shareRef} className="w-[540px] bg-[#060a0e] p-8 rounded-2xl border border-[#1e2a3a]">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-sm font-bold text-[#e6edf3]">RunDNA Coach</p>
                <p className="text-[10px] text-[#7d8590]">AI Running Intelligence</p>
              </div>
            </div>
            {/* Last user question */}
            <div className="mb-4">
              <p className="text-[10px] text-[#7d8590] mb-1">{userName.split(' ')[0]} asked:</p>
              <p className="text-sm text-[#e6edf3]/80 italic">
                &ldquo;{messages.filter(m => m.role === 'user').slice(-1)[0]?.content}&rdquo;
              </p>
            </div>
            {/* Last coach reply */}
            <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-4 mb-6">
              <p className="text-sm text-[#e6edf3] leading-relaxed whitespace-pre-wrap">
                {messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
              </p>
            </div>
            {/* Branding */}
            <div className="border-t border-[#1e2a3a] pt-3 flex items-center justify-between">
              <p className="text-[10px] text-[#7d8590]">
                <span className="text-[#10b981]">🧬</span> RunDNA — rundna.vercel.app
              </p>
              <p className="text-[10px] text-[#7d8590]">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
