import { useState, useCallback, useMemo } from 'react';
import { 
  Button, Table, Modal, Form, Row, Col, Badge, InputGroup, 
  ProgressBar, Card, Alert 
} from 'react-bootstrap';
import { FiSearch, FiPlus, FiEdit2, FiDollarSign, FiCheckCircle, FiClock, FiTrendingUp, FiPercent, FiEye, FiCalendar, FiTrash2 } from 'react-icons/fi';

/** Returns today's date in YYYY-MM-DD format for input[type=date] */
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};
import { 
  useSales, 
  useCreateSale,
  useUpdateSale,
  useMarkCommissionPaid,
  useDeleteSale,
} from '../features/sales/hooks/useSales';
import type { Sale, CreateSaleDTO } from '../shared/types';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import { useSellers, useActiveSellers } from '../features/sellers/hooks/useSellers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ConfirmModal from '../components/ConfirmModal';
import StatCard from '../components/StatCard';
import { useAuth } from '../auth/AuthContext';
import SaleDetailModal from '../features/sales/components/SaleDetailModal';

const emptySale: CreateSaleDTO = { 
  customerId: 0,
  sellerId: undefined,
  totalAmount: 0,
  costPrice: 0,
  productDescription: '',
  commissionAmount: 0,
  date: getTodayDate(),
};

