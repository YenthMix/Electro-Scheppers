'use client';
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useAuth } from './AuthProvider';

// Load config from environment variables
const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface Message {
  id: string;
  text?: string;
  image?: string;
  isBot: boolean;
  receivedAt?: string;
  timestamp?: number;
}

interface ChatContextType {
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  isChatOpen: boolean;
  unreadCount: number;
  inputValue: string;
  setInputValue: (value: string) => void;
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome-1', text: "Hallo! Hoe kan ik u vandaag helpen?", isBot: true }
  ]);
  const [displayedMessageIds, setDisplayedMessageIds] = useState(new Set(['welcome-1']));
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageId, setLastReadMessageId] = useState('welcome-1');
  const [chatSettings, setChatSettings] = useState<any>(null);
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setChatSettings(settings);
      
      // Update welcome message if it exists
      if (settings.welcomeMessage && messages.length > 0 && messages[0].id === 'welcome-1') {
        setMessages(prev => [
          { ...prev[0], text: settings.welcomeMessage },
          ...prev.slice(1)
        ]);
      }
    }
  }, []);

  // Listen for storage changes and custom events to update settings in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chatSettings' && e.newValue) {
        const settings = JSON.parse(e.newValue);
        setChatSettings(settings);
        
        // Update welcome message if it exists
        if (settings.welcomeMessage && messages.length > 0 && messages[0].id === 'welcome-1') {
          setMessages(prev => [
            { ...prev[0], text: settings.welcomeMessage },
            ...prev.slice(1)
          ]);
        }
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail && e.detail.settings) {
        setChatSettings(e.detail.settings);
        
        // Update welcome message if it exists
        if (e.detail.settings.welcomeMessage && messages.length > 0 && messages[0].id === 'welcome-1') {
          setMessages(prev => [
            { ...prev[0], text: e.detail.settings.welcomeMessage },
            ...prev.slice(1)
          ]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('chatSettingsChanged', handleCustomStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatSettingsChanged', handleCustomStorageChange as EventListener);
    };
  }, [messages]);

  // Only initialize chat if user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initializeChatAPI();
    }
  }, [isAuthenticated]);

  // Auto-close chat when navigating to different pages
  useEffect(() => {
    const handleRouteChange = () => {
      setIsChatOpen(false);
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    const animationFrameId = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [messages.length]);

  // Update unread count when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only count bot messages as unread, not user messages or loading states
      if (lastMessage.isBot && lastMessage.id !== lastReadMessageId && !isChatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages, lastReadMessageId, isChatOpen]);

  const initializeChatAPI = async () => {
    try {
      const userResponse = await fetch(`${BACKEND_URL}/api/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!userResponse.ok) {
        throw new Error(`User creation failed: ${userResponse.status}`);
      }
      
      const userData = await userResponse.json();
      
      if (!userData.userKey) {
        throw new Error('User key missing from backend response');
      }
      
      setUserKey(userData.userKey);
      
      const convResponse = await fetch(`${BACKEND_URL}/api/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userKey: userData.userKey })
      });
      
      if (!convResponse.ok) {
        throw new Error(`Conversation creation failed: ${convResponse.status}`);
      }
      
      const convData = await convResponse.json();
      
      if (!convData.conversation?.id) {
        throw new Error('Conversation ID missing from backend response');
      }
      
      setConversationId(convData.conversation.id);
      setUserId(userData.user.id);
      setIsConnected(true);
      
    } catch (error) {
      console.error('Failed to initialize chat API:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: "Failed to connect to Botpress. Please make sure the backend server is running with 'npm run backend'.",
        isBot: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const sendToBotpress = async (userMessage: string) => {
    if (!conversationId) {
      throw new Error('Not connected to chat system');
    }

    try {
      const sendTimestamp = new Date().toISOString();
      console.log(`🔵 Tracking user message at ${sendTimestamp}: "${userMessage}" for conversation: ${conversationId}`);
      
      // First, track the user message so backend can distinguish it from bot response
      const trackingResponse = await fetch(`${BACKEND_URL}/api/track-user-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          text: userMessage
        })
      });

      if (!trackingResponse.ok) {
        console.error('❌ Failed to track user message:', trackingResponse.status);
        throw new Error('Failed to track user message');
      }

      const trackingResult = await trackingResponse.json();
      console.log(`✅ User message tracking response at ${sendTimestamp}:`, trackingResult);

      // Small delay to ensure tracking is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`🚀 Sending to N8N at ${sendTimestamp}: "${userMessage}"`);
      
      // Then send to N8N
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          text: userMessage,
          userKey
        })
      });

      if (!response.ok) {
        throw new Error(`N8N error: ${response.status}`);
      }

      const data = await response.json();
      pollForBotResponse();
      return data;
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const pollForBotResponse = async () => {
    if (!conversationId) {
      console.error('Cannot poll - missing conversationId');
      setIsLoading(false);
      return;
    }

    const maxAttempts = 60; // Increased from 30 to 60 attempts
    let attempts = 0;
    let consecutiveEmptyPolls = 0;
    const maxEmptyPolls = 20; // Increased from 12 to 20
    let lastMessageCount = 0;

    const poll = async () => {
      try {
        const pollTimestamp = new Date().toISOString();
        console.log(`🔍 Polling attempt ${attempts + 1}/${maxAttempts} at ${pollTimestamp} for conversation:`, conversationId);
        const botResponseRes = await fetch(`${BACKEND_URL}/api/bot-response/${conversationId}`);
        
        if (botResponseRes.ok) {
          const botData = await botResponseRes.json();
          
          if (botData.messages && botData.messages.length > 0) {
            console.log(`✅ Received ${botData.messages.length} bot messages at ${pollTimestamp}:`, botData.messages);
            
            // Check if we have new messages
            const currentMessageCount = botData.messages.length;
            if (currentMessageCount > lastMessageCount) {
              // We're making progress, reset consecutive empty polls
              consecutiveEmptyPolls = 0;
              lastMessageCount = currentMessageCount;
            }
            
            // Add new messages that haven't been displayed yet
            const newMessages = botData.messages
              .filter((msg: any) => !displayedMessageIds.has(msg.id))
              .map((msg: any) => ({
                ...msg,
                isBot: true // Ensure all bot messages are marked as bot messages
              }));
            
            if (newMessages.length > 0) {
              setMessages(prev => [...prev, ...newMessages]);
              setDisplayedMessageIds(prev => new Set([...prev, ...newMessages.map((msg: any) => msg.id)]));
              setIsLoading(false);
              return; // Success, stop polling
            } else {
              consecutiveEmptyPolls++;
            }
          } else {
            consecutiveEmptyPolls++;
          }
        } else {
          console.error(`❌ Bot response poll failed: ${botResponseRes.status}`);
          consecutiveEmptyPolls++;
        }
        
        attempts++;
        
        // More lenient stopping conditions
        if (attempts >= maxAttempts) {
          console.log(`🛑 Stopping poll after ${attempts} attempts (max reached)`);
          setIsLoading(false);
          // Add a timeout message
          const timeoutMessage = {
            id: `timeout-${Date.now()}`,
            text: "Het duurt langer dan verwacht om een antwoord te krijgen. Probeer uw vraag opnieuw te stellen of neem contact op met Elektro Scheppers.",
            isBot: true,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, timeoutMessage]);
          return;
        }
        
        if (consecutiveEmptyPolls >= maxEmptyPolls) {
          console.log(`🛑 Stopping poll after ${consecutiveEmptyPolls} consecutive empty polls`);
          setIsLoading(false);
          return;
        }
        
        // Continue polling with longer intervals for longer waits
        const pollInterval = attempts < 20 ? 2000 : 3000; // Slower polling after 20 attempts
        setTimeout(poll, pollInterval);
        
      } catch (error) {
        console.error('Error polling for bot response:', error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          console.log(`🛑 Stopping poll after ${attempts} attempts due to errors`);
          setIsLoading(false);
          // Add an error message
          const errorMessage = {
            id: `error-${Date.now()}`,
            text: "Er is een probleem opgetreden bij het ophalen van het antwoord. Probeer het opnieuw.",
            isBot: true,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
        
        const pollInterval = attempts < 20 ? 2000 : 3000;
        setTimeout(poll, pollInterval);
      }
    };
    
    poll();
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading || !isConnected) return;
    
    // Add user message immediately
    const userMessageObj = {
      id: `user-${Date.now()}`,
      text: userMessage,
      isBot: false,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessageObj]);
    setIsLoading(true);
    
    try {
      await sendToBotpress(userMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: "Sorry, I couldn't send your message. Please try again.",
        isBot: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isConnected) return;
    
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    if (!isChatOpen) {
      // Opening chat - mark all messages as read
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        setLastReadMessageId(lastMessage.id);
        setUnreadCount(0);
      }
    }
    setIsChatOpen(!isChatOpen);
  };

  const contextValue: ChatContextType = {
    messages,
    isConnected,
    isLoading,
    isChatOpen,
    unreadCount,
    inputValue,
    setInputValue,
    toggleChat,
    sendMessage
  };

    // Check if we're on the chat management page
  const [isOnChatBeherenPage, setIsOnChatBeherenPage] = useState(false);

  useEffect(() => {
    const checkPath = () => {
      if (typeof window !== 'undefined') {
        const isOnChatBeheren = window.location.pathname === '/chat-beheren';
        setIsOnChatBeherenPage(isOnChatBeheren);
        
        // Close chat window when on chat management page
        if (isOnChatBeheren && isChatOpen) {
          setIsChatOpen(false);
        }
      }
    };

    // Check on mount
    checkPath();

    // Listen for route changes
    const handleRouteChange = () => {
      checkPath();
    };

    window.addEventListener('popstate', handleRouteChange);
    
    // Also check periodically for route changes (for Next.js client-side routing)
    const interval = setInterval(checkPath, 100);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      clearInterval(interval);
    };
  }, [isChatOpen]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
      
      {/* Floating Chat Bubble - Only show when authenticated and not on chat management page */}
      {isAuthenticated && !isOnChatBeherenPage && (
        <div 
          className={`chat-bubble ${isChatOpen ? 'open' : ''}`} 
          onClick={toggleChat}
          style={{
            backgroundColor: chatSettings?.bubbleColor || '#de3f30',
            color: chatSettings?.bubbleTextColor || '#ffffff'
          }}
        >
          <div className="bubble-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="currentColor"/>
              <path d="M7 9H17V11H7V9ZM7 12H14V14H7V12Z" fill="currentColor"/>
            </svg>
          </div>
          {isLoading && (
            <div className="bubble-badge loading">...</div>
          )}
          {!isLoading && unreadCount > 0 && (
            <div className="bubble-badge">{unreadCount}</div>
          )}
        </div>
      )}

      {/* Chat Window - Only show when authenticated and not on chat management page */}
      {isAuthenticated && !isOnChatBeherenPage && (
        <div 
          className={`chat-window ${isChatOpen ? 'open' : ''}`}
          style={{
            width: chatSettings?.chatWindowWidth || 480,
            height: chatSettings?.chatWindowHeight || 600,
            backgroundColor: chatSettings?.theme === 'dark' ? '#1a1a1a' : '#ffffff',
            color: chatSettings?.theme === 'dark' ? '#ffffff' : '#333333'
          }}
        >
        <div className="chat-header" style={{
          backgroundColor: chatSettings?.bubbleColor || '#de3f30',
          color: chatSettings?.bubbleTextColor || '#ffffff'
        }}>
          <div className="chat-header-content">
            <div className="chat-logo">
              <div className="logo-mark">
                <div className="logo-s"></div>
                <div className="logo-square"></div>
              </div>
              <div className="logo-text">
                <span>ELEKTRO</span>
                <span>SCHEPPERS</span>
              </div>
            </div>
            <div className="chat-title">{chatSettings?.botName || 'Saar'}</div>
            <div className={`connection-status ${isConnected ? 'connected' : 'connecting'}`}>
              {isConnected ? '🟢 Verbonden' : '🟡 Verbinden...'}
            </div>
          </div>
          <button className="close-button" onClick={toggleChat}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        
        <div 
          className="chat-messages"
          style={{
            backgroundColor: chatSettings?.theme === 'dark' ? '#2a2a2a' : '#f8f8f8'
          }}
        >
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
            >
              <div 
                className="message-content"
                style={{
                  backgroundColor: message.isBot 
                    ? (chatSettings?.theme === 'dark' ? '#3a3a3a' : '#ffffff')
                    : (chatSettings?.bubbleColor || '#de3f30'),
                  color: message.isBot 
                    ? (chatSettings?.theme === 'dark' ? '#ffffff' : '#333333')
                    : (chatSettings?.bubbleTextColor || '#ffffff')
                }}
              >
                {message.text && <div className="message-text">{message.text}</div>}
                {message.image && (
                  <div className="message-image">
                    <img 
                      src={message.image} 
                      alt="Chat image" 
                      onError={(e) => {
                        console.error('Failed to load image:', message.image);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot-message">
              <div className="message-content loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.7 }}>
                  Bot is responding...
                </div>
              </div>
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
        
        <div 
          className="chat-input"
          style={{
            backgroundColor: chatSettings?.theme === 'dark' ? '#1a1a1a' : '#ffffff',
            borderTop: `1px solid ${chatSettings?.theme === 'dark' ? '#333333' : '#e0e0e0'}`
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !isConnected 
                ? "Verbinden met Botpress..." 
                : isLoading 
                  ? "Bot is typing..." 
                  : "Type uw bericht hier..."
            }
            className="message-input"
            disabled={isLoading || !isConnected}
            style={{
              backgroundColor: chatSettings?.theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
              color: chatSettings?.theme === 'dark' ? '#ffffff' : '#333333',
              border: `1px solid ${chatSettings?.theme === 'dark' ? '#444444' : '#e0e0e0'}`
            }}
          />
          <button 
            onClick={handleSendMessage} 
            className={`send-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || !isConnected}
            style={{
              backgroundColor: chatSettings?.bubbleColor || '#de3f30',
              color: chatSettings?.bubbleTextColor || '#ffffff'
            }}
          >
            {!isConnected ? 'Verbinden...' : isLoading ? '...' : 'Versturen'}
          </button>
        </div>
      </div>
      )}
    </ChatContext.Provider>
  );
} 