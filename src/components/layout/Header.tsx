import { useState, useEffect } from 'react';
import { Sun, Moon, Bell, Mail, Menu, X, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarColor, getInitials } from '../../utils/avatar';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { markNotificationAsRead } from '../../services/notifications';
import type { AppNotification } from '../../services/notifications';
import { markMessageAsRead } from '../../services/messages';
import type { AppMessage } from '../../services/messages';
import { useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [messages, setMessages] = useState<AppMessage[]>([]);

  const initials = getInitials(user?.name);
  const bgColor = getAvatarColor(user?.id || user?.email || '', user?.role);

  useEffect(() => {
    if (!db || !user?.id) return;

    // Listen to notifications
    const qNotif = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      limit(20)
    );

    const unsubNotif = onSnapshot(qNotif, (snapshot) => {
      let data: AppNotification[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as AppNotification));
      data.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setNotifications(data);
    });

    // Listen to messages
    const qMsg = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.id),
      limit(20)
    );

    const unsubMsg = onSnapshot(qMsg, (snapshot) => {
      let data: AppMessage[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as AppMessage));
      data.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setMessages(data);
    });

    return () => {
      unsubNotif();
      unsubMsg();
    };
  }, [user]);

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const unreadMsgCount = messages.filter(m => !m.read).length;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read && notif.id) {
      await markNotificationAsRead(notif.id);
    }
    setNotificationsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMessageClick = async (msg: AppMessage) => {
    if (!msg.read && msg.id) {
      await markMessageAsRead(msg.id);
    }
    // We can open a reply modal here or navigate to messages
    alert('Сообщение от ' + msg.senderName + ': ' + msg.text);
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="header-menu-btn" onClick={onMenuToggle}>
          <Menu size={20} />
        </button>
      </div>

      <div className="header-actions">
        {/* Theme Toggle */}
        <button className="theme-toggle" onClick={toggleTheme} title="Теманы ауыстыру">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            className={`header-icon-btn ${notificationsOpen ? 'header-icon-btn-active' : ''}`} 
            title="Хабарландырулар"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setMessagesOpen(false);
            }}
          >
            <Bell size={18} />
            {unreadNotifCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--color-error)', color: 'white', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                {unreadNotifCount}
              </span>
            )}
          </button>
          
          {notificationsOpen && (
            <>
              <div className="header-dropdown-overlay" onClick={() => setNotificationsOpen(false)} />
              <div className="header-dropdown" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <div className="header-dropdown-header">
                  <h3>Хабарландырулар</h3>
                </div>
                <div className="header-dropdown-body">
                  {notifications.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: notif.read ? 'transparent' : 'var(--bg-secondary)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
                        >
                          <div style={{ color: 'var(--accent-primary)', marginTop: '2px' }}>
                            {notif.type === 'assignment' ? <Bell size={16}/> : <CheckCircle size={16}/>}
                          </div>
                          <div>
                            <div style={{ fontWeight: notif.read ? 400 : 600, fontSize: '0.875rem', marginBottom: '4px' }}>{notif.title}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{notif.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="header-dropdown-empty">
                      <div className="header-dropdown-empty-icon">🔔</div>
                      <p>Жаңа хабарландырулар жоқ</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            className={`header-icon-btn ${messagesOpen ? 'header-icon-btn-active' : ''}`} 
            title="Хабарламалар"
            onClick={() => {
              setMessagesOpen(!messagesOpen);
              setNotificationsOpen(false);
            }}
          >
            <Mail size={18} />
            {unreadMsgCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--color-error)', color: 'white', fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                {unreadMsgCount}
              </span>
            )}
          </button>
          
          {messagesOpen && (
            <>
              <div className="header-dropdown-overlay" onClick={() => setMessagesOpen(false)} />
              <div className="header-dropdown" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <div className="header-dropdown-header">
                  <h3>Хабарламалар</h3>
                </div>
                <div className="header-dropdown-body">
                  {messages.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {messages.map(msg => (
                        <div 
                          key={msg.id} 
                          onClick={() => handleMessageClick(msg)}
                          style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: msg.read ? 'transparent' : 'var(--bg-secondary)' }}
                        >
                          <div style={{ fontWeight: msg.read ? 400 : 600, fontSize: '0.875rem', marginBottom: '4px' }}>{msg.senderName}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{msg.text}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="header-dropdown-empty">
                      <div className="header-dropdown-empty-icon">✉️</div>
                      <p>Жаңа хабарламалар жоқ</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div 
          className="header-profile" 
          onClick={() => window.location.href = '/settings'}
          style={{ cursor: 'pointer' }}
          title="Кабинетке өту"
        >
          <div className="header-profile-info">
            <div className="header-profile-name">{user?.name}</div>
            <div className="header-profile-role">{user?.classInfo}</div>
          </div>
          <div 
            className="header-profile-avatar"
            style={{ 
              backgroundImage: user?.avatar ? `url(${user.avatar})` : 'none', 
              backgroundSize: 'cover', 
              backgroundPosition: 'center',
              backgroundColor: bgColor,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600'
            }}
          >
            {!user?.avatar && initials}
          </div>
        </div>
      </div>
    </header>
  );
}