export default function SalesPage() {
  const { isSuperAdmin, isCommissionist, user } = useAuth();
  const dataScope: 'all' | 'mine' = isCommissionist ? 'mine' : 'all';
  // Data fetching with React Query
  const { data: sales = [], isLoading, error, refetch } = useSales(dataScope);
  const { data: customers = [], isLoading: customersLoading } = useCustomers(dataScope);
  // Use all sellers for display, active sellers for dropdown
  const { data: sellers = [] } = useSellers(isSuperAdmin);
  const { data: activeSellers = [], isLoading: sellersLoading } = useActiveSellers(isSuperAdmin);
  const createMutation = useCreateSale();
  const updateMutation = useUpdateSale();
  const markCommissionPaidMutation = useMarkCommissionPaid();
  const deleteMutation = useDeleteSale();

  // UI State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState<CreateSaleDTO>(emptySale);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'seller-asc' | 'seller-desc'>('date-desc');
  const [filterSellerId, setFilterSellerId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Ventas filtradas por vendedor (para stats)
  const salesBySellerFilter = useMemo(() => {
    if (filterSellerId === null) return sales;
    return sales.filter(s => s.sellerId === filterSellerId);
  }, [sales, filterSellerId]);

  // Computed values - ahora usa ventas filtradas por vendedor
  const stats = useMemo(() => {
    const totalSales = salesBySellerFilter.reduce((sum, s) => sum + s.totalAmount, 0);
    const paidSales = salesBySellerFilter.filter(s => s.isPaid);
    const pendingCommissions = salesBySellerFilter.filter(s => s.isPaid && !s.isCommissionPaid);
    const totalCommissionsPending = pendingCommissions.reduce((sum, s) => sum + s.commissionAmount, 0);
    // Use server-computed paidAmount (sum of paymentTypeId=2) per sale
    const totalPaid = salesBySellerFilter.reduce((sum, s) => sum + (s.paidAmount ?? 0), 0);

    return {
      totalSales,
      totalPaid,
      pendingCount: salesBySellerFilter.filter(s => !s.isPaid).length,
      pendingCommissionsCount: pendingCommissions.length,
      totalCommissionsPending,
    };
  }, [salesBySellerFilter]);

  // Get customer/seller names — prefer flat DTO fields, fallback to local lists
  const getCustomerName = useCallback((sale: Sale) => {
    if (sale.customerName) return sale.customerName;
    if (sale.customer) return `${sale.customer.name} ${sale.customer.lastName}`;
    const customer = customers.find(c => c.id === sale.customerId);
    return customer ? `${customer.name} ${customer.lastName}` : 'Desconocido';
  }, [customers]);

  const getSellerName = useCallback((sale: Sale) => {
    if (!sale.sellerId) return 'Sin asignar';
    if (isCommissionist && user?.sellerId === sale.sellerId) {
      return user.displayName || 'Mi cartera';
    }
    if (sale.sellerName) return sale.sellerName;
    if (sale.seller) return `${sale.seller.name} ${sale.seller.lastName}`;
    const seller = sellers.find(s => s.id === sale.sellerId);
    return seller ? `${seller.name} ${seller.lastName}` : 'Desconocido';
  }, [isCommissionist, sellers, user?.displayName, user?.sellerId]);

  // Get unique sellers from sales for dropdown
  const salesSellers = useMemo(() => {
    const sellerIds = [...new Set(sales.map(s => s.sellerId).filter(Boolean))] as number[];
    return sellers.filter(s => sellerIds.includes(s.id));
  }, [sales, sellers]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    let result = sales;
    
    if (filterStatus === 'pending') {
      result = result.filter(s => !s.isPaid);
    } else if (filterStatus === 'paid') {
      result = result.filter(s => s.isPaid);
    }

    // Filter by seller
    if (filterSellerId !== null) {
      result = result.filter(s => s.sellerId === filterSellerId);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => {
        const customerName = getCustomerName(s).toLowerCase();
        const saleDescription = (s.productDescription || '').toLowerCase();
        return (
          customerName.includes(term) ||
          s.id.toString().includes(term) ||
          saleDescription.includes(term)
        );
      });
    }
    
    // Sorting
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'seller-asc': {
          const sellerA = getSellerName(a).toLowerCase();
          const sellerB = getSellerName(b).toLowerCase();
          return sellerA.localeCompare(sellerB);
        }
        case 'seller-desc': {
          const sellerA = getSellerName(a).toLowerCase();
          const sellerB = getSellerName(b).toLowerCase();
          return sellerB.localeCompare(sellerA);
        }
        default:
          return 0;
      }
    });
  }, [sales, filterStatus, searchTerm, sortBy, getCustomerName, getSellerName, filterSellerId]);

  // Calculate profit in real-time
  const calculatedProfit = useMemo(() => {
    const profit = formData.totalAmount - formData.costPrice;
    return profit > 0 ? profit : 0;
  }, [formData.totalAmount, formData.costPrice]);

  // Handlers
  const handleOpenModal = useCallback((sale?: Sale) => {
    if (!isSuperAdmin) return;
    if (sale) {
      setEditingId(sale.id);
      setEditingSale(sale);
      setFormData({
        customerId: sale.customerId,
        sellerId: sale.sellerId ?? undefined,
        totalAmount: sale.totalAmount,
        costPrice: sale.costPrice ?? 0,
        productDescription: sale.productDescription ?? '',
        commissionAmount: sale.commissionAmount,
        date: sale.date ? sale.date.split('T')[0] : getTodayDate(),
      });
    } else {
      setEditingId(null);
      setEditingSale(null);
      setFormData(emptySale);
    }
    setFormErrors({});
    setShowModal(true);
  }, [isSuperAdmin]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingId(null);
    setEditingSale(null);
    setFormData(emptySale);
    setFormErrors({});
  }, []);

  const handleViewDetail = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  }, []);

  const handleOpenDeleteModal = useCallback((sale: Sale) => {
    // Verificar si tiene abonos (paymentTypeId = 2)
    const abonos = (sale.payments ?? sale.payment ?? []).filter(p => p.paymentTypeId === 2);
    if (abonos.length > 0) {
      setDeleteError('No se puede eliminar una venta que tiene abonos registrados. Elimine los abonos primero.');
      setSaleToDelete(sale);
      setShowDeleteModal(true);
      return;
    }
    setDeleteError(null);
    setSaleToDelete(sale);
    setDeleteReason('');
    setShowDeleteModal(true);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setSaleToDelete(null);
    setDeleteReason('');
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!saleToDelete) return;
    
    try {
      await deleteMutation.mutateAsync({ 
        id: saleToDelete.id, 
        reason: deleteReason.trim() || undefined 
      });
      handleCloseDeleteModal();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al eliminar la venta';
      setDeleteError(errorMsg);
    }
  }, [saleToDelete, deleteReason, deleteMutation, handleCloseDeleteModal]);

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

    if (!formData.productDescription.trim()) {
      errors.productDescription = 'La descripcion de la venta es obligatoria';
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

    // Format date to ISO with time component for backend
    const payload = {
      ...formData,
      date: formData.date ? `${formData.date}T00:00:00` : undefined,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error saving sale:', err);
    }
  };

  const handlePayCommission = async () => {
    if (!selectedSale || !isSuperAdmin) return;
    
    try {
      await markCommissionPaidMutation.mutateAsync({ saleId: selectedSale.id, paid: true });
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

  if (isCommissionist && !user?.sellerId) {
    return (
      <ErrorAlert
        error={new Error('El usuario comisionista no tiene sellerId asignado en la sesión.')}
        title="Sesión inválida"
      />
    );
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
        {isSuperAdmin && (
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <FiPlus className="me-2" />
            Nueva Venta
          </Button>
        )}
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
              placeholder="Buscar por cliente, descripcion o ID..."
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
        <Col md={4} lg={3}>
          <Form.Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="date-desc">Fecha (más reciente)</option>
            <option value="date-asc">Fecha (más antigua)</option>
            <option value="seller-asc">Vendedor (A-Z)</option>
            <option value="seller-desc">Vendedor (Z-A)</option>
          </Form.Select>
        </Col>
        {salesSellers.length > 0 && (
          <Col md={4} lg={3}>
            <Form.Select
              value={filterSellerId ?? ''}
              onChange={(e) => setFilterSellerId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos los vendedores</option>
              {salesSellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name} {seller.lastName}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
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
              <th>Descripcion</th>
              <th className="text-end">Total</th>
              <th className="text-end">Abonado</th>
              <th className="text-end">Comisión</th>
              <th>Estado</th>
              <th style={{ width: '130px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-4 text-muted">
                  No hay ventas que mostrar
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const totalAbonado = (sale.payments ?? sale.payment ?? [])
                  .filter((p) => p.paymentTypeId === 2)
                  .reduce((acc, p) => acc + p.amount, 0);
                return (
                <tr key={sale.id}>
                  <td>
                    <Badge bg="light" text="dark">#{sale.id}</Badge>
                  </td>
                  <td>{new Date(sale.date).toLocaleDateString('es-MX')}</td>
                  <td>{getCustomerName(sale)}</td>
                  <td>{getSellerName(sale)}</td>
                  <td title={sale.productDescription || 'Sin descripcion'}>
                    {(sale.productDescription || 'Sin descripcion').slice(0, 40)}
                    {(sale.productDescription || '').length > 40 ? '...' : ''}
                  </td>
                  <td className="text-end fw-bold">
                    ${sale.totalAmount.toLocaleString()}
                  </td>
                  <td className="text-end text-success fw-semibold">
                    ${totalAbonado.toLocaleString()}
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
                      variant="outline-secondary"
                      className="me-1"
                      onClick={() => handleOpenModal(sale)}
                      aria-label="Editar venta"
                    >
                      <FiEdit2 />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline-primary"
                      onClick={() => handleViewDetail(sale)}
                      aria-label="Ver detalle"
                    >
                      <FiEye />
                    </Button>
                    {isSuperAdmin && (
                      <Button 
                        size="sm" 
                        variant="outline-danger"
                        className="ms-1"
                        onClick={() => handleOpenDeleteModal(sale)}
                        aria-label="Eliminar venta"
                      >
                        <FiTrash2 />
                      </Button>
                    )}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* Create/Edit Sale Modal */}
      <Modal show={showModal && isSuperAdmin} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingId ? 'Editar Venta' : 'Nueva Venta'}</Modal.Title>
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
                    {/* Fallback: if editing and customer not in list, show from DTO */}
                    {editingSale?.customerId && !customers.find(c => c.id === editingSale.customerId) && (
                      <option value={editingSale.customerId}>{editingSale.customerName ?? `Cliente #${editingSale.customerId}`}</option>
                    )}
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
                    {/* Fallback: if editing and seller not in active list, show from DTO */}
                    {editingSale?.sellerId && !activeSellers.find(s => s.id === editingSale.sellerId) && (
                      <option value={editingSale.sellerId}>{editingSale.sellerName ?? `Vendedor #${editingSale.sellerId}`}</option>
                    )}
                    {activeSellers.map((seller) => (
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
                  <Form.Label>Fecha de la Venta</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FiCalendar />
                    </InputGroup.Text>
                    <Form.Control
                      type="date"
                      value={formData.date ?? getTodayDate()}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      max={getTodayDate()}
                    />
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Por defecto es hoy. Modifica si la venta fue en otra fecha.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Descripcion de la Venta *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.productDescription}
                    onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                    isInvalid={!!formErrors.productDescription}
                    placeholder="Ej. Venta de equipo, modelo, servicio o detalle relevante"
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.productDescription}
                  </Form.Control.Feedback>
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
              {(createMutation.isPending || updateMutation.isPending) ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Venta'}
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
        canPayCommission={isSuperAdmin}
      />

      {/* Error Alerts */}
      {createMutation.isError && (
        <ErrorAlert error={createMutation.error} title="Error al crear venta" />
      )}
      {updateMutation.isError && (
        <ErrorAlert error={updateMutation.error} title="Error al actualizar venta" />
      )}

      {/* Delete Sale Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <FiTrash2 className="me-2" />
            Eliminar Venta
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError ? (
            <Alert variant="danger" className="mb-3">
              {deleteError}
            </Alert>
          ) : (
            <>
              <p>
                ¿Estás seguro de que deseas eliminar la venta <strong>#{saleToDelete?.id}</strong>?
              </p>
              <p className="text-muted small">
                Cliente: {saleToDelete && getCustomerName(saleToDelete)}<br />
                Monto: ${saleToDelete?.totalAmount.toLocaleString()}
              </p>
              <Form.Group className="mb-3">
                <Form.Label>Razón de eliminación (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ej: Venta duplicada, error de captura..."
                />
              </Form.Group>
              <Alert variant="warning" className="mb-0">
                <strong>Atención:</strong> Esta acción no se puede deshacer.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            Cancelar
          </Button>
          {!deleteError && (
            <Button 
              variant="danger" 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar Venta'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
