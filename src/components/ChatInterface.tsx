
import React, { useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  onSearch: (query: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSearch }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      type: 'assistant' as const,
      content: 'Hi! I\'m here to help you find AI and ML talent. Try something like "Senior Python backend engineer with FastAPI experience, 5+ years, remote work in India"'
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { type: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    onSearch(input);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage = {
        type: 'assistant' as const,
        content: `Searching for candidates matching: "${input}". I've found ${Math.floor(Math.random() * 20 + 10)} potential matches across GitHub, Stack Overflow, and Reddit. Check the results on the right!`
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);

    setInput('');
  };

  const sampleQueries = [
    "ML Engineer with PyTorch experience",
    "Data Scientist, remote, 3+ years",
    "Senior Python developer with AI background"
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-fit sticky top-24">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Search Assistant</h3>
            <p className="text-sm text-slate-600">Describe your ideal candidate</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Messages */}
        <div className="space-y-4 mb-6 max-h-80 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {message.type === 'assistant' && (
                  <Sparkles className="w-4 h-4 inline mr-2 text-blue-500" />
                )}
                <span className="text-sm">{message.content}</span>
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
              placeholder="Describe the candidate you're looking for..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
            <button
              type="submit"
              className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Sample Queries */}
        <div className="mt-4">
          <p className="text-xs text-slate-600 mb-2">Try these examples:</p>
          <div className="space-y-2">
            {sampleQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => setInput(query)}
                className="block w-full text-left text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded transition-colors"
              >
                "{query}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
