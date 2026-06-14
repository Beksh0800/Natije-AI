import './CircularProgress.css';

interface CircularProgressProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showValue?: boolean;
  valueSuffix?: string;
  className?: string;
}

export default function CircularProgress({
  value,
  maxValue = 100,
  size = 140,
  strokeWidth = 10,
  label,
  showValue = true,
  valueSuffix = '%',
  className = '',
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getScoreClass = () => {
    if (percentage >= 85) return 'score-excellent';
    if (percentage >= 70) return 'score-good';
    if (percentage >= 50) return 'score-average';
    return 'score-poor';
  };

  const fontSize = size * 0.22;
  const labelSize = size * 0.08;

  return (
    <div className={`circular-progress ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`progress-gradient-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C5CE7" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <circle
          className="circular-progress-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={`circular-progress-fill ${getScoreClass()}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={`url(#progress-gradient-${value})`}
          style={{ '--circumference': circumference } as React.CSSProperties}
        />
      </svg>
      {showValue && (
        <div className="circular-progress-center">
          <span className="circular-progress-value" style={{ fontSize }}>
            {Math.round(percentage)}{valueSuffix}
          </span>
          {label && (
            <span className="circular-progress-label" style={{ fontSize: labelSize }}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
