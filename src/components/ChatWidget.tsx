import React, { useState } from 'react';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  incidentId: string;
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
}

export function ChatWidget({ incidentId, messages = [], onSendMessage }: ChatWidgetProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && onSendMessage) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow h-96 flex flex-col">
      <div className="bg-primary text-white p-4 rounded-t-lg">
        <h3 className="font-bold">Chat - Ocorrência {incidentId}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">Nenhuma mensagem</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{msg.sender}</span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <p className="text-gray-700 text-sm bg-gray-100 p-2 rounded">
                {msg.content}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Digite sua mensagem..."
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-primary"
        />
        <button
          onClick={handleSend}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-secondary font-semibold"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
