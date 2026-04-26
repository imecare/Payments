import { useState, useCallback, useMemo } from 'react';
import { 
  Button, Table, Modal, Form, Row, Col, Badge, InputGroup, 
  ProgressBar, Card, Alert 
} from 'react-bootstrap';
import { 
  FiSearch, FiPlus, FiDollarSign, FiCheckCircle, FiClock, 
  FiTrendingUp, FiPercent, FiEye 
} from 'react-icons/fi';
import { 
  useSales, 
  useCreateSale, 
  useMarkCommissionPaid,
  calculateSaleBalance,
  type Sale,
  type CreateSaleDTO
} from '../features/sales/hooks/useSales';
import { usePaymentsBySale } from '../features/payments/hooks/usePayments';
import type { Payment } from '../shared/types';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import { useSellers } from '../features/sellers/hooks/useSellers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ConfirmModal from '../components/ConfirmModal';
import StatCard from '../components/StatCard';

const emptySale: CreateSaleDTO = { 
  customerId: 0,
  sellerId: undefined,
  totalAmount: 0,
  costPrice: 0,
  commissionAmount: 0,
};

// Componente para mostrar detalles de una venta
function SaleDetailModal({ 
  sale, 
  show, 
  onHide,
  onPayCommission,
  isPayingCommission
}: { 
  sale: Sale | null; 
  show: boolean; 
  onHide: () => void;
  onPayCommission: () => void;
  isPayingCommission: boolean;
}) {
  const { data: payments = [], isLoading: loadingPayments } = usePaymentsBySale(sale?.id ?? 0);
  
  if (!sale) return null;
  
  const balance = calculateSaleBalance(sale, payments);
  const profit = sale.totalAmount - sale.costPrice;
  const netProfit = profit - sale.commissionAmount;
  
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Detalle de Venta #{sale.id}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
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
                <h3 className="text-success">${balance.totalPaid.toLocaleString()}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center h-100">
              <Card.Body>
                <h6 className="text-muted">Pendiente</h6>
                <h3 className="text-danger">${balance.remainingBalance.toLocaleString()}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <div className="mb-4">
          <div className="d-flex justify-content-between mb-2">
            <span>Progreso de pago</span>
            <span>{balance.progress.toFixed(1)}%</span>
          </div>
          <ProgressBar 
            now={balance.progress} 
            variant={balance.isPaid ? 'success' : 'primary'}
            animated={!balance.isPaid}
          />
        </div>
        
        <Row className="mb-4">
          <Col md={6}>
            <h6>Información Financiera</h6>
            <Table size="sm" borderless>
              <tbody>
                <tr>
                  <td className="text-muted">Costo:</td>
                  <td>${sale.costPrice.toLocaleString()}</td>
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
              <Badge bg={sale.isPaid ? 'success' : 'warning'} className="me-2">
                {sale.isPaid ? 'Liquidada' : 'Pendiente de pago'}
              </Badge>
              <Badge bg={sale.isCommissionPaid ? 'success' : 'secondary'}>
                Comisión: {sale.isCommissionPaid ? 'Pagada' : 'Pendiente'}
              </Badge>
            </div>
            
            {sale.isPaid && !sale.isCommissionPaid && (
              <Alert variant="info" className="mt-3">
                <small>
                  La venta está liquidada. Puedes pagar la comisión al vendedor.
                </small>
                <div className="mt-2">
                  <Button 
                    variant="success" 
                    size="sm"
                    onClick={onPayCommission}
                    disabled={isPayingCommission}
                  >
                    {isPayingCommission ? 'Procesando...' : 'Marcar comisión como pagada'}
                  </Button>
                </div>
              </Alert>
            )}
          </Col>
        </Row>
        
        <h6>Historial de Abonos</h6>
        {loadingPayments ? (
          <LoadingSpinner message="Cargando abonos..." />
        ) : payments.length === 0 ? (
          <Alert variant="light">No hay abonos registrados</Alert>
        ) : (
          <Table size="sm" striped hover>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Referencia</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment: Payment) => (
                <tr key={payment.id}>
                  <td>{new Date(payment.date).toLocaleDateString('es-MX')}</td>
                  <td className="text-success">${payment.amount.toLocaleString()}</td>
                  <td>
                    <Badge bg="light" text="dark">
                      {payment.paymentMethod === 'Cash' && 'Efectivo'}
                      {payment.paymentMethod === 'Card' && 'Tarjeta'}
                      {payment.paymentMethod === 'Transfer' && 'Transferencia'}
                    </Badge>
                  </td>
                  <td>{payment.reference || '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function SalesPage() {
  // Data fetching with React Query
  const { data: sales = [], isLoading, error, refetch } = useSales();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: sellers = [], isLoading: sellersLoading } = useSellers();
  const createMutation = useCreateSale();
  const markCommissionPaidMutation = useMarkCommissionPaid();

  // UI State
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState<CreateSaleDTO>(emptySale);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Computed values
  const stats = useMemo(() => {
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const paidSales = sales.filter(s => s.isPaid);
    const pendingCommissions = sales.filter(s => s.isPaid && !s.isCommissionPaid);
    const totalCommissionsPending = pendingCommissions.reduce((sum, s) => sum + s.commissionAmount, 0);
    
    return {
      totalSales,
      totalPaid: paidSales.reduce((sum, s) => sum + s.totalAmount, 0),
      pendingCount: sales.filter(s => !s.isPaid).length,
      pendingCommissionsCount: pendingCommissions.length,
      totalCommissionsPending,
    };
  }, [sales]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    let result = sales;
    
    if (filterStatus === 'pending') {
      result = result.filter(s => !s.isPaid);
    } else if (filterStatus === 'paid') {
      result = result.filter(s => s.isPaid);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => {
        const customer = customers.find(c => c.id === s.customerId);
        const customerName = customer ? `${customer.name} ${customer.lastName}`.toLowerCase() : '';
        return customerName.includes(term) || s.id.toString().includes(term);
      });
    }
    
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, filterStatus, searchTerm, customers]);

  // Get customer/seller names
  const getCustomerName = useCallback((customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.name} ${customer.lastName}` : 'Desconocido';
  }, [customers]);

  const getSellerName = useCallback((sellerId: number | null) => {
    if (!sellerId) return 'Sin asignar';
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? `${seller.name} ${seller.lastName}` : 'Desconocido';
  }, [sellers]);

  // Calculate profit in real-time
  const calculatedProfit = useMemo(() => {
    const profit = formData.totalAmount - formData.costPrice;
    return profit > 0 ? profit : 0;
  }, [formData.totalAmount, formData.costPrice]);

  // Handlers
  const handleOpenModal = useCallback(() => {
    setFormData(emptySale);
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setFormData(emptySale);
    setFormErrors({});
  }, []);

  const handleViewDetail = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (formData.customerId <= 0) {
      errors.customerId = 'Debe seleccionar un cliente';
    }
    
    if (formData.totalAmount <= 0) {
      errors.totalAmount = 'El monto total debe ser mayor a 0';
    }
    
    if (formData.costPrice < 0) {
      errors.costPrice = 'El costo no puede ser negativo';
    }
    
    if (formData.costPrice > formData.totalAmount) {
      errors.costPrice = 'El costo no puede ser mayor al monto total';
    }
    
    if (formData.commissionAmount < 0) {
      errors.commissionAmount = 'La comisión no puede ser negativa';
    }
    
    if (formData.commissionAmount > calculatedProfit) {
      errors.commissionAmount = 'La comisión no puede ser mayor a la ganancia';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await createMutation.mutateAsync(formData);
      handleCloseModal();
    } catch (err) {
      console.error('Error creating sale:', err);
    }
  };

  const handlePayCommission = async () => {
    if (!selectedSale) return;
    
    try {
      await markCommissionPaidMutation.mutateAsync(selectedSale.id);
      setSelectedSale({ ...selectedSale, isCommissionPaid: true });
    } catch (err) {
      console.error('Error marking commission as paid:', err);
    }
  };

  // Render
  if (isLoading) {
    return <LoadingSpinner message="Cargando ventas..." />;
  }

  if (error) {
    return <ErrorAlert error={error} title="Error al cargar ventas" onRetry={refetch} />;
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="mb-1">
            <FiTrendingUp className="me-2" />
            Ventas
          </h4>
          <p className="text-muted mb-0">
            Gestiona las ventas, abonos y comisiones
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenModal}>
          <FiPlus className="me-2" />
          Nueva Venta
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4 g-3">
        <Col sm={6} lg={3}>
          <StatCard
            title="Total Ventas"
            value={`$${stats.totalSales.toLocaleString()}`}
            icon={<FiDollarSign />}
            variant="primary"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Cobrado"
            value={`$${stats.totalPaid.toLocaleString()}`}
            icon={<FiCheckCircle />}
            variant="success"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Ventas Pendientes"
            value={stats.pendingCount}
            icon={<FiClock />}
            variant="warning"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Comisiones Pendientes"
            value={`$${stats.totalCommissionsPending.toLocaleString()}`}
            subtitle={`${stats.pendingCommissionsCount} ventas`}
            icon={<FiPercent />}
            variant="danger"
          />
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4 g-3">
        <Col md={4} lg={3}>
          <InputGroup>
            <InputGroup.Text>
              <FiSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por cliente o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4} lg={3}>
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">Todas las ventas</option>
            <option value="pending">Pendientes de pago</option>
            <option value="paid">Liquidadas</option>
          </Form.Select>
        </Col>
        <Col className="d-flex align-items-center justify-content-md-end">
          <Badge bg="secondary" className="fs-6">
            {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''}
          </Badge>
        </Col>
      </Row>

      {/* Sales Table */}
      <div className="table-responsive">
        <Table striped bordered hover className="align-middle">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th className="text-end">Total</th>
              <th className="text-end">Comisión</th>
              <th>Estado</th>
              <th style={{ width: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted">
                  No hay ventas que mostrar
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <Badge bg="light" text="dark">#{sale.id}</Badge>
                  </td>
                  <td>{new Date(sale.date).toLocaleDateString('es-MX')}</td>
                  <td>{getCustomerName(sale.customerId)}</td>
                  <td>{getSellerName(sale.sellerId)}</td>
                  <td className="text-end fw-bold">
                    ${sale.totalAmount.toLocaleString()}
                  </td>
                  <td className="text-end">
                    ${sale.commissionAmount.toLocaleString()}
                    {sale.isPaid && !sale.isCommissionPaid && (
                      <Badge bg="warning" text="dark" className="ms-2" pill>
                        Pagar
                      </Badge>
                    )}
                    {sale.isCommissionPaid && (
                      <Badge bg="success" className="ms-2" pill>
                        <FiCheckCircle />
                      </Badge>
                    )}
                  </td>
                  <td>
                    {sale.isPaid ? (
                      <Badge bg="success">Liquidada</Badge>
                    ) : (
                      <Badge bg="warning" text="dark">Pendiente</Badge>
                    )}
                  </td>
                  <td>
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={() => handleViewDetail(sale)}
                      aria-label="Ver detalle"
                    >
                      <FiEye />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Create Sale Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nueva Venta</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave} noValidate>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cliente *</Form.Label>
                  <Form.Select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: Number(e.target.value) })}
                    isInvalid={!!formErrors.customerId}
                    disabled={customersLoading}
                  >
                    <option value={0}>Selecciona un cliente</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.lastName}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.customerId}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vendedor</Form.Label>
                  <Form.Select
                    value={formData.sellerId ?? 0}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      sellerId: Number(e.target.value) || undefined 
                    })}
                    disabled={sellersLoading}
                  >
                    <option value={0}>Sin asignar</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name} {seller.lastName}
                      </option>
                    ))}
                  </Form.Select>
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
                    <Form.Control.Feedback type="invalid">
                      {formErrors.totalAmount}
                    </Form.Control.Feedback>
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
                    <Form.Control.Feedback type="invalid">
                      {formErrors.costPrice}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Comisión Vendedor</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min={0}
                      step={0.01}
                      max={calculatedProfit}
                      value={formData.commissionAmount || ''}
                      onChange={(e) => setFormData({ ...formData, commissionAmount: Number(e.target.value) })}
                      isInvalid={!!formErrors.commissionAmount}
                      placeholder="0.00"
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.commissionAmount}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            {/* Summary */}
            <Card bg="light" className="mt-3">
              <Card.Body>
                <Row className="text-center">
                  <Col>
                    <small className="text-muted d-block">Ganancia Bruta</small>
                    <strong className="text-success">${calculatedProfit.toLocaleString()}</strong>
                  </Col>
                  <Col>
                    <small className="text-muted d-block">- Comisión</small>
                    <strong className="text-warning">${(formData.commissionAmount || 0).toLocaleString()}</strong>
                  </Col>
                  <Col>
                    <small className="text-muted d-block">= Ganancia Neta</small>
                    <strong className="text-primary">
                      ${(calculatedProfit - (formData.commissionAmount || 0)).toLocaleString()}
                    </strong>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Crear Venta'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        sale={selectedSale}
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        onPayCommission={handlePayCommission}
        isPayingCommission={markCommissionPaidMutation.isPending}
      />

      {/* Error Alerts */}
      {createMutation.isError && (
        <ErrorAlert error={createMutation.error} title="Error al crear venta" />
      )}
    </div>
  );
}
