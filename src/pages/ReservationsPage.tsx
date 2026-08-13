import { useState, useMemo, useCallback } from 'react';
import { Button, Modal, Form, Row, Col, Badge, InputGroup, Card, Alert } from 'react-bootstrap';
import {
  FiPlus, FiSearch, FiTrash2, FiCheckCircle, FiShoppingCart,
  FiDollarSign, FiBookmark, FiCalendar, FiEdit2, FiAlertTriangle,
} from 'react-icons/fi';
import ResponsiveTable, { type Column } from '../components/ResponsiveTable';
import SearchableSelect, { type SelectOption } from '../components/SearchableSelect';
import StatCard from '../components/StatCard';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import {
  useReservations,
  useCreateReservation,
  useUpdateReservation,
  useConcretizeReservation,
  useDeleteReservation,
} from '../features/reservations/hooks/useReservations';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import { useSellers } from '../features/sellers/hooks/useSellers';
import { useAuth } from '../auth/AuthContext';
import type { Reservation, CreateReservationDTO } from '../shared/types';

const todayISO = (): string => new Date().toISOString().split('T')[0];

const emptyReservation = (): CreateReservationDTO => ({
  customerId: 0,
  sellerId: undefined,
  totalAmount: 0,
  costPrice: 0,
  commissionAmount: 0,
  productDescription: '',
  date: todayISO(),
});

