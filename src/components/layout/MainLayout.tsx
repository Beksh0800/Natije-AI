import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatPanel from '../chat/ChatPanel';
import { teacherChatMessages } from '../../data/mockData';
import './MainLayout.css';

interface MainLayoutProps {
  children: ReactNode;
  breadcrumbs?: { label: string; path?: string }[];
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="main-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onChatOpen={() => setChatOpen(true)}
      />
      <div className="main-content-wrapper">
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="main-content">
          {children}
        </main>
      </div>

      {chatOpen && (
        <div className="chat-drawer">
          <ChatPanel 
            title="AI көмекші"
            messages={teacherChatMessages}
            suggestions={[
              "AI талдау қалай жұмыс істейді?",
              "Сыныпты қалай құруға болады?",
              "Бағалау критерийлері қандай?"
            ]}
            onClose={() => setChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
