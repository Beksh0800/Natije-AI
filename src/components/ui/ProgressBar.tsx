import './ProgressBar.css';

interface ProgressBarProps {
  value: number;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
  label?: string;
  showValue?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  maxValue = 100,
  size = 'md',
  color = 'default',
  label,
  showValue = false,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);

  const barClasses = [
    'progress-bar',
    size !== 'md' ? `progress-bar-${size}` : '',
  ].filter(Boolean).join(' ');

  const fillClasses = [
    'progress-bar-fill',
    color !== 'default' ? `progress-bar-fill-${color}` : '',
  ].filter(Boolean).join(' ');

  if (label || showValue) {
    return (
      <div className={`progress-bar-container ${className}`}>
        <div className="progress-bar-header">
          {label && <span className="progress-bar-label">{label}</span>}
          {showValue && (
            <span className="progress-bar-value">
              {value}/{maxValue}
            </span>
          )}
        </div>
        <div className={barClasses}>
          <div className={fillClasses} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${barClasses} ${className}`}>
      <div className={fillClasses} style={{ width: `${percentage}%` }} />
    </div>
  );
}
