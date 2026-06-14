import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Search, MessageSquare, Loader } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { sendMessage, markMessageAsRead } from '../../services/messages';
import type { AppMessage } from '../../services/messages';
import './ChatPage.css';

interface ChatUser {
  id: string;
  name: string;
  lastMessage?: AppMessage;
  unreadCount: number;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUserId = searchParams.get('userId');

  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!db || !user?.id) return;

    setLoading(true);

    // Fetch all messages where user is either sender or receiver
    const q = query(
      collection(db, 'messages'),
      or(
        where('senderId', '==', user.id),
        where('receiverId', '==', user.id)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data: AppMessage[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as AppMessage));
      
      data.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tA - tB; // Ascending for chat
      });
      
      setMessages(data);

      // Group into chat users
      const usersMap = new Map<string, ChatUser>();
      
      // If we came from a specific link, make sure they are in the list even if no messages yet
      if (initialUserId && initialUserId !== user.id) {
        usersMap.set(initialUserId, {
          id: initialUserId,
          name: searchParams.get('name') || 'Пайдаланушы',
          unreadCount: 0
        });
      }

      data.forEach(msg => {
        const isSentByMe = msg.senderId === user.id;
        const otherUserId = isSentByMe ? msg.receiverId : msg.senderId;
        const otherUserName = isSentByMe ? (msg as any).receiverName || 'Пайдаланушы' : msg.senderName; // Note: we don't have receiverName in schema, but we can try to guess or just say 'Пайдаланушы' for now if sent. Actually, we should save receiverName in future.

        if (!usersMap.has(otherUserId)) {
          usersMap.set(otherUserId, {
            id: otherUserId,
            name: otherUserName,
            unreadCount: 0
          });
        }
        
        const cUser = usersMap.get(otherUserId)!;
        cUser.lastMessage = msg;
        
        // Use senderName for better display if it wasn't set correctly
        if (!isSentByMe) {
          cUser.name = msg.senderName;
        }

        if (!isSentByMe && !msg.read) {
          cUser.unreadCount++;
        }
      });

      const usersList = Array.from(usersMap.values());
      usersList.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt?.toMillis ? a.lastMessage.createdAt.toMillis() : 0;
        const timeB = b.lastMessage?.createdAt?.toMillis ? b.lastMessage.createdAt.toMillis() : 0;
        return timeB - timeA; // Descending for sidebar
      });
      
      setChatUsers(usersList);
      
      // Auto-select first user if none selected
      if (!selectedUserId && usersList.length > 0) {
        setSelectedUserId(usersList[0].id);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync messages", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, initialUserId, searchParams]);

  const selectedUser = chatUsers.find(u => u.id === selectedUserId);
  const selectedMessages = messages.filter(m => 
    (m.senderId === user?.id && m.receiverId === selectedUserId) ||
    (m.senderId === selectedUserId && m.receiverId === user?.id)
  );

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark messages as read
    selectedMessages.forEach(msg => {
      if (msg.receiverId === user?.id && !msg.read && msg.id) {
        markMessageAsRead(msg.id).catch(e => console.error(e));
      }
    });
  }, [selectedMessages, user?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUserId) return;

    try {
      setIsSending(true);
      await sendMessage({
        senderId: user.id,
        senderName: user.name,
        receiverId: selectedUserId,
        text: newMessage.trim(),
      });
      setNewMessage('');
      
      // Remove URL params after sending first message
      if (searchParams.has('userId')) {
        setSearchParams({});
      }
    } catch (error) {
      toast.error('Хабарлама жіберу кезінде қате шықты');
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = chatUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <MainLayout breadcrumbs={[{ label: 'Хабарламалар' }]}>
      <div className="chat-page-container">
        
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h2 className="chat-sidebar-title">Чаттар</h2>
            <div className="chat-search">
              <Search size={16} className="chat-search-icon" />
              <input 
                type="text" 
                placeholder="Іздеу..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="chat-search-input"
              />
            </div>
          </div>
          
          <div className="chat-list">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader className="spin" size={24} />
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(u => (
                <div 
                  key={u.id} 
                  className={`chat-list-item ${selectedUserId === u.id ? 'active' : ''}`}
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <div className="chat-avatar">
                    {u.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="chat-list-info">
                    <div className="chat-list-name">{u.name}</div>
                    {u.lastMessage && (
                      <div className="chat-list-preview">
                        {u.lastMessage.senderId === user?.id ? 'Сіз: ' : ''}{u.lastMessage.text}
                      </div>
                    )}
                  </div>
                  {u.unreadCount > 0 && (
                    <div style={{ background: 'var(--color-error)', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {u.unreadCount}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                Табылмады
              </div>
            )}
          </div>
        </div>

        {/* Main Area */}
        <div className="chat-main">
          {selectedUser ? (
            <>
              <div className="chat-main-header">
                <div className="chat-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                  {selectedUser.name.substring(0, 1).toUpperCase()}
                </div>
                <div className="chat-main-name">{selectedUser.name}</div>
              </div>
              
              <div className="chat-messages">
                {selectedMessages.length > 0 ? (
                  selectedMessages.map(msg => {
                    const isSent = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`chat-message-row ${isSent ? 'sent' : 'received'}`}>
                        <div className="chat-bubble">
                          {msg.text}
                        </div>
                        <div className="chat-time">
                          {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="chat-empty-state">
                    <MessageSquare size={48} style={{ color: 'var(--border-color)', marginBottom: '16px' }} />
                    <p>Хабарламалар тарихы бос.</p>
                    <p style={{ fontSize: '0.875rem' }}>Бірінші болып жазыңыз!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-container" onSubmit={handleSend}>
                <textarea 
                  className="chat-input" 
                  placeholder="Хабарламаңызды жазыңыз..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  rows={1}
                />
                <button type="submit" className="chat-send-btn" disabled={!newMessage.trim() || isSending}>
                  {isSending ? <Loader className="spin" size={18} /> : <Send size={18} />}
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">
                <MessageSquare size={32} />
              </div>
              <h3>Кері байланыс чаты</h3>
              <p style={{ maxWidth: '300px', marginTop: '8px' }}>
                Сол жақтағы тізімнен пайдаланушыны таңдап, хабарлама жазуды бастаңыз.
              </p>
            </div>
          )}
        </div>
        
      </div>
    </MainLayout>
  );
}
