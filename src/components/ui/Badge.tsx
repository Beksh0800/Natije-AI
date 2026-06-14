import type { ReactNode, HTMLAttributes } from 'react';
import './Badge.css';

type BadgeColor = 'purple' | 'green' | 'yellow' | 'red' | 'blue' | 'pink' | 'cyan' | 'gray';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  filled?: boolean;
  dot?: boolean;
  children: ReactNode;
}

export default function Badge({
  color = 'purple',
  filled = false,
  dot = false,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const classes = [
    'badge',
    filled ? `badge-filled-${color}` : `badge-${color}`,
    dot ? 'badge-dot' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

// Notification badge (small circle with number)
export function NotificationBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`badge-notification ${className}`}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

// Status Badge for submissions
export function StatusBadge({ 
  status, 
  label 
}: { 
  status: string; 
  label: string 
}) {
  return (
    <span className={`status-badge status-badge-${status}`}>
      {label}
    </span>
  );
}
