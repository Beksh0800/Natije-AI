// @ts-nocheck
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Home, FileText, MessageCircle, Calendar, TrendingUp,
  BookOpen, Award, Lightbulb, Folder, PlusCircle,
  Upload, HelpCircle, Bot, Users, CheckCircle,
  BarChart2, Bell, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarColor, getInitials } from '../../utils/avatar';

import './Sidebar.css';

const iconMap: Record<string, React.ReactNode> = {
  'home': <Home size={18} />,
  'file-text': <FileText size={18} />,
  'message-circle': <MessageCircle size={18} />,
  'calendar': <Calendar size={18} />,
  'trending-up': <TrendingUp size={18} />,
  'book-open': <BookOpen size={18} />,
  'award': <Award size={18} />,
  'lightbulb': <Lightbulb size={18} />,
  'folder': <Folder size={18} />,
  'plus-circle': <PlusCircle size={18} />,
  'upload': <Upload size={18} />,
  'help-circle': <HelpCircle size={18} />,
  'bot': <Bot size={18} />,
  'users': <Users size={18} />,
  'check-circle': <CheckCircle size={18} />,
  'bar-chart-2': <BarChart2 size={18} />,
  'bell': <Bell size={18} />,
};

import { studentNavItems, teacherNavItems, quickActions } from '../../data/mockData';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onChatOpen?: () => void;
}

export default function Sidebar({ isOpen = true, onClose, onChatOpen }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const parentNavItems = [
    { label: 'Бала үлгерімі', path: '/parent', icon: 'users' }
  ];

  const navItems = user?.role === 'teacher' 
    ? teacherNavItems 
    : user?.role === 'parent' 
      ? parentNavItems 
      : studentNavItems;

  const initials = getInitials(user?.name);
  const bgColor = getAvatarColor(user?.id || user?.email || '', user?.role);

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap />
          </div>
          <div className="sidebar-logo-text">
            <h1>NÄTIJE AI</h1>
            <p>Smart Learning Ecosystem</p>
          </div>
        </div>

        {/* Profile */}
        <div 
          className="sidebar-profile" 
          onClick={() => navigate('/settings')}
          style={{ cursor: 'pointer' }}
          title="Кабинетке өту"
        >
          <div className="sidebar-profile-inner">
            <div 
              className="sidebar-avatar sidebar-avatar-online" 
              style={{ 
                backgroundImage: user?.avatar ? `url(${user.avatar})` : 'none', 
                backgroundColor: bgColor,
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600'
              }}
            >
              {!user?.avatar && initials}
            </div>
            <div className="sidebar-profile-info">
              <h3>{user?.name || 'Пайдаланушы'}</h3>
              <p>{user?.classInfo || ''}</p>
            </div>
          </div>
        </div>



        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${
                location.pathname === item.path ? 'sidebar-nav-item-active' : ''
              }`}
            >
              <span className="sidebar-nav-icon">
                {iconMap[item.icon] || <FileText size={18} />}
              </span>
              <span>{item.label}</span>
              {'badge' in item && (item as unknown).badge && <span className="sidebar-nav-badge">{(item as unknown).badge}</span>}
            </Link>
          ))}
        </nav>

        {/* Quick Actions */}
        {user?.role === 'teacher' && (
          <div className="sidebar-quick-actions">
            <p className="sidebar-quick-label">Қысқа әрекеттер</p>
            {quickActions.map((action, idx) => (
              <button
                key={action.label}
                className={`sidebar-quick-btn ${idx === 0 ? 'sidebar-quick-btn-primary' : ''}`}
                onClick={() => {
                  if (action.label === 'Жаңа тапсырма') {
                    navigate('/teacher/upload');
                  } else if (action.label === 'Сұрақ қою' || action.label === 'AI көмекші чат') {
                    if (onChatOpen) onChatOpen();
                  }
                }}
              >
                <span className="sidebar-nav-icon">
                  {iconMap[action.icon] || <PlusCircle size={18} />}
                </span>
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <button 
            className="sidebar-quick-btn" 
            style={{ width: '100%', marginTop: 'auto', color: 'var(--color-error)' }}
            onClick={logout}
          >
            <span className="sidebar-nav-icon">🚪</span>
            Шығу
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'sidebar-overlay-visible' : ''}`}
        onClick={onClose}
      />
    </>
  );
}
