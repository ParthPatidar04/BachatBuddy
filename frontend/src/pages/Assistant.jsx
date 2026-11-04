import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Spinner } from '../components/ui';
import Orb from '../components/Orb';
import SimpleMarkdown from '../components/SimpleMarkdown';

const SUGGESTIONS = [
  'Where did most of my money go this month?',
  'Which category has the highest expenses?',
  'How much money did I save this month?',
  'Compare my spending with last month',
  'Suggest ways to reduce unnecessary expenses',
];

const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]); // { role, content, time, error? }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || sending) return;
    // only real turns go back to the server as context (not error bubbles)
    const history = messages.filter((m) => !m.error).slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: message, time: timeNow() }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/assistant/chat', { message, history });
      setMessages((m) => [...m, { role: 'assistant', content: res.data.reply, time: timeNow() }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: errMsg(err, 'I could not answer that right now. Please try again.'), time: timeNow(), error: true }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        title="AI assistant"
        subtitle="Answers come from your own transactions, budgets and goals"
        actions={messages.length > 0 && <button className="btn-ghost !py-2" onClick={() => setMessages([])}><Trash2 size={16} /> Clear chat</button>}
      />

      <Card className="flex min-h-[60vh] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <Orb size={36} />
          <div>
            <p className="text-sm font-bold">BachatBuddy AI</p>
            <p className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-good" /> Your financial assistant</p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
          {messages.length === 0 && (
            <div className="flex flex-col items-center px-2 py-8 text-center">
              <Orb size={84} float />
              <h2 className="mt-5 text-xl font-extrabold">Hi {user.name.split(' ')[0]}, ask me about your money</h2>
              <p className="mt-1 max-w-sm text-sm text-muted">I only use your real data and will say so when something is missing.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip !px-3.5 !py-2 border border-line bg-surface2 text-left text-ink transition hover:border-primary hover:text-primary" onClick={() => send(s)}>
                    <Sparkles size={13} className="text-primary" /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 animate-fadeUp ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.role === 'assistant' && <Orb size={28} className="mt-1" />}
              <div className="max-w-[85%]">
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-md bg-primary text-white dark:text-[#120d2e]' : m.error ? 'rounded-bl-md bg-bad/10 text-bad' : 'rounded-bl-md bg-surface2'}`}>
                  {m.role === 'assistant' && !m.error ? <SimpleMarkdown text={m.content} /> : m.content}
                </div>
                <p className={`mt-1 px-1 text-[11px] text-muted ${m.role === 'user' ? 'text-right' : ''}`}>{m.time}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2.5">
              <Orb size={28} />
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface2 px-4 py-2.5 text-sm text-muted"><Spinner size={14} /> Looking at your data...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input className="input !rounded-2xl" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything about your spending..." maxLength={1000} aria-label="Message" />
          <button className="btn-primary !rounded-2xl !px-4" disabled={sending || !input.trim()} aria-label="Send">
            <Send size={18} />
          </button>
        </form>
      </Card>
      <p className="mt-3 text-center text-xs text-muted">AI can make mistakes and this is not financial advice. Check important numbers in Analytics.</p>
    </div>
  );
}