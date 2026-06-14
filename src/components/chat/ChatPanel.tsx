import { useState } from 'react';
import { Bot, X, Send, User } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { getChatResponse } from '../../services/ai';
import './ChatPanel.css';

interface ChatPanelProps {
  title?: string;
  messages: ChatMessage[];
  suggestions?: string[];
  onClose?: () => void;
  className?: string;
}

const renderFormattedMessage = (content: string) => {
  if (!content) return null;
  const lines = content.split('\n');
  return lines.map((line, index) => {
    const formatBold = (text: string) => {
      const parts = text.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, partIdx) => {
        if (partIdx % 2 === 1) {
          return <strong key={partIdx} style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{part}</strong>;
        }
        return part;
      });
    };

    const numberedMatch = /^\s*(\d+)[.)]\s+(.*)/.exec(line);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const text = numberedMatch[2];
      return (
        <div key={index} className="chat-line-list-item chat-line-numbered" style={{ display: 'flex', gap: '6px', marginBottom: '6px', paddingLeft: '4px' }}>
          <span className="chat-list-number" style={{ fontWeight: '600', color: 'var(--accent-primary)', flexShrink: 0 }}>{num}.</span>
          <span style={{ flex: 1 }}>{formatBold(text)}</span>
        </div>
      );
    }

    const bulletMatch = /^\s*[-*•]\s+(.*)/.exec(line);
    if (bulletMatch) {
      const text = bulletMatch[1];
      return (
        <div key={index} className="chat-line-list-item chat-line-bullet" style={{ display: 'flex', gap: '8px', marginBottom: '6px', paddingLeft: '4px' }}>
          <span className="chat-list-bullet" style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>•</span>
          <span style={{ flex: 1 }}>{formatBold(text)}</span>
        </div>
      );
    }

    if (line.trim() === '') {
      return <div key={index} className="chat-line-empty" style={{ height: '8px' }} />;
    }

    return (
      <div key={index} className="chat-line-text" style={{ marginBottom: '4px' }}>
        {formatBold(line)}
      </div>
    );
  });
};

export default function ChatPanel({
  title = 'AI көмекші',
  messages: initialMessages,
  suggestions = [],
  onClose,
  className = '',
}: ChatPanelProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    if (!messageToSend) setInput('');
    setLoading(true);

    try {
      const reply = await getChatResponse(text, messages);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...updatedMessages, botMsg]);
    } catch (err) {
      console.error("Failed to fetch chat reply:", err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Кешіріңіз, қате пайда болды. Сұрағыңызды қайта жазып көріңіз.',
        timestamp: new Date().toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  return (
    <div className={`chat-panel ${className}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <div className="chat-header-icon">
            <Bot size={16} />
          </div>
          {title}
        </div>
        {onClose && (
          <button className="chat-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="chat-suggestions">
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              className="chat-suggestion-btn"
              onClick={() => handleSuggestionClick(sug)}
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-message-${msg.role === 'user' ? 'user' : 'bot'}`}>
            <div className="chat-message-avatar">
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div>
              <div className="chat-message-name">
                {msg.role === 'user' ? 'Сен' : 'AI көмекші'}
                <span className="chat-message-time">{msg.timestamp}</span>
              </div>
              <div className="chat-message-content">
                {renderFormattedMessage(msg.content)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input
            className="chat-input"
            type="text"
            placeholder={loading ? "AI жауап дайындап жатыр..." : "Сұрағыңызды жазыңыз..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button className="chat-send-btn" onClick={() => handleSend()} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? (
              <div className="spin" style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>

      <p className="chat-disclaimer">
        AI жауаптары ұсыныс ретінде берілді, мұғалімнің шешімімен бекітіледі.
      </p>
    </div>
  );
}
