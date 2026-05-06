import { useState } from 'react';
import { Table, Badge, Button, Modal, Form, InputGroup, Alert } from 'react-bootstrap';
import { FiEdit2, FiTrash2, FiClock } from 'react-icons/fi';
import {
  usePaymentsBySale,
  useUpdatePayment,
  useDeletePayment,
  PAYMENT_TYPE_ABONO,
} from '@/features/payments/hooks/usePayments';
import type { UpdatePaymentDTO, Payment, PaymentMethod } from '@/features/payments/api/paymentsApi';
import LoadingSpinner from '@/components/LoadingSpinner';

interface PaymentHistoryProps {
  saleId: number;
}

/** Editable/deletable list of abonos for a given sale */
export default function PaymentHistory({ saleId }: PaymentHistoryProps) {
  const { data: payments = [], isLoading } = usePaymentsBySale(saleId);
  const updateMutation = useUpdatePayment(saleId);
  const deleteMutation = useDeletePayment(saleId);

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState<UpdatePaymentDTO>({ amount: 0, paymentMethod: 'Cash', reference: '' });
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const abonos = payments.filter(p => p.paymentTypeId === PAYMENT_TYPE_ABONO);

  const openEdit = (p: Payment) => {
    setEditingPayment(p);
    setEditForm({ amount: p.amount, paymentMethod: p.paymentMethod, reference: p.reference ?? '' });
  };

  const handleUpdate = async () => {
    if (!editingPayment) return;
    await updateMutation.mutateAsync({ id: editingPayment.id, dto: editForm });
    setEditingPayment(null);
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    await deleteMutation.mutateAsync({ paymentId: deletingPayment.id, reason: deleteReason || undefined });
    setDeletingPayment(null);
    setDeleteReason('');
  };

  if (isLoading) return <LoadingSpinner message="Cargando abonos..." />;

  if (abonos.length === 0) {
    return (
      <Alert variant="light" className="text-center">
        <FiClock className="me-2" />
        No hay abonos registrados para esta venta
      </Alert>
    );
  }

  return (
    <>
      <Table size="sm" striped hover className="mt-3">
        <thead>
          <tr>
            <th>Fecha</th>
            <th className="text-end">Monto</th>
            <th>Método</th>
            <th>Referencia</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {abonos.map((payment) => (
            <tr key={payment.id}>
              <td>{new Date(payment.date).toLocaleDateString('es-MX')}</td>
              <td className="text-end text-success fw-bold">
                ${payment.amount.toLocaleString()}
              </td>
              <td>
                <Badge bg="secondary">
                  {payment.paymentMethod === 'Cash' && 'Efectivo'}
                  {payment.paymentMethod === 'Card' && 'Tarjeta'}
                  {payment.paymentMethod === 'Transfer' && 'Transferencia'}
                </Badge>
              </td>
              <td className="text-muted">{payment.reference || '-'}</td>
              <td className="text-end">
                <Button
                  variant="link" size="sm"
                  className="p-0 me-2 text-primary"
                  title="Editar abono"
                  onClick={() => openEdit(payment)}
                >
                  <FiEdit2 />
                </Button>
                <Button
                  variant="link" size="sm"
                  className="p-0 text-danger"
                  title="Eliminar abono"
                  onClick={() => { setDeletingPayment(payment); setDeleteReason(''); }}
                >
                  <FiTrash2 />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Edit Modal */}
      <Modal show={!!editingPayment} onHide={() => setEditingPayment(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Abono</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Monto *</Form.Label>
            <InputGroup>
              <InputGroup.Text>$</InputGroup.Text>
              <Form.Control
                type="number" min={0.01} step={0.01}
                value={editForm.amount || ''}
                onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })}
              />
            </InputGroup>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Método de Pago</Form.Label>
            <Form.Select
              value={editForm.paymentMethod}
              onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value as PaymentMethod })}
            >
              <option value="Cash">Efectivo</option>
              <option value="Card">Tarjeta</option>
              <option value="Transfer">Transferencia</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Referencia</Form.Label>
            <Form.Control
              type="text"
              value={editForm.reference ?? ''}
              onChange={e => setEditForm({ ...editForm, reference: e.target.value })}
              placeholder="Opcional"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingPayment(null)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            disabled={updateMutation.isPending || !editForm.amount}
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal show={!!deletingPayment} onHide={() => setDeletingPayment(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar Abono</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Estás seguro de eliminar el abono de <strong>${deletingPayment?.amount.toLocaleString()}</strong>?</p>
          <Form.Group>
            <Form.Label>Motivo (opcional)</Form.Label>
            <Form.Control
              type="text"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              placeholder="Ej. Error de captura"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeletingPayment(null)}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
