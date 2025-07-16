'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pdfsApi, aiApi } from '@/lib/api';
import { PDF, Message } from '@/types';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Send,
  FileText,
  Bot,
  User,
  Loader2,
  FileDown,
  NotebookPen,
} from 'lucide-react';
import AIResponse from '@/components/AIResponse';

export default function ChatPage() {
  const [pdf, setPdf] = useState<PDF | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams();
  const pdfId = params.id as string;

  useEffect(() => {
    console.log('🔍 useEffect triggered with pdfId:', pdfId);
    // Check authentication
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      console.log('❌ No token found, redirecting to auth');
      router.push('/auth');
      return;
    }

    if (pdfId) {
      console.log('🔍 Calling fetchPDF...');
      fetchPDF();
    }
  }, [pdfId, router]);

  useEffect(() => {
    // Only scroll to bottom for new messages (not when loading history)
    if (!loadingHistory && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loadingHistory]);

  const fetchPDF = async () => {
    try {
      console.log('🔍 Fetching PDF with ID:', pdfId);
      const pdfData = await pdfsApi.get(pdfId);
      console.log('🔍 PDF data fetched:', pdfData);
      setPdf(pdfData);
      
      // Show welcome message immediately
      const welcomeMessage: Message = {
        role: 'assistant',
        content: `Hello! I'm ready to help you analyze "${pdfData.originalName}". What would you like to know about this document?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      
      // Load conversation history first
      console.log('🔍 Loading conversation history...');
      await loadConversationHistory(1, true);
      
    } catch (error) {
      console.error('❌ Error fetching PDF:', error);
      toast.error('Failed to load PDF');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationHistory = async (page: number = 1, isInitial: boolean = false) => {
    console.log('🔍 loadConversationHistory called:', { page, isInitial, pdfId });
    
    if (loadingHistory || (!hasMore && !isInitial)) {
      console.log('🔍 Skipping load - conditions not met:', { loadingHistory, hasMore, isInitial });
      return;
    }
    
    // Store scroll position before loading
    const container = messagesContainerRef.current;
    const scrollHeightBefore = container?.scrollHeight || 0;
    
    setLoadingHistory(true);
    try {
      console.log('🔍 Calling getConversationHistory API...');
      const response = await aiApi.getConversationHistory(pdfId, page, 20);
      console.log('🔍 API response:', response);
      
      if (response.messages.length > 0) {
        const formattedMessages: Message[] = response.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        }));

        console.log('🔍 Formatted messages:', formattedMessages.length);

        if (isInitial) {
          // For initial load, replace welcome message with history
          setMessages(formattedMessages.reverse());
          console.log('🔍 Replaced welcome message with history');
        } else {
          // For pagination, add older messages at the beginning
          setMessages(prev => [...formattedMessages.reverse(), ...prev]);
          console.log('🔍 Added paginated messages');
          
          // Restore scroll position after loading
          setTimeout(() => {
            if (container) {
              const scrollHeightAfter = container.scrollHeight;
              container.scrollTop = scrollHeightAfter - scrollHeightBefore;
            }
          }, 100);
        }
        
        // Update pagination state
        setCurrentPage(page);
        setHasMore(response.pagination.hasMore);
        setHistoryLoaded(true);
      } else if (isInitial) {
        // No history found, keep the welcome message that was already set
        console.log('🔍 No history found, keeping welcome message');
        setHistoryLoaded(true);
      }
    } catch (error) {
      console.error('❌ Error loading conversation history:', error);
      if (isInitial) {
        // On error, keep the welcome message that was already set
        console.log('🔍 Error loading history, keeping welcome message');
        setHistoryLoaded(true);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || !historyLoaded) return;
    
    const container = messagesContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollThreshold = 100; // Load more when user scrolls within 100px of top
    
    if (scrollTop <= scrollThreshold && hasMore && !loadingHistory) {
      loadConversationHistory(currentPage + 1);
    }
  }, [hasMore, loadingHistory, currentPage, historyLoaded]);

  // Add scroll event listener with debouncing
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    container.addEventListener('scroll', debouncedScroll);
    return () => {
      container.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      const response = await aiApi.chat(pdfId, userMessage.content, conversationId);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation ID if this was the first message
      if (!conversationId && response.conversationId) {
        setConversationId(response.conversationId);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!pdf || generatingNotes) return;

    setGeneratingNotes(true);
    try {
      const response = await aiApi.generateNotes(pdfId);
      toast.success('Notes generated successfully! Check your Notes section.');
    } catch (error) {
      console.error('Note generation error:', error);
      toast.error('Failed to generate notes');
    } finally {
      setGeneratingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg mb-4 inline-block">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Loading your chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200/50 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="mr-4 p-2 hover:bg-blue-50 rounded-xl transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded-xl shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {pdf?.originalName || 'Chat with PDF'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    AI-powered document analysis
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleGenerateNotes}
                disabled={generatingNotes || !pdf}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingNotes ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </>
                ) : (
                  <>
                    <NotebookPen className="h-4 w-4" />
                    <span className="text-sm">Generate Notes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages - with top padding to account for fixed header and bottom padding for fixed input */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 relative pt-20 pb-20">
        {/* Loading overlay for previous messages */}
        {loadingHistory && (
          <div className="absolute top-20 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm p-4 flex justify-center">
            <div className="flex items-center space-x-2 text-gray-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm">Loading previous messages...</span>
            </div>
          </div>
        )}
        
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Welcome message when no messages exist */}
          {messages.length === 0 && !loading && !loadingHistory && (
            <div className="flex justify-center py-12">
              <div className="text-center max-w-md">
                <div className="flex justify-center mb-6">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Welcome to PDF Chat!
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  I'm ready to help you analyze "{pdf?.originalName || 'this document'}". 
                  Ask me anything about the content, structure, or key insights from this PDF.
                </p>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'user' ? (
                <div className="flex items-end space-x-3 max-w-xs lg:max-w-md">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-lg">
                    <p className="text-sm font-medium whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-1 text-blue-100">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full shadow-lg">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-4xl">
                  <div className="flex items-start space-x-3">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-full shadow-lg flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-tl-md shadow-lg border border-gray-200/50">
                        <AIResponse 
                          content={message.content} 
                          timestamp={message.timestamp} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {sending && (
            <div className="flex justify-start">
              <div className="w-full max-w-4xl">
                <div className="flex items-start space-x-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-full shadow-lg flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-tl-md shadow-lg border border-gray-200/50">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-500">Analyzing document...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Message Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200/50 p-4 fixed bottom-0 left-0 right-0 z-40 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about this PDF..."
              disabled={sending}
              className="flex-1 px-4 py-3 bg-gray-50/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-gray-900 placeholder-gray-500 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={sending || !inputMessage.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-md hover:shadow-lg"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
