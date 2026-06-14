import { useState } from 'react';
import { Sun, Moon, Bell, Mail, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarColor, getInitials } from '../../utils/avatar';
import './Header.css';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const initials = getInitials(user?.name);
  const bgColor = getAvatarColor(user?.id || user?.email || '', user?.role);

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Mobile menu button */}
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
          </button>
          
          {notificationsOpen && (
            <>
              <div className="header-dropdown-overlay" onClick={() => setNotificationsOpen(false)} />
              <div className="header-dropdown">
                <div className="header-dropdown-header">
                  <h3>Хабарландырулар</h3>
                </div>
                <div className="header-dropdown-body">
                  <div className="header-dropdown-empty">
                    <div className="header-dropdown-empty-icon">🔔</div>
                    <p>Жаңа хабарландырулар жоқ</p>
                  </div>
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
          </button>
          
          {messagesOpen && (
            <>
              <div className="header-dropdown-overlay" onClick={() => setMessagesOpen(false)} />
              <div className="header-dropdown">
                <div className="header-dropdown-header">
                  <h3>Хабарламалар</h3>
                </div>
                <div className="header-dropdown-body">
                  <div className="header-dropdown-empty">
                    <div className="header-dropdown-empty-icon">✉️</div>
                    <p>Жаңа хабарламалар жоқ</p>
                  </div>
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
