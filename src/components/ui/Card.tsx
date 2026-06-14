import type { ReactNode, HTMLAttributes } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'compact' | 'flush' | 'accent' | 'glow';
  padding?: string;
  children: ReactNode;
}

export default function Card({
  variant = 'default',
  padding,
  children,
  className = '',
  ...props
}: CardProps) {
  const classes = [
    'card',
    variant !== 'default' ? `card-${variant}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

// Sub-components
export function CardHeader({ children, className = '', ...props }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-header ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, icon, className = '', ...props }: { children: ReactNode; icon?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-title ${className}`} {...props}>
      {icon && <span className="card-title-icon">{icon}</span>}
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-body ${className}`} {...props}>{children}</div>;
}

export function CardFooter({ children, className = '', ...props }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-footer ${className}`} {...props}>{children}</div>;
}
