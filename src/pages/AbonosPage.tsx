import { useState, useMemo } from 'react';
import {
  Container, Row, Col, Card, Table, Modal, Badge,
  Button, InputGroup, Form,
} from 'react-bootstrap';
import { FiSearch, FiDollarSign, FiCheckCircle, FiClock, FiPlus } from 'react-icons/fi';
import { useSales } from '../features/sales/hooks/useSales';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import StatCard from '../components/StatCard';
import PaymentForm from '../features/payments/components/PaymentForm';
import PaymentTable from '../features/payments/components/PaymentTable';
import type { Sale } from '../shared/types';

// ============================================
// TYPES
// ============================================
type Filter = 'all' | 'pending' | 'paid';

// ============================================
// PAGE
// ============================================
export default function AbonosPage() {
  const { data: sales = [], isLoading, error, refetch } = useSales();
  const { data: customers = [] } = useCustomers();

  // Modal state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // ----------------------------------------
  // Derived data
  // ----------------------------------------
  const getCustomerName = (customerId: number) => {
    const c = customers.find((x) => x.id === customerId);
    return c ? `${c.name} ${c.lastName}` : `Cliente #${customerId}`;
  };

  const filteredSales = useMemo(() => {
    let result = sales;

    if (filter === 'pending') result = result.filter((s) => !s.isPaid);
    if (filter === 'paid')    result = result.filter((s) => s.isPaid);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          String(s.id).includes(term) ||
          getCustomerName(s.customerId).toLowerCase().includes(term)
      );
    }

    return result;
  }, [sales, filter, searchTerm, customers]);

  const stats = useMemo(() => {
    const total        = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const paid         = sales.filter((s) => s.isPaid).length;
    const pending      = sales.filter((s) => !s.isPaid).length;
    const collected    = sales
      .flatMap((s) => s.payments ?? s.payment ?? [])
      .filter((p) => p.paymentTypeId === 2)
      .reduce((acc, p) => acc + p.amount, 0);

    return { total, paid, pending, collected };
  }, [sales]);

  // ----------------------------------------
  // Handlers
  // ----------------------------------------
  const openModal = (sale: Sale) => {
    setSelectedSale(sale);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSale(null);
  };

  // ----------------------------------------
  // Render
  // ----------------------------------------
  if (isLoading) return <LoadingSpinner fullPage message="Cargando ventas..." />;
  if (error)     return <ErrorAlert error={error} title="Error al cargar ventas" onRetry={refetch} />;

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Abonos</h2>
          <p className="text-muted mb-0">Gestiona los pagos y abonos por venta</p>
        </div>
      </div>

      {/* Stats */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Total facturado"
            value={`$${stats.total.toLocaleString()}`}
            icon={<FiDollarSign size={20} />}
            variant="primary"
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Cobrado"
            value={`$${stats.collected.toLocaleString()}`}
            icon={<FiCheckCircle size={20} />}
            variant="success"
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Ventas pagadas"
            value={stats.paid}
            icon={<FiCheckCircle size={20} />}
            variant="success"
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Ventas pendientes"
            value={stats.pending}
            icon={<FiClock size={20} />}
            variant="warning"
          />
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body className="py-3">
          <Row className="g-2 align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text><FiSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Buscar por cliente o # venta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={6} className="d-flex gap-2 justify-content-md-end">
              {(['all', 'pending', 'paid'] as Filter[]).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'primary' : 'outline-secondary'}
                  onClick={() => setFilter(f)}
                >
                  {{ all: 'Todas', pending: 'Pendientes', paid: 'Liquidadas' }[f]}
                </Button>
              ))}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Sales table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No se encontraron ventas.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="text-muted">{sale.id}</td>
                    <td>{getCustomerName(sale.customerId)}</td>
                    <td className="fw-semibold">${sale.totalAmount.toLocaleString()}</td>
                    <td>
                      <Badge bg={sale.isPaid ? 'success' : 'warning'}>
                        {sale.isPaid ? 'Liquidada' : 'Pendiente'}
                      </Badge>
                    </td>
                    <td className="text-muted">
                      {new Date(sale.date).toLocaleDateString('es-MX')}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => openModal(sale)}
                      >
                        <FiPlus className="me-1" />
                        Abonos
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Abonos Modal */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Abonos — Venta #{selectedSale?.id}{' '}
            <span className="text-muted fw-normal fs-6">
              {selectedSale && getCustomerName(selectedSale.customerId)}
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSale && (
            <>
              {/* History */}
              <h6 className="mb-3">Historial de abonos</h6>
              <PaymentTable
                saleId={selectedSale.id}
                totalAmount={selectedSale.totalAmount}
              />

              {/* New payment form */}
              {!selectedSale.isPaid && (
                <>
                  <hr />
                  <h6 className="mb-3">Registrar nuevo abono</h6>
                  <PaymentForm
                    saleId={selectedSale.id}
                    onSuccess={closeModal}
                  />
                </>
              )}

              {selectedSale.isPaid && (
                <div className="text-center text-success py-3">
                  <FiCheckCircle size={24} className="mb-2" />
                  <p className="mb-0">Esta venta ya está completamente liquidada.</p>
                </div>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
