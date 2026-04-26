import { useState } from 'react';
import { Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { FiDollarSign } from 'react-icons/fi';
import { useCreatePayment } from '../hooks/usePayments';
import type { CreatePaymentDTO, PaymentMethod } from '../api/paymentsApi';

interface PaymentFormProps {
  saleId: number;
  /** Maximum allowed amount (remaining balance). Pass 0 to skip validation. */
  maxAmount?: number;
  onSuccess?: () => void;
}

const emptyForm = (saleId: number): CreatePaymentDTO => ({
  saleId,
  amount: 0,
  paymentMethod: 'Cash',
  reference: '',
});

export default function PaymentForm({ saleId, maxAmount = 0, onSuccess }: PaymentFormProps) {
  const [form, setForm] = useState<CreatePaymentDTO>(emptyForm(saleId));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreatePayment();

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (form.amount <= 0) {
      next.amount = 'El monto debe ser mayor a 0.';
    }
    if (maxAmount > 0 && form.amount > maxAmount) {
      next.amount = `El monto no puede superar el saldo pendiente ($${maxAmount.toLocaleString()}).`;
    }
    if (form.paymentMethod !== 'Cash' && !form.reference?.trim()) {
      next.reference = 'La referencia es obligatoria para pagos con tarjeta o transferencia.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createMutation.mutate(
      { ...form, saleId },
      {
        onSuccess: () => {
          setForm(emptyForm(saleId));
          setErrors({});
          onSuccess?.();
        },
      }
    );
  };

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'Cash', label: 'Efectivo' },
    { value: 'Card', label: 'Tarjeta' },
    { value: 'Transfer', label: 'Transferencia' },
  ];

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Row className="g-3">
        {/* Amount */}
        <Col md={6}>
          <Form.Group>
            <Form.Label>Monto del abono</Form.Label>
            <div className="input-group">
              <span className="input-group-text">
                <FiDollarSign />
              </span>
              <Form.Control
                type="number"
                min={0.01}
                step={0.01}
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                isInvalid={!!errors.amount}
                placeholder="0.00"
              />
              <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
            </div>
            {maxAmount > 0 && (
              <Form.Text className="text-muted">
                Saldo pendiente: ${maxAmount.toLocaleString()}
              </Form.Text>
            )}
          </Form.Group>
        </Col>

        {/* Payment method */}
        <Col md={6}>
          <Form.Group>
            <Form.Label>Método de pago</Form.Label>
            <Form.Select
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({ ...form, paymentMethod: e.target.value as PaymentMethod, reference: '' })
              }
            >
              {paymentMethods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        {/* Reference (required for Card / Transfer) */}
        <Col md={12}>
          <Form.Group>
            <Form.Label>
              Referencia{' '}
              {form.paymentMethod === 'Cash' && (
                <span className="text-muted fw-normal">(opcional)</span>
              )}
            </Form.Label>
            <Form.Control
              type="text"
              value={form.reference ?? ''}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              isInvalid={!!errors.reference}
              placeholder={
                form.paymentMethod === 'Cash'
                  ? 'Nota adicional...'
                  : 'Número de autorización / folio de transferencia'
              }
            />
            <Form.Control.Feedback type="invalid">{errors.reference}</Form.Control.Feedback>
          </Form.Group>
        </Col>

        {/* Submit */}
        <Col md={12}>
          <Button
            type="submit"
            variant="success"
            className="w-100"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Registrando abono...' : 'Registrar abono'}
          </Button>
        </Col>
      </Row>

      {createMutation.isError && (
        <Alert variant="danger" className="mt-3 mb-0">
          Error al registrar el abono. Intenta nuevamente.
        </Alert>
      )}
    </Form>
  );
}