export default function ReservationsPage() {
  const { isCommissionist } = useAuth();
  const scope = isCommissionist ? 'mine' : 'all';
  const { data: reservations = [], isLoading, error, refetch } = useReservations(scope);
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: sellers = [], isLoading: sellersLoading } = useSellers();

  const createMutation = useCreateReservation();
  const updateMutation = useUpdateReservation();
  const concretizeMutation = useConcretizeReservation();
  const deleteMutation = useDeleteReservation();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateReservationDTO>(() => emptyReservation());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [toConcretize, setToConcretize] = useState<Reservation | null>(null);
  const [toDelete, setToDelete] = useState<Reservation | null>(null);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return reservations;
    const term = searchTerm.toLowerCase();
    return reservations.filter(
      (r) =>
        (r.customerName ?? '').toLowerCase().includes(term) ||
        r.productDescription.toLowerCase().includes(term) ||
        String(r.id).includes(term)
    );
  }, [reservations, searchTerm]);

  const totals = useMemo(() => {
    const totalAmount = reservations.reduce((acc, r) => acc + r.totalAmount, 0);
    return { count: reservations.length, totalAmount };
  }, [reservations]);

  const handleOpenModal = useCallback(() => {
    setEditingId(null);
    setFormData(emptyReservation());
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((r: Reservation) => {
    setEditingId(r.id);
    setFormData({
      customerId: r.customerId,
      sellerId: r.sellerId ?? undefined,
      totalAmount: r.totalAmount,
      costPrice: r.costPrice,
      commissionAmount: r.commissionAmount,
      productDescription: r.productDescription,
      date: r.date ? r.date.split('T')[0] : todayISO(),
    });
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyReservation());
    setFormErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (formData.customerId <= 0) errors.customerId = 'Selecciona un cliente.';
    if (formData.totalAmount <= 0) errors.totalAmount = 'El monto total debe ser mayor a 0.';
    if (formData.costPrice < 0) errors.costPrice = 'El costo no puede ser negativo.';
    if (formData.costPrice > formData.totalAmount) errors.costPrice = 'El costo no puede ser mayor al total.';
    if (formData.commissionAmount < 0) errors.commissionAmount = 'La comisión no puede ser negativa.';
    if (!formData.productDescription.trim()) errors.productDescription = 'La descripción es obligatoria.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      const payload: CreateReservationDTO = {
        ...formData,
        sellerId: formData.sellerId || undefined,
        productDescription: formData.productDescription.trim(),
      };
      if (editingId !== null) {
        updateMutation.mutate(
          { id: editingId, data: payload },
          { onSuccess: () => handleCloseModal() }
        );
      } else {
        createMutation.mutate(payload, { onSuccess: () => handleCloseModal() });
      }
    },
    [validate, formData, editingId, updateMutation, createMutation, handleCloseModal]
  );

  const handleConfirmConcretize = useCallback(() => {
    if (!toConcretize) return;
    concretizeMutation.mutate(toConcretize.id, { onSuccess: () => setToConcretize(null) });
  }, [toConcretize, concretizeMutation]);

  const handleConfirmDelete = useCallback(() => {
    if (!toDelete) return;
    deleteMutation.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
  }, [toDelete, deleteMutation]);

  if (isLoading) return <LoadingSpinner message="Cargando apartados..." fullPage />;
  if (error) return <ErrorAlert error={error} title="Error al cargar apartados" onRetry={refetch} />;

  const columns: Column<Reservation>[] = [
    {
      key: 'date',
      header: 'Fecha',
      isCardTitle: true,
      render: (r) => (
        <span className="text-muted">
          <FiCalendar className="me-1" />
          {new Date(r.date).toLocaleDateString('es-MX')}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (r) => r.customerName ?? `#${r.customerId}`,
    },
    {
      key: 'product',
      header: 'Producto',
      render: (r) => (
        <span title={r.productDescription}>
          {r.productDescription.length > 40 ? `${r.productDescription.slice(0, 40)}…` : r.productDescription}
        </span>
      ),
    },
    {
      key: 'seller',
      header: 'Vendedor',
      render: (r) => r.sellerName ?? <span className="text-muted">Sin asignar</span>,
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-end fw-bold',
      render: (r) => `$${r.totalAmount.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Estado',
      render: () => (
        <Badge bg="warning" text="dark">
          <FiBookmark className="me-1" />
          Apartado
        </Badge>
      ),
    },
  ];

  if (!isCommissionist) {
    columns.push({
      key: 'actions',
      header: 'Acciones',
      isActions: true,
      render: (r) => (
        <div className="d-flex gap-2 justify-content-center">
          <Button
            variant="success"
            size="sm"
            title="Concretar venta"
            onClick={() => setToConcretize(r)}
          >
            <FiCheckCircle className="me-1" />
            Concretar
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            title="Editar apartado"
            onClick={() => handleOpenEdit(r)}
          >
            <FiEdit2 />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            title="Eliminar apartado"
            onClick={() => setToDelete(r)}
          >
            <FiTrash2 />
          </Button>
        </div>
      ),
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">
            <FiBookmark className="me-2" />
            Apartados
          </h2>
          <p className="text-muted mb-0">Reservas de venta pendientes de concretar</p>
        </div>
        <Button variant="primary" onClick={handleOpenModal} hidden={isCommissionist}>
          <FiPlus className="me-2" />
          Nuevo apartado
        </Button>
      </div>

      {/* Stats */}
      <Row className="g-3 mb-4">
        <Col sm={6} lg={4}>
          <StatCard
            title="Apartados activos"
            value={totals.count}
            icon={<FiBookmark />}
            variant="warning"
          />
        </Col>
        <Col sm={6} lg={4}>
          <StatCard
            title="Monto apartado"
            value={`$${totals.totalAmount.toLocaleString()}`}
            icon={<FiDollarSign />}
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
              placeholder="Buscar por cliente, producto o folio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          {concretizeMutation.isError && (
            <ErrorAlert error={concretizeMutation.error} title="Error al concretar apartado" />
          )}
          {deleteMutation.isError && (
            <ErrorAlert error={deleteMutation.error} title="Error al eliminar apartado" />
          )}

          <ResponsiveTable<Reservation>
            data={filtered}
            columns={columns}
            keyExtractor={(r) => r.id}
            emptyMessage="No hay apartados registrados"
          />
        </Card.Body>
      </Card>

      {/* Create / Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingId !== null ? `Editar apartado #${editingId}` : 'Nuevo apartado'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave} noValidate>
          <Modal.Body>
            {(createMutation.isError || updateMutation.isError) && (
              <ErrorAlert
                error={createMutation.error ?? updateMutation.error}
                title={editingId !== null ? 'Error al actualizar apartado' : 'Error al crear apartado'}
              />
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cliente *</Form.Label>
                  <SearchableSelect
                    options={customers.map((c): SelectOption => ({
                      value: c.id,
                      label: `${c.name} ${c.lastName}`,
                      sublabel: c.phone,
                    }))}
                    value={formData.customerId}
                    onChange={(v) => setFormData({ ...formData, customerId: v })}
                    placeholder="Buscar por nombre o teléfono..."
                    emptyLabel={customersLoading ? 'Cargando clientes...' : 'Selecciona un cliente'}
                    isInvalid={!!formErrors.customerId}
                    disabled={customersLoading}
                  />
                  {formErrors.customerId && (
                    <div className="invalid-feedback d-block">{formErrors.customerId}</div>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vendedor</Form.Label>
                  <Form.Select
                    value={formData.sellerId ?? 0}
                    onChange={(e) => setFormData({ ...formData, sellerId: Number(e.target.value) || undefined })}
                    disabled={sellersLoading}
                  >
                    <option value={0}>Sin asignar</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name} {seller.lastName}
                      </option>
                    ))}
                  </Form.Select>
                  {!formData.sellerId && (
                    <Alert variant="warning" className="mt-2 mb-0 py-2 d-flex align-items-center">
                      <FiAlertTriangle className="me-2 flex-shrink-0" />
                      <small>No has seleccionado un vendedor. El apartado quedará sin vendedor asignado.</small>
                    </Alert>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha del apartado</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    max={todayISO()}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Descripción del producto *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Descripción detallada de los productos..."
                    value={formData.productDescription}
                    onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                    isInvalid={!!formErrors.productDescription}
                  />
                  <Form.Control.Feedback type="invalid">{formErrors.productDescription}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Monto Total *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min={0}
                      step={0.01}
                      value={formData.totalAmount || ''}
                      onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                      isInvalid={!!formErrors.totalAmount}
                      placeholder="0.00"
                    />
                    <Form.Control.Feedback type="invalid">{formErrors.totalAmount}</Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Costo (tu precio)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min={0}
                      step={0.01}
                      value={formData.costPrice || ''}
                      onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                      isInvalid={!!formErrors.costPrice}
                      placeholder="0.00"
                    />
                    <Form.Control.Feedback type="invalid">{formErrors.costPrice}</Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Comisión</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min={0}
                      step={0.01}
                      value={formData.commissionAmount || ''}
                      onChange={(e) => setFormData({ ...formData, commissionAmount: Number(e.target.value) })}
                      isInvalid={!!formErrors.commissionAmount}
                      placeholder="0.00"
                    />
                    <Form.Control.Feedback type="invalid">{formErrors.commissionAmount}</Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Guardando...'
                : editingId !== null ? 'Guardar cambios' : 'Guardar apartado'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Concretize confirmation */}
      <ConfirmModal
        show={!!toConcretize}
        onHide={() => setToConcretize(null)}
        onConfirm={handleConfirmConcretize}
        title="Concretar venta"
        message={
          <span>
            <FiShoppingCart className="me-2" />
            ¿Concretar el apartado de <strong>{toConcretize?.customerName}</strong> por{' '}
            <strong>${toConcretize?.totalAmount.toLocaleString()}</strong>? Se registrará como venta y
            se quitará de apartados.
          </span>
        }
        confirmText="Concretar venta"
        variant="success"
        isLoading={concretizeMutation.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        show={!!toDelete}
        onHide={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar apartado"
        message={`¿Seguro que deseas eliminar el apartado de "${toDelete?.customerName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
