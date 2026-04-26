import { Card, ProgressBar } from 'react-bootstrap';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  progress?: number;
}

/**
 * Tarjeta de estadística para el dashboard
 */
export function StatCard({
  title,
  value,
  icon,
  variant = 'primary',
  subtitle,
  progress,
}: StatCardProps) {
  const variantClasses = {
    primary: 'border-primary',
    success: 'border-success',
    warning: 'border-warning',
    danger: 'border-danger',
    info: 'border-info',
  };

  const bgClasses = {
    primary: 'bg-primary bg-opacity-10',
    success: 'bg-success bg-opacity-10',
    warning: 'bg-warning bg-opacity-10',
    danger: 'bg-danger bg-opacity-10',
    info: 'bg-info bg-opacity-10',
  };

  return (
    <Card className={`h-100 border-start border-4 ${variantClasses[variant]}`}>
      <Card.Body className={bgClasses[variant]}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-muted small mb-1 text-uppercase">{title}</p>
            <h3 className="mb-0 fw-bold">{value}</h3>
            {subtitle && <small className="text-muted">{subtitle}</small>}
          </div>
          {icon && (
            <div className={`text-${variant} fs-2 opacity-75`}>
              {icon}
            </div>
          )}
        </div>
        {progress !== undefined && (
          <ProgressBar 
            now={progress} 
            variant={variant} 
            className="mt-3" 
            style={{ height: '6px' }}
            label={`${progress.toFixed(0)}%`}
            visuallyHidden
          />
        )}
      </Card.Body>
    </Card>
  );
}

export default StatCard;
