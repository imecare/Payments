import { useState, useMemo, useCallback } from 'react';
import { Button, Modal, Form, Row, Col, Badge, InputGroup, Alert, Card } from 'react-bootstrap';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiShoppingCart, FiDollarSign, FiCalendar, FiCreditCard } from 'react-icons/fi';
import ResponsiveTable, { type Column } from '../components/ResponsiveTable';
import StatCard from '../components/StatCard';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useCrudForm } from '../shared/hooks/useCrudForm';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '../features/expenses/hooks/useExpenses';
import type { Expense, CreateExpenseDTO } from '../shared/types';

const getTodayDate = (): string => new Date().toISOString().split('T')[0];

const emptyExpense: CreateExpenseDTO = {
  date: getTodayDate(),
  description: '',
  cost: 0,
  paymentType: 'Cash',
  months: null,
};

const mapExpenseToForm = (e: Expense): CreateExpenseDTO => ({
  date: e.date ? e.date.split('T')[0] : getTodayDate(),
  description: e.description,
  cost: e.cost,
  paymentType: e.paymentType,
  months: e.months ?? null,
});

export default function ExpensesPage() {
  const { data: expenses = [], isLoading, error, refetch } = useExpenses();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const {
    showModal, isEditing, editingId, formData, setFormData,
    formErrors, setFormErrors, handleOpenModal, handleCloseModal,
  } = useCrudForm<CreateExpenseDTO, Expense>({ emptyForm: emptyExpense, mapEntityToForm: mapExpenseToForm });

  const [searchTerm, setSearchTerm] = useState('');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenses;
    const term = searchTerm.toLowerCase();
    return expenses.filter((e) => e.description.toLowerCase().includes(term));
  }, [expenses, searchTerm]);

  // Totales
  const totals = useMemo(() => {
    const total = expenses.reduce((acc, e) => acc + e.cost, 0);
    const now = new Date();
    const monthTotal = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, e) => acc + e.cost, 0);
    const installmentsTotal = expenses
      .filter((e) => e.paymentType === 'Installments')
      .reduce((acc, e) => acc + e.cost, 0);
    return { total, monthTotal, installmentsTotal };
  }, [expenses]);

  const monthlyAmount = useMemo(() => {
    if (formData.paymentType !== 'Installments' || !formData.months || formData.months <= 0) return null;
    return formData.cost / formData.months;
  }, [formData]);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.description.trim()) errors.description = 'La descripción es obligatoria.';
    if (!formData.cost || formData.cost <= 0) errors.cost = 'El costo debe ser mayor a 0.';
    if (!formData.date) errors.date = 'La fecha es obligatoria.';
    if (formData.paymentType === 'Installments') {
      if (!formData.months || formData.months < 2) errors.months = 'Indica al menos 2 meses.';
      else if (formData.months > 60) errors.months = 'Máximo 60 meses.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, setFormErrors]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const payload: CreateExpenseDTO = {
        date: formData.date,
        description: formData.description.trim(),
        cost: Number(formData.cost),
        paymentType: formData.paymentType,
        months: formData.paymentType === 'Installments' ? Number(formData.months) : null,
      };

      if (isEditing && editingId !== null) {
        updateMutation.mutate(
          { id: editingId, data: payload },
          { onSuccess: () => handleCloseModal() }
        );
      } else {
        createMutation.mutate(payload, { onSuccess: () => handleCloseModal() });
      }
    },
    [validate, formData, isEditing, editingId, updateMutation, createMutation, handleCloseModal]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!expenseToDelete) return;
    deleteMutation.mutate(expenseToDelete.id, {
      onSuccess: () => setExpenseToDelete(null),
    });
  }, [expenseToDelete, deleteMutation]);

  if (isLoading) return <LoadingSpinner message="Cargando compras..." fullPage />;
  if (error) return <ErrorAlert error={error} title="Error al cargar compras" onRetry={refetch} />;

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      header: 'Fecha',
      isCardTitle: true,
      render: (e) => (
        <span className="text-muted">
          <FiCalendar className="me-1" />
          {new Date(e.date).toLocaleDateString('es-MX')}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (e) => e.description,
    },
    {
      key: 'cost',
      header: 'Costo',
      className: 'text-end fw-bold',
      render: (e) => `$${e.cost.toLocaleString()}`,
    },
    {
      key: 'paymentType',
      header: 'Forma de pago',
      render: (e) =>
        e.paymentType === 'Installments' ? (
          <Badge bg="info">
            <FiCreditCard className="me-1" />
            A meses ({e.months})
          </Badge>
        ) : (
          <Badge bg="success">
            <FiDollarSign className="me-1" />
            Contado
          </Badge>
        ),
    },
    {
      key: 'monthly',
      header: 'Mensualidad',
      className: 'text-end',
      render: (e) =>
        e.paymentType === 'Installments' && e.monthlyAmount
          ? `$${e.monthlyAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
          : <span className="text-muted">—</span>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      isActions: true,
      render: (e) => (
        <div className="d-flex gap-2 justify-content-center">
          <Button variant="outline-primary" size="sm" title="Editar" onClick={() => handleOpenModal(e)}>
            <FiEdit2 />
          </Button>
          <Button variant="outline-danger" size="sm" title="Eliminar" onClick={() => setExpenseToDelete(e)}>
            <FiTrash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">
            <FiShoppingCart className="me-2" />
            Compras / Gastos
          </h2>
          <p className="text-muted mb-0">Registro de compras y gastos del negocio</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <FiPlus className="me-2" />
          Nueva compra
        </Button>
      </div>

      {/* Stats */}
      <Row className="g-3 mb-4">
        <Col sm={6} lg={4}>
          <StatCard
            title="Gastos del mes"
            value={`$${totals.monthTotal.toLocaleString()}`}
            icon={<FiCalendar />}
            variant="danger"
          />
        </Col>
        <Col sm={6} lg={4}>
          <StatCard
            title="Total gastado"
            value={`$${totals.total.toLocaleString()}`}
            icon={<FiDollarSign />}
            variant="primary"
          />
        </Col>
        <Col sm={6} lg={4}>
          <StatCard
            title="Compras a meses"
            value={`$${totals.installmentsTotal.toLocaleString()}`}
            icon={<FiCreditCard />}
            variant="info"
          />
        </Col>
      </Row>

      {/* Search + Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <InputGroup className="mb-3">
            <InputGroup.Text><FiSearch /></InputGroup.Text>
            <Form.Control
              placeholder="Buscar por descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          {deleteMutation.isError && (
            <ErrorAlert error={deleteMutation.error} title="Error al eliminar compra" />
          )}

          <ResponsiveTable<Expense>
            data={filteredExpenses}
            columns={columns}
            keyExtractor={(e) => e.id}
            emptyMessage="No hay compras registradas"
          />
        </Card.Body>
      </Card>

      {/* Create / Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{isEditing ? 'Editar compra' : 'Nueva compra'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {(createMutation.isError || updateMutation.isError) && (
              <ErrorAlert
                error={createMutation.error ?? updateMutation.error}
                title="Error al guardar compra"
              />
            )}

            <Form.Group className="mb-3">
              <Form.Label>Fecha</Form.Label>
              <Form.Control
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                isInvalid={!!formErrors.date}
              />
              <Form.Control.Feedback type="invalid">{formErrors.date}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="¿Qué se compró o en qué se gastó?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                isInvalid={!!formErrors.description}
              />
              <Form.Control.Feedback type="invalid">{formErrors.description}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Costo</Form.Label>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  isInvalid={!!formErrors.cost}
                />
                <Form.Control.Feedback type="invalid">{formErrors.cost}</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Forma de pago</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check
                  type="radio"
                  id="pay-cash"
                  name="paymentType"
                  label="Efectivo (contado)"
                  checked={formData.paymentType === 'Cash'}
                  onChange={() => setFormData({ ...formData, paymentType: 'Cash', months: null })}
                />
                <Form.Check
                  type="radio"
                  id="pay-installments"
                  name="paymentType"
                  label="A meses"
                  checked={formData.paymentType === 'Installments'}
                  onChange={() => setFormData({ ...formData, paymentType: 'Installments', months: formData.months ?? 3 })}
                />
              </div>
            </Form.Group>

            {formData.paymentType === 'Installments' && (
              <Form.Group className="mb-2">
                <Form.Label>Número de meses</Form.Label>
                <Form.Control
                  type="number"
                  min={2}
                  max={60}
                  value={formData.months ?? ''}
                  onChange={(e) => setFormData({ ...formData, months: parseInt(e.target.value, 10) || null })}
                  isInvalid={!!formErrors.months}
                />
                <Form.Control.Feedback type="invalid">{formErrors.months}</Form.Control.Feedback>
                {monthlyAmount !== null && (
                  <Alert variant="info" className="mt-2 mb-0 py-2">
                    Mensualidad estimada:{' '}
                    <strong>${monthlyAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>{' '}
                    x {formData.months} meses
                  </Alert>
                )}
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        show={!!expenseToDelete}
        onHide={() => setExpenseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar compra"
        message={`¿Seguro que deseas eliminar la compra "${expenseToDelete?.description}"?`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
