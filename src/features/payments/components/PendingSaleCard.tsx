import { Card, Badge, ProgressBar } from 'react-bootstrap';
import type { Sale } from '@/shared/types';

interface PendingSaleCardProps {
  sale: Sale;
  customerName: string;
  onSelect: () => void;
  isSelected: boolean;
}

/** Sale list card — uses server-computed balance fields to avoid N+1 requests */
export default function PendingSaleCard({ sale, customerName, onSelect, isSelected }: PendingSaleCardProps) {
  const paid = sale.paidAmount ?? 0;
  const remaining = sale.remainingBalance ?? Math.max(0, sale.totalAmount - paid);
  const progress = sale.paymentProgress ?? (sale.totalAmount > 0 ? Math.min(100, (paid / sale.totalAmount) * 100) : 0);

  // Truncar descripción a 20 caracteres
  const truncatedDescription = sale.productDescription
    ? sale.productDescription.length > 20
      ? `${sale.productDescription.substring(0, 20)}...`
      : sale.productDescription
    : '';

  return (
    <Card
      className={`mb-3 ${isSelected ? 'border-primary border-2' : ''}`}
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 className="mb-1">{customerName}</h6>
            <small className="text-muted">
              Venta #{sale.id}{truncatedDescription ? `: ${truncatedDescription}` : ''}
            </small>
          </div>
          <Badge bg={sale.isPaid ? 'success' : 'warning'} text={sale.isPaid ? undefined : 'dark'}>
            {sale.isPaid ? 'Liquidada' : 'Pendiente'}
          </Badge>
        </div>

        <div className="d-flex justify-content-between mb-2">
          <span>Total: <strong>${sale.totalAmount.toLocaleString()}</strong></span>
          <span className="text-danger">Debe: <strong>${remaining.toLocaleString()}</strong></span>
        </div>

        <ProgressBar
          now={progress}
          variant={sale.isPaid ? 'success' : 'primary'}
          style={{ height: '8px' }}
        />
        <small className="text-muted d-block mt-1 text-end">
          {progress.toFixed(0)}% pagado
        </small>
      </Card.Body>
    </Card>
  );
}
