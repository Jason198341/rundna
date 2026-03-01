'use client';

import { useState, useRef, useEffect } from 'react';
import { shareCard } from '@/lib/share';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBanner from '@/components/AdBanner';
import { safeFetch, ApiError } from '@/lib/api-error';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  userName: string;
}

export default function CoachClient({ userName }: Props) {
  const [lang] = useLang();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const suggestions = [t('coach.s1', lang), t('coach.s2', lang), t('coach.s3', lang), t('coach.s4', lang)];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    safeFetch('/api/usage?feature=coach')
      .then(r => r.json())
      .then(d => setRemaining(d.remaining ?? 1))
      .catch(() => {});
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    if (remaining !== null && remaining <= 0) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await safeFetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, lang }),
      });

      const data = await res.json();
      const reply = typeof data.reply === 'string' ? data.reply : '';
      const r = data.remaining;
      setMessages([...updated, { role: 'assistant', content: reply }]);
      if (r !== undefined) setRemaining(r);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setRemaining(0);
        setMessages([...updated, { role: 'assistant', content: 'Daily limit reached. Try again tomorrow!' }]);
      } else {
        setMessages([...updated, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
      }
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
      {/* Ad */}
      <div className="px-4 pt-4">
        <AdBanner format="horizontal" />
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-bold mb-2">{t('coach.title', lang)}</h2>
            <p className="text-sm text-text-muted mb-8 max-w-md">{t('coach.intro', lang)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded-xl border border-border/50 text-sm text-text-muted hover:border-primary/30 hover:bg-surface/50 hover:text-text transition-all"
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
        {remaining !== null && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="flex items-center justify-between text-[10px] text-text-muted">
              <span>{remaining > 0 ? `${remaining} ${t('coach.left', lang)}` : t('coach.limitReached', lang)}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 1 }, (_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (1 - (remaining ?? 0)) ? 'bg-primary' : 'bg-border'}`} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${t('coach.placeholder', lang)} ${userName.split(' ')[0]}...`}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-text text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary resize-none"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0"
          >
            {t('coach.send', lang)}
          </button>
          {messages.length >= 2 && (
            <button
              onClick={async () => {
                if (!shareRef.current || saving) return;
                setSaving(true);
                try { await shareCard(shareRef.current, 'rundna-coach-advice', 'My AI Running Coach advice', 'https://rundna.online'); }
                finally { setSaving(false); }
              }}
              disabled={saving}
              aria-label="Share coach advice"
              className="px-3 py-2.5 rounded-xl border border-primary/30 text-primary text-sm hover:bg-primary/10 transition-all disabled:opacity-50 shrink-0"
              title="Share coach advice"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hidden share card — last Q&A pair */}
      {messages.length >= 2 && (
        <div className="fixed -left-[9999px] top-0">
          <div ref={shareRef} className="w-[540px] bg-bg p-8 rounded-2xl border border-border">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-sm font-bold text-text">RunDNA Coach</p>
                <p className="text-[10px] text-text-muted">AI Running Intelligence</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-[10px] text-text-muted mb-1">{userName.split(' ')[0]} asked:</p>
              <p className="text-sm text-text/80 italic">
                &ldquo;{messages.filter(m => m.role === 'user').slice(-1)[0]?.content}&rdquo;
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 mb-6">
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                {messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
              </p>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <p className="text-[10px] text-text-muted">
                <img src="/logo.png" alt="" className="inline w-4 h-4 rounded-sm align-text-bottom" /> RunDNA — rundna.online
              </p>
              <p className="text-[10px] text-text-muted">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
