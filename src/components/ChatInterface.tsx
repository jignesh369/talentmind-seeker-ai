
import React, { useState } from 'react';
import { MessageCircle, Send, Sparkles, Bot } from 'lucide-react';

interface ChatInterfaceProps {
  onSearch: (query: string) => void;
}

type Message = {
  type: 'assistant' | 'user';
  content: string;
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSearch }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'assistant',
      content: '🚀 Hi! I\'m your AI-powered talent scout. I use advanced AI to find, validate, and enrich candidate profiles. Try: "Senior ML engineer with PyTorch, 5+ years, San Francisco or remote"'
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { type: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    onSearch(input);

    // Enhanced AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        type: 'assistant',
        content: `🔍 Searching for candidates matching: "${input}". I'm using AI to validate profiles, enrich data with real-time web search, and rank by relevance. This ensures you get only high-quality, verified candidates!`
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);

    setInput('');
  };

  const sampleQueries = [
    "Senior React developer with TypeScript, 4+ years",
    "ML Engineer with Python and TensorFlow, remote",
    "Full-stack engineer with Node.js and AWS experience",
    "DevOps engineer with Kubernetes, San Francisco",
    "Data Scientist with R and SQL, 3+ years experience"
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-fit sticky top-24">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Talent Scout</h3>
            <p className="text-sm text-slate-600">Enhanced with OpenAI & Perplexity</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Messages */}
        <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-slate-800 border border-blue-100'
              }`}>
                {message.type === 'assistant' && (
                  <Sparkles className="w-4 h-4 inline mr-2 text-blue-500" />
                )}
                <span className="text-sm leading-relaxed">{message.content}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your ideal candidate (be specific for better AI matching)..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
              rows={3}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Enhanced Sample Queries */}
        <div className="mt-4">
          <p className="text-xs text-slate-600 mb-3 flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-powered examples (click to try):
          </p>
          <div className="space-y-2">
            {sampleQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => setInput(query)}
                className="block w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded transition-colors border border-blue-100 hover:border-blue-200"
              >
                <span className="font-medium">"{query}"</span>
              </button>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-700 font-medium mb-1">✨ AI Enhancement Features:</p>
            <ul className="text-xs text-green-600 space-y-1">
              <li>• Real-time profile validation</li>
              <li>• Web-based profile enrichment</li>
              <li>• Intelligent relevance ranking</li>
              <li>• Quality filtering & scoring</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
