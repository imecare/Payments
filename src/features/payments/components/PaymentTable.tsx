import { Table, Badge, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { FiClock } from 'react-icons/fi';
import { usePaymentsBySale, calculateSaleBalance } from '../hooks/usePayments';

interface PaymentTableProps {
  saleId: number;
  totalAmount: number;
}

const METHOD_LABELS: Record<string, { label: string; bg: string }> = {
  Cash:     { label: 'Efectivo',        bg: 'success' },
  Card:     { label: 'Tarjeta',         bg: 'primary' },
  Transfer: { label: 'Transferencia',   bg: 'info'    },
};

export default function PaymentTable({ saleId, totalAmount }: PaymentTableProps) {
  const { data: payments = [], isLoading, error } = usePaymentsBySale(saleId);

  if (isLoading) {
    return (
      <div className="d-flex align-items-center gap-2 py-3 text-muted">
        <Spinner size="sm" animation="border" />
        <span>Cargando abonos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="py-2">
        No se pudo cargar el historial de abonos.
      </Alert>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="d-flex align-items-center gap-2 py-3 text-muted">
        <FiClock />
        <span>Sin abonos registrados.</span>
      </div>
    );
  }

  const balance = calculateSaleBalance(totalAmount, payments);

  return (
    <>
      {/* Balance summary */}
      <div className="mb-3">
        <div className="d-flex justify-content-between small text-muted mb-1">
          <span>
            Pagado: <strong className="text-success">${balance.totalPaid.toLocaleString()}</strong>
            {' / '}${totalAmount.toLocaleString()}
          </span>
          <span>
            {balance.isPaid ? (
              <Badge bg="success">Liquidada</Badge>
            ) : (
              <>Pendiente: <strong className="text-danger">${balance.remainingBalance.toLocaleString()}</strong></>
            )}
          </span>
        </div>
        <ProgressBar
          now={balance.progress}
          variant={balance.isPaid ? 'success' : 'primary'}
          animated={!balance.isPaid}
          label={`${balance.progress.toFixed(0)}%`}
          style={{ height: '10px' }}
        />
      </div>

      {/* Payments table */}
      <Table size="sm" hover responsive className="mb-0">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Método</th>
            <th>Referencia</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p, idx) => {
            const method = METHOD_LABELS[p.paymentMethod] ?? { label: p.paymentMethod, bg: 'secondary' };
            return (
              <tr key={p.id}>
                <td className="text-muted">{idx + 1}</td>
                <td>{new Date(p.date).toLocaleDateString('es-MX')}</td>
                <td className="fw-semibold">${p.amount.toLocaleString()}</td>
                <td>
                  <Badge bg={method.bg}>{method.label}</Badge>
                </td>
                <td className="text-muted">{p.reference || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
