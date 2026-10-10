import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  Sparkles,
  ChevronDown,
  Trash2,
  Wrench,
  ShieldCheck,
  Clock,
  Car,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  'What services do you offer?',
  'How does the repair workflow work?',
  'How do I track my vehicle?',
  'What is the QC guarantee?',
  'Tell me about pricing & estimates',
];

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text:
        "Hello! 👋 Welcome to **BayFlow Auto Care**.\n\n" +
        "I can answer any questions about our automotive services, 4-step repair workflow, live vehicle tracking, or certified workshop network.\n\n" +
        "How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: DEFAULT_SUGGESTIONS,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadPrompt, setUnreadPrompt] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadPrompt(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Send query to backend (which queries Python chatbot engine with fallback)
      const res = await api.post('/chatbot', { message: query });
      const botReply = res.data.response || res.data.reply || 'Thank you for your question. You can explore our services or book online.';
      const suggestions = res.data.suggestions || [];

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text:
          "BayFlow certified workshops offer complete automotive repair services including periodic oil service, computerized engine diagnostics, brake overhaul, transmission, and suspension.\n\n" +
          "You can book appointments at `/book` or track vehicle progress in real-time at `/portal`.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: DEFAULT_SUGGESTIONS,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: 'Chat history cleared. Feel free to ask any question regarding our services or platform details!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: DEFAULT_SUGGESTIONS,
      },
    ]);
  };

  const renderFormattedText = (rawText: string) => {
    // Formats Markdown bolding and bullet points nicely
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      // Process bold formatting **bold**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-extrabold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={idx} className="flex items-start space-x-1.5 my-1 pl-1">
            <span className="text-blue-500 font-bold">•</span>
            <span className="flex-1">{renderedLine}</span>
          </div>
        );
      }

      if (/^\d+\./.test(line.trim())) {
        return (
          <div key={idx} className="my-1 pl-1 font-medium">
            {renderedLine}
          </div>
        );
      }

      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'my-1 leading-relaxed'}>
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* ── FLOATING CHAT WINDOW ── */}
      {isOpen && (
        <div className="w-[340px] sm:w-[400px] h-[540px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 mb-3">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B1E48] via-blue-900 to-blue-800 text-white p-4 flex items-center justify-between border-b border-blue-900">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/60 border border-blue-400/40 flex items-center justify-center text-white shadow-inner">
                  <Bot className="w-5 h-5 text-cyan-300" />
                </div>
                <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0B1E48] absolute -bottom-0.5 -right-0.5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-black text-white tracking-tight">BayFlow Assistant</h3>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-200 text-[9px] font-mono font-bold uppercase">
                    AI Concierge
                  </span>
                </div>
                <p className="text-[11px] text-blue-200">
                  Instant answers on services & platform
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize chat"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-xs ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-slate-100'
                  }`}
                >
                  {msg.sender === 'bot' ? (
                    <div className="text-slate-800 space-y-1">
                      {renderFormattedText(msg.text)}
                    </div>
                  ) : (
                    <p className="leading-relaxed font-medium">{msg.text}</p>
                  )}
                  <span
                    className={`text-[9px] mt-1 block ${
                      msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {/* Suggestions Pills if provided */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[95%]">
                    {msg.suggestions.map((s, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendMessage(s)}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 text-[11px] font-semibold transition-all shadow-2xs hover:scale-[1.02] text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-1.5 p-3 rounded-2xl bg-white border border-slate-200 self-start shadow-sm w-20">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about services, pricing, workflow..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all shadow-md shadow-blue-600/20 flex-shrink-0"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Universal Platform Knowledge</span>
              <span className="font-mono text-slate-400">Powered by BayFlow Engine</span>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING LAUNCHER BUTTON (BOTTOM RIGHT) ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center space-x-2.5 p-3.5 sm:px-4 sm:py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 ${
          isOpen
            ? 'bg-slate-900 text-white'
            : 'bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white shadow-blue-600/40'
        }`}
        title="Chat with BayFlow Assistant"
        aria-label="Open BayFlow Assistant"
      >
        <div className="relative">
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageSquare className="w-6 h-6 transform group-hover:rotate-12 transition-transform" />
          )}
          {!isOpen && unreadPrompt && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-blue-700 animate-ping" />
          )}
        </div>

        {!isOpen && (
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-black tracking-tight leading-none text-white">
              Ask BayFlow
            </span>
            <span className="text-[10px] text-cyan-100 font-medium leading-tight mt-0.5">
              Services & Platform
            </span>
          </div>
        )}
      </button>
    </div>
  );
};
