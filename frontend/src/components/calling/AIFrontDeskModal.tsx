import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, Send, Volume2, Sparkles, X, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AIFrontDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId?: string;
  defaultCustomerIdentifier?: string;
}

export const AIFrontDeskModal: React.FC<AIFrontDeskModalProps> = ({
  isOpen,
  onClose,
  shopId,
  defaultCustomerIdentifier,
}) => {
  const { currentShop, user } = useAuth();
  const effectiveShopId = shopId || currentShop?.id;

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string }>>([
    {
      role: 'assistant',
      text: `Hello! Welcome to ${currentShop?.name || 'our shop'}'s AI Front Desk. I am your virtual assistant. Could you please share your vehicle plate, phone number, or booking reference so I can look up your file?`,
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdTask, setCreatedTask] = useState<any | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto speech synthesis when AI replies
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (msgToSend?: string) => {
    const text = (msgToSend || inputMessage).trim();
    if (!text || isProcessing || !effectiveShopId) return;

    setInputMessage('');
    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      const res = await api.post('/ai-front-desk/interact', {
        shopId: effectiveShopId,
        customerIdentifier: defaultCustomerIdentifier || user?.email || text,
        message: text,
        history: messages,
      });

      const reply = res.data.reply;
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      speakText(reply);

      if (res.data.taskCreated) {
        setCreatedTask(res.data.taskCreated);
      }
    } catch (err: any) {
      const errReply = 'I apologize, but I am unable to connect to the shop database right now. I have alerted the front desk to follow up with you.';
      setMessages((prev) => [...prev, { role: 'assistant', text: errReply }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPrompts = [
    'What is the status of my car (LEA-1234)?',
    'How much is my repair estimate?',
    'Is my vehicle ready for pick-up?',
    'Can I reschedule my appointment?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl flex flex-col h-[600px] overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm">AI Front Desk Voice Agent</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Connected to {currentShop?.name || 'Shop'} • Realtime DB Tools
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Notification Banner if created */}
        {createdTask && (
          <div className="bg-brand-950/60 border-b border-brand-800/60 px-4 py-2 flex items-center justify-between text-xs text-brand-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">
                SA Task Created: <strong className="text-white">{createdTask.taskDescription}</strong>
              </span>
            </div>
            <span className="text-[10px] bg-brand-800 px-2 py-0.5 rounded text-brand-100 font-mono">
              In SA Dashboard
            </span>
          </div>
        )}

        {/* Conversation Dialog */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60 shadow-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 italic">
              <Sparkles className="w-4 h-4 animate-spin text-violet-400" />
              <span>Querying live database & generating reply...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick prompt suggestions */}
        <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-500 whitespace-nowrap">Suggested:</span>
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Speak or type your question (e.g. check status of LEA-1234)..."
              disabled={isProcessing}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={isProcessing || !inputMessage.trim()}
              className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-md shadow-violet-600/30"
              title="Send to AI Front Desk"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
