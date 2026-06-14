import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { ToastType } from '../../contexts/ToastContext';
import './Toast.css';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const iconMap = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  info: <Info size={20} />,
  warning: <AlertTriangle size={20} />,
};

export default function Toast({ message, type, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation 500ms before removal
    const timer = setTimeout(() => setIsExiting(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast toast-${type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}>
      <span className="toast-icon">{iconMap[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
