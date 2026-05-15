import { useState, useCallback, useMemo } from 'react';
import { 
  Button, Table, Modal, Form, Row, Col, Badge, InputGroup, 
  ProgressBar, Card, Alert 
} from 'react-bootstrap';
import { 
  FiSearch, FiPlus, FiDollarSign, FiCheckCircle, FiClock, 
  FiTrendingUp, FiPercent, FiEye, FiEdit2, FiTrash2
} from 'react-icons/fi';
import ResponsiveTable, { type Column } from '../components/ResponsiveTable';
import SearchableSelect, { type SelectOption } from '../components/SearchableSelect';
import { useSales, useCreateSale, useUpdateSale, useDeleteSale, useMarkCommissionPaid } from '../features/sales/hooks/useSales';
import { usePaymentsBySale, calculateSaleBalance } from '../features/payments/hooks/usePayments';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import { useSellers } from '../features/sellers/hooks/useSellers';
import type { Sale, CreateSaleDTO, Payment } from '../shared/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ConfirmModal from '../components/ConfirmModal';
import StatCard from '../components/StatCard';

/** Devuelve la fecha actual en formato YYYY-MM-DD para el input type="date" */
const todayISO = () => new Date().toISOString().split('T')[0];

const emptySale = (): CreateSaleDTO => ({
  customerId: 0,
  sellerId: undefined,
  totalAmount: 0,
  costPrice: 0,
  productDescription: '',
  commissionAmount: 0,
  date: todayISO(),
});

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
  
  const balance = calculateSaleBalance(sale.totalAmount, payments);
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
  const updateMutation = useUpdateSale();
  const deleteMutation = useDeleteSale();
  const markCommissionPaidMutation = useMarkCommissionPaid();

  // UI State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [formData, setFormData] = useState<CreateSaleDTO>(() => emptySale());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [filterSellerId, setFilterSellerId] = useState<number>(0);
  const [sortDate, setSortDate] = useState<'desc' | 'asc'>('desc');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered sales — se calcula ANTES que stats para que las tarjetas reflejen los filtros
  const filteredSales = useMemo(() => {
    let result = sales;

    if (filterSellerId > 0) {
      result = result.filter(s => s.sellerId === filterSellerId);
    }

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
        const desc = (s.productDescription ?? '').toLowerCase();
        return customerName.includes(term) || s.id.toString().includes(term) || desc.includes(term);
      });
    }

    return result.sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return sortDate === 'desc' ? diff : -diff;
    });
  }, [sales, filterStatus, filterSellerId, searchTerm, sortDate, customers]);

  // Stats calculados sobre las ventas ya filtradas — se actualizan al cambiar cualquier filtro
  const stats = useMemo(() => {
    // Para los totales usamos las ventas del vendedor seleccionado (sin filtro de estado/búsqueda)
    // para que las cards siempre muestren el resumen completo del vendedor
    const baseForStats = filterSellerId > 0
      ? sales.filter(s => s.sellerId === filterSellerId)
      : sales;

    const totalSales = baseForStats.reduce((sum, s) => sum + s.totalAmount, 0);
    const paidSales = baseForStats.filter(s => s.isPaid);
    const pendingCommissions = baseForStats.filter(s => s.isPaid && !s.isCommissionPaid);
    const totalCommissionsPending = pendingCommissions.reduce((sum, s) => sum + s.commissionAmount, 0);

    return {
      totalSales,
      totalPaid: paidSales.reduce((sum, s) => sum + (s.paidAmount ?? s.totalAmount), 0),
      pendingCount: baseForStats.filter(s => !s.isPaid).length,
      pendingCommissionsCount: pendingCommissions.length,
      totalCommissionsPending,
    };
  }, [sales, filterSellerId]);

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
    setEditingId(null);
    setFormData(emptySale());
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleOpenEditModal = useCallback((sale: Sale) => {
    setEditingId(sale.id);
    setFormData({
      customerId: sale.customerId,
      sellerId: sale.sellerId ?? undefined,
      totalAmount: sale.totalAmount,
      costPrice: sale.costPrice,
      productDescription: sale.productDescription ?? '',
      commissionAmount: sale.commissionAmount,
      date: sale.date ? sale.date.split('T')[0] : todayISO(),
    });
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptySale());
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
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error saving sale:', err);
    }
  };

  const handleDeleteClick = useCallback((sale: Sale) => {
    setSaleToDelete(sale);
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: saleToDelete.id });
      setShowDeleteModal(false);
      setSaleToDelete(null);
    } catch (err) {
      console.error('Error deleting sale:', err);
    }
  };

  const handlePayCommission = async () => {
    if (!selectedSale) return;
    
    try {
      await markCommissionPaidMutation.mutateAsync({ saleId: selectedSale.id });
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
      <Row className="mb-3 g-3">
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

      {/* Indicador de filtro activo */}
      {filterSellerId > 0 && (
        <Alert variant="info" className="py-2 px-3 mb-3 d-flex align-items-center justify-content-between">
          <small>
            <strong>Filtrando por vendedor:</strong>{' '}
            {sellers.find(s => s.id === filterSellerId)
              ? `${sellers.find(s => s.id === filterSellerId)!.name} ${sellers.find(s => s.id === filterSellerId)!.lastName}`
              : ''}
            {' — '}Los totales de arriba reflejan solo este vendedor.
          </small>
          <Button
            variant="outline-info"
            size="sm"
            className="ms-3 py-0"
            onClick={() => setFilterSellerId(0)}
          >
            Limpiar
          </Button>
        </Alert>
      )}

      {/* Filters */}
      <Row className="mb-4 g-2">
        <Col md={4} lg={3}>
          <InputGroup>
            <InputGroup.Text>
              <FiSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por cliente, descripcion o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3} lg={2}>
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">Todas las ventas</option>
            <option value="pending">Pendientes de pago</option>
            <option value="paid">Liquidadas</option>
          </Form.Select>
        </Col>
        <Col md={3} lg={2}>
          <Form.Select
            value={sortDate}
            onChange={(e) => setSortDate(e.target.value as 'desc' | 'asc')}
          >
            <option value="desc">Fecha (más reciente)</option>
            <option value="asc">Fecha (más antigua)</option>
          </Form.Select>
        </Col>
        <Col md={3} lg={2}>
          <Form.Select
            value={filterSellerId}
            onChange={(e) => setFilterSellerId(Number(e.target.value))}
          >
            <option value={0}>Todos los vendedores</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.lastName}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col className="d-flex align-items-center justify-content-md-end">
          <Badge bg="secondary" className="fs-6">
            {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''}
          </Badge>
        </Col>
      </Row>

      {/* Sales Table */}
      <ResponsiveTable<Sale>
        data={filteredSales}
        keyExtractor={(s) => s.id}
        emptyMessage="No hay ventas que mostrar"
        columns={[
          {
            key: 'id',
            header: 'ID / Fecha',
            isCardTitle: true,
            render: (s) => (
              <span>
                <Badge bg="light" text="dark" className="me-2">#{s.id}</Badge>
                <small className="text-muted">{new Date(s.date).toLocaleDateString('es-MX')}</small>
              </span>
            ),
          },
          {
            key: 'customer',
            header: 'Cliente',
            render: (s) => getCustomerName(s.customerId),
          },
          {
            key: 'seller',
            header: 'Vendedor',
            render: (s) => getSellerName(s.sellerId),
          },
          {
            key: 'description',
            header: 'Descripcion',
            render: (s) => {
              const desc = s.productDescription ?? '';
              return desc.length > 40
                ? <span title={desc}>{desc.slice(0, 40)}…</span>
                : <span>{desc || '-'}</span>;
            },
          },
          {
            key: 'total',
            header: 'Total',
            className: 'text-end fw-bold',
            render: (s) => `$${s.totalAmount.toLocaleString()}`,
          },
          {
            key: 'abonado',
            header: 'Abonado',
            className: 'text-end',
            render: (s) => (
              <span className={(s.paidAmount ?? 0) > 0 ? 'text-success fw-bold' : 'text-muted'}>
                ${(s.paidAmount ?? 0).toLocaleString()}
              </span>
            ),
          },
          {
            key: 'commission',
            header: 'Comisión',
            className: 'text-end',
            render: (s) => (
              <span>
                ${s.commissionAmount.toLocaleString()}
                {s.isPaid && !s.isCommissionPaid && (
                  <Badge bg="warning" text="dark" className="ms-1" pill>Pagar</Badge>
                )}
                {s.isCommissionPaid && (
                  <Badge bg="success" className="ms-1" pill><FiCheckCircle /></Badge>
                )}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Estado',
            render: (s) =>
              s.isPaid
                ? <Badge bg="success">Liquidada</Badge>
                : <Badge bg="warning" text="dark">Pendiente</Badge>,
          },
          {
            key: 'actions',
            header: 'Acciones',
            headerClassName: 'text-center',
            isActions: true,
            render: (s) => (
              <>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => handleOpenEditModal(s)}
                  aria-label="Editar venta"
                  title="Editar"
                >
                  <FiEdit2 />
                </Button>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => handleViewDetail(s)}
                  aria-label="Ver detalle"
                  title="Ver detalle"
                >
                  <FiEye />
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => handleDeleteClick(s)}
                  aria-label="Eliminar venta"
                  title="Eliminar"
                >
                  <FiTrash2 />
                </Button>
              </>
            ),
          },
        ] satisfies Column<Sale>[]}
      />

      {/* Create/Edit Sale Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? `Editar Venta #${editingId}` : 'Nueva Venta'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave} noValidate>
          <Modal.Body>
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha de la venta</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date ?? todayISO()}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    max={todayISO()}
                  />
                  <Form.Text className="text-muted">
                    Por defecto es el día de hoy.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Descripción del producto</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Descripción detallada de los productos..."
                    value={formData.productDescription}
                    onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                  />
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
            <Button variant="secondary" onClick={handleCloseModal} disabled={createMutation.isPending || updateMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear Venta'}
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

      {/* Delete Confirm Modal */}
      <ConfirmModal
        show={showDeleteModal}
        title="Eliminar venta"
        message={
          saleToDelete
            ? `¿Estás seguro de eliminar la venta #${saleToDelete.id} de ${getCustomerName(saleToDelete.customerId)}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onHide={() => { setShowDeleteModal(false); setSaleToDelete(null); }}
        isLoading={deleteMutation.isPending}
      />

      {/* Error Alerts */}
      {createMutation.isError && (
        <ErrorAlert error={createMutation.error} title="Error al crear venta" />
      )}
      {updateMutation.isError && (
        <ErrorAlert error={updateMutation.error} title="Error al actualizar venta" />
      )}
      {deleteMutation.isError && (
        <ErrorAlert error={deleteMutation.error} title="Error al eliminar venta" />
      )}
    </div>
  );
}
