import type { ReactNode, ButtonHTMLAttributes } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  children: ReactNode;
  icon?: ReactNode;
  isLoading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  icon,
  className = '',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size !== 'md' ? `btn-${size}` : '',
    fullWidth ? 'btn-full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading ? <span className="btn-icon-wrapper" style={{ animation: 'spin 1s linear infinite' }}>↻</span> : null}
      {!isLoading && icon && <span className="btn-icon-wrapper">{icon}</span>}
      {children}
    </button>
  );
}
