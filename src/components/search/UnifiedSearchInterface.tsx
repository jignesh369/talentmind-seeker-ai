
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageCircle, Settings, Sparkles, Bot, Send } from 'lucide-react';
import { AdvancedSearchPanel } from './AdvancedSearchPanel';

interface UnifiedSearchInterfaceProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  searchQuery: string;
}

type Message = {
  type: 'assistant' | 'user';
  content: string;
};

export const UnifiedSearchInterface = ({ 
  onSearch, 
  isSearching, 
  searchQuery 
}: UnifiedSearchInterfaceProps) => {
  const [activeTab, setActiveTab] = useState<'search' | 'chat'>('search');
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [chatInput, setChatInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'assistant',
      content: '🚀 Hi! I\'m your AI talent scout. Describe your ideal candidate and I\'ll find them for you.'
    }
  ]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: Message = { type: 'user', content: chatInput };
    setMessages(prev => [...prev, userMessage]);
    onSearch(chatInput);

    setTimeout(() => {
      const assistantMessage: Message = {
        type: 'assistant',
        content: `🔍 Searching for: "${chatInput}". Using AI to find and validate the best candidates for you!`
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);

    setChatInput('');
  };

  const quickSearches = [
    'Senior React Developer',
    'Python AI Engineer', 
    'Full Stack JavaScript',
    'DevOps AWS Expert'
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI-Powered Search</h3>
            <p className="text-sm text-slate-600">Find the perfect candidates</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Advanced
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'chat')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Quick Search
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <form onSubmit={handleQuickSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g., 'Senior React Developer in SF' or 'Python AI Engineer'"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1"
                disabled={isSearching}
              />
              <Button 
                type="submit" 
                disabled={isSearching || !inputValue.trim()}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-slate-600">Quick searches:</span>
            {quickSearches.map((quick) => (
              <button
                key={quick}
                onClick={() => {
                  setInputValue(quick);
                  onSearch(quick);
                }}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                disabled={isSearching}
              >
                {quick}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-slate-800 border border-blue-100'
                }`}>
                  {message.type === 'assistant' && (
                    <Sparkles className="w-4 h-4 inline mr-2 text-blue-500" />
                  )}
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleChatSubmit} className="relative">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Describe your ideal candidate in detail..."
              className="pr-12 resize-none"
              rows={3}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!chatInput.trim() || isSearching}
              className="absolute bottom-2 right-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <AdvancedSearchPanel
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        onSearch={onSearch}
        currentQuery={inputValue}
      />
    </div>
  );
};
