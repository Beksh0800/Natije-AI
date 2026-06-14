import { useState } from 'react';
import type { Tab } from '../../types';
import './Tabs.css';

interface TabsProps {
  tabs: Tab[];
  variant?: 'default' | 'underline' | 'pill';
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export default function Tabs({
  tabs,
  variant = 'default',
  activeTab: controlledActive,
  onChange,
  className = '',
}: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id || '');
  const activeId = controlledActive ?? internalActive;

  const handleClick = (tabId: string) => {
    if (onChange) {
      onChange(tabId);
    } else {
      setInternalActive(tabId);
    }
  };

  return (
    <div className={`tabs ${variant !== 'default' ? `tabs-${variant}` : ''} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeId === tab.id ? 'tab-active' : ''}`}
          onClick={() => handleClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
