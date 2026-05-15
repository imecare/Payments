import { useState } from 'react';
import { Modal, Row, Col, Card, Table, Badge, Alert, Button, ProgressBar, Form } from 'react-bootstrap';
import type { Sale, Payment } from '@/shared/types';
import { PAYMENT_TYPE_ABONO } from '@/features/payments/hooks/usePayments';

interface SaleDetailModalProps {
  sale: Sale | null;
  show: boolean;
  onHide: () => void;
  onPayCommission: (paid: boolean, note?: string) => void;
  isPayingCommission: boolean;
  canPayCommission: boolean;
}

/**
 * Read-only detail modal for a sale.
 * Uses server-computed paidAmount/remainingBalance/paymentProgress from the DTO —
 * no separate payments request needed for the balance summary.
 * Payment history is read from sale.payments (already embedded in DTO).
 */
export default function SaleDetailModal({
  sale,
  show,
  onHide,
  onPayCommission,
  isPayingCommission,
  canPayCommission,
}: SaleDetailModalProps) {
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionNote, setCommissionNote] = useState('');
  const [commissionAction, setCommissionAction] = useState<'pay' | 'revert'>('pay');

  if (!sale) return null;

  const paid = sale.paidAmount ?? 0;
  const remaining = sale.remainingBalance ?? Math.max(0, sale.totalAmount - paid);
  const progress = sale.paymentProgress ?? (sale.totalAmount > 0 ? Math.min(100, (paid / sale.totalAmount) * 100) : 0);
  const isPaid = sale.isPaid;
  const profit = sale.totalAmount - (sale.costPrice ?? 0);
  const netProfit = profit - sale.commissionAmount;

  const abonos = (sale.payments ?? []).filter((p: Payment) => p.paymentTypeId === PAYMENT_TYPE_ABONO);

  const handleOpenCommissionModal = (action: 'pay' | 'revert') => {
    setCommissionAction(action);
    setCommissionNote('');
    setShowCommissionModal(true);
  };

  const handleConfirmCommission = () => {
    onPayCommission(commissionAction === 'pay', commissionNote || undefined);
    setShowCommissionModal(false);
    setCommissionNote('');
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalle de Venta #{sale.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Balance summary */}
        <Row className="mb-4">
          <Col md={4}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted">Total Venta</h6>
                <h3 className="text-primary">${sale.totalAmount.toLocaleString()}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted">Pagado</h6>
                <h3 className="text-success">${paid.toLocaleString()}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted">Pendiente</h6>
                <h3 className="text-danger">${remaining.toLocaleString()}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Progress */}
        <div className="mb-4">
          <div className="d-flex justify-content-between mb-2">
            <span>Progreso de pago</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <ProgressBar
            now={progress}
            variant={isPaid ? 'success' : 'primary'}
            animated={!isPaid}
          />
        </div>

        <Row className="mb-4">
          <Col md={12} className="mb-3">
            <h6>Descripción de la venta</h6>
            <p className="mb-0 text-muted">{sale.productDescription?.trim() || 'Sin descripción registrada.'}</p>
          </Col>
          <Col md={6}>
            <h6>Información Financiera</h6>
            <Table size="sm" borderless>
              <tbody>
                <tr>
                  <td className="text-muted">Costo:</td>
                  <td>${(sale.costPrice ?? 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="text-muted">Ganancia bruta:</td>
                  <td>${profit.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="text-muted">Comisión vendedor:</td>
                  <td>${sale.commissionAmount.toLocaleString()}</td>
                </tr>
                <tr className="table-active">
                  <td className="text-muted fw-bold">Ganancia neta:</td>
                  <td className="fw-bold">${netProfit.toLocaleString()}</td>
                </tr>
              </tbody>
            </Table>
          </Col>
          <Col md={6}>
            <h6>Estado</h6>
            <div className="mb-2">
              <Badge bg={isPaid ? 'success' : 'warning'} className="me-2">
                {isPaid ? 'Liquidada' : 'Pendiente de pago'}
              </Badge>
              <Badge bg={sale.isCommissionPaid ? 'success' : 'secondary'}>
                Comisión: {sale.isCommissionPaid ? 'Pagada' : 'Pendiente'}
              </Badge>
            </div>

            {/* Botón para pagar comisión */}
            {canPayCommission && isPaid && !sale.isCommissionPaid && (
              <Alert variant="info" className="mt-3">
                <small>La venta está liquidada. Puedes pagar la comisión al vendedor.</small>
                <div className="mt-2">
                  <Button
                    variant="success" size="sm"
                    onClick={() => handleOpenCommissionModal('pay')}
                    disabled={isPayingCommission}
                  >
                    {isPayingCommission ? 'Procesando...' : 'Marcar comisión como pagada'}
                  </Button>
                </div>
              </Alert>
            )}

            {/* Botón para revertir comisión */}
            {canPayCommission && sale.isCommissionPaid && (
              <Alert variant="success" className="mt-3">
                <small>
                  Comisión pagada{sale.commissionPaidAt ? ` el ${new Date(sale.commissionPaidAt).toLocaleDateString('es-MX')}` : ''}.
                </small>
                <div className="mt-2">
                  <Button
                    variant="outline-warning" size="sm"
                    onClick={() => handleOpenCommissionModal('revert')}
                    disabled={isPayingCommission}
                  >
                    {isPayingCommission ? 'Procesando...' : 'Revertir pago de comisión'}
                  </Button>
                </div>
              </Alert>
            )}
          </Col>
        </Row>

        {/* Modal de confirmación para comisión */}
        <Modal show={showCommissionModal} onHide={() => setShowCommissionModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {commissionAction === 'pay' ? 'Confirmar pago de comisión' : 'Revertir pago de comisión'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              {commissionAction === 'pay'
                ? `¿Confirmas que se pagó la comisión de $${sale.commissionAmount.toLocaleString()} al vendedor?`
                : `¿Estás seguro de revertir el pago de comisión de $${sale.commissionAmount.toLocaleString()}?`
              }
            </p>
            <Form.Group>
              <Form.Label>Nota (opcional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder={commissionAction === 'pay' ? 'Ej: Pagado en efectivo' : 'Ej: Error de registro'}
                value={commissionNote}
                onChange={(e) => setCommissionNote(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCommissionModal(false)}>
              Cancelar
            </Button>
            <Button
              variant={commissionAction === 'pay' ? 'success' : 'warning'}
              onClick={handleConfirmCommission}
              disabled={isPayingCommission}
            >
              {isPayingCommission ? 'Procesando...' : 'Confirmar'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Payment history — from embedded sale.payments */}
        <h6>Historial de Abonos</h6>
        {abonos.length === 0 ? (
          <Alert variant="light">No hay abonos registrados</Alert>
        ) : (
          <Table size="sm" striped hover className="table-responsive-cards">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Referencia</th>
              </tr>
            </thead>
            <tbody>
              {abonos.map((payment: Payment) => (
                <tr key={payment.id}>
                  <td data-label="Fecha">{new Date(payment.date).toLocaleDateString('es-MX')}</td>
                  <td data-label="Monto" className="text-success">${payment.amount.toLocaleString()}</td>
                  <td data-label="Método">
                    <Badge bg="light" text="dark">
                      {payment.paymentMethod === 'Cash' && 'Efectivo'}
                      {payment.paymentMethod === 'Card' && 'Tarjeta'}
                      {payment.paymentMethod === 'Transfer' && 'Transferencia'}
                    </Badge>
                  </td>
                  <td data-label="Referencia">{payment.reference || '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}
