'use client';

import { useEffect, useState, useRef } from 'react';

export interface ChatMsg {
  id: string;
  content: string;
  senderName: string;
  createdAt: string;
}

interface ChatPanelProps {
  channel: string;
  senderName: string;
  title?: string;
  className?: string;
}

export function ChatPanel({ channel, senderName, title = 'Chat', className = '' }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!channel) return;
    try {
      const r = await fetch(`/api/messages?channel=${encodeURIComponent(channel)}`);
      const json = await r.json();
      if (json.success && Array.isArray(json.data)) setMessages(json.data);
    } catch {
      // ignora erros de rede no polling
    }
  };

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, 4000);
    return () => clearInterval(t);
  }, [channel]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !channel || enviando) return;
    setEnviando(true);
    setInput('');
    try {
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, content: text, senderName }),
      });
      const json = await r.json();
      if (json.success) await fetchMessages();
    } catch {
      setInput(text);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[320px]"
      >
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma mensagem. Seja o primeiro a enviar.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-0.5">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-sm text-blue-300">{m.senderName}</span>
                <span className="text-xs text-gray-500">
                  {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-200 text-sm bg-gray-700/50 px-3 py-2 rounded-lg">{m.content}</p>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          disabled={enviando}
        />
        <button
          onClick={handleSend}
          disabled={enviando || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium text-sm transition"
        >
          {enviando ? '…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
