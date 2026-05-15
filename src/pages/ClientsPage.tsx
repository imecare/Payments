import { useState, useMemo, useCallback } from 'react';
import { Button, Modal, Form, Row, Col, Badge, InputGroup, Alert, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FiSearch, FiPlus, FiEdit2, FiPhone, FiUsers, FiEye, FiLink, FiCheckCircle, FiCopy, FiDollarSign, FiShoppingCart, FiClock } from 'react-icons/fi';
import ResponsiveTable, { type Column } from '../components/ResponsiveTable';
import { 
  useCustomers, 
  useCreateCustomer, 
  useUpdateCustomer
} from '../features/customers/hooks/useCustomers';
import type { Customer, CreateCustomerDTO, Sale, Payment } from '../shared/types';
import { useSellers } from '../features/sellers/hooks/useSellers';
import { useCrudForm } from '../shared/hooks/useCrudForm';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useCompanyContext } from '../features/company/hooks/useCompanyContext';
import { usePublicHistoryLookup } from '../features/sales/hooks/usePublicHistory';

const emptyCustomer: CreateCustomerDTO = { name: '', lastName: '', rfc: '', phone: '', sellerId: 0 };
const mapCustomerToForm = (c: Customer): CreateCustomerDTO => ({
  name: c.name,
  lastName: c.lastName,
  rfc: c.rfc,
  phone: c.phone,
  sellerId: c.sellerId,
});

export default function ClientsPage() {
  const { data: customers = [], isLoading, error, refetch } = useCustomers();
  const { data: sellers = [], isLoading: sellersLoading } = useSellers();
  const { data: companyData } = useCompanyContext();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const historyLookup = usePublicHistoryLookup();

  const {
    showModal, editingId, isEditing, formData, setFormData,
    formErrors, setFormErrors, handleOpenModal, handleCloseModal,
  } = useCrudForm<CreateCustomerDTO, Customer>({ emptyForm: emptyCustomer, mapEntityToForm: mapCustomerToForm });

  const [searchTerm, setSearchTerm] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [filterSellerId, setFilterSellerId] = useState<number | null>(null);

  const companyCode = companyData?.companyCode || companyData?.tenantId || '';
  const baseUrl = window.location.origin;

  // Obtener vendedores únicos de los clientes
  const customerSellers = useMemo(() => {
    const sellerIds = [...new Set(customers.map(c => c.sellerId).filter(Boolean))] as number[];
    return sellers.filter(s => sellerIds.includes(s.id));
  }, [customers, sellers]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    
    // Filtrar por vendedor
    if (filterSellerId !== null) {
      result = result.filter((c) => c.sellerId === filterSellerId);
    }
    
    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          c.rfc.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [customers, searchTerm, filterSellerId]);

  const getSellerName = useCallback((sellerId: number) => {
    const seller = sellers.find(s => s.id === sellerId);
    return seller ? `${seller.name} ${seller.lastName}` : 'Sin asignar';
  }, [sellers]);

  // Generar URL de consulta para el cliente
  const getCustomerHistoryUrl = useCallback((customer: Customer) => {
    const params = new URLSearchParams({
      phone: customer.phone,
      rfc: customer.rfc || 'XAXX010101000',
      code: companyCode,
    });
    return `${baseUrl}/consulta?${params.toString()}`;
  }, [baseUrl, companyCode]);

  // Copiar link al portapapeles
  const handleCopyLink = useCallback(async (customer: Customer) => {
    const url = getCustomerHistoryUrl(customer);
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [getCustomerHistoryUrl]);

  // Ver historial del cliente
  const handleViewHistory = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
    
    // Cargar historial
    historyLookup.mutate({
      phone: customer.phone,
      rfc: customer.rfc || 'XAXX010101000',
      companyCode: companyCode,
    });
  }, [companyCode, historyLookup]);

  const closeHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
    setSelectedCustomer(null);
  }, []);

  // Calcular totales del historial
  const historyTotals = useMemo(() => {
    const sales = historyLookup.data?.sales ?? [];
    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const allPayments = sales
      .flatMap((s) => s.payments ?? s.payment ?? [])
      .filter((p) => p.paymentTypeId === 2);

    const totalPayments = allPayments.reduce((acc, p) => acc + p.amount, 0);

    const lastPaymentDate = allPayments
      .map((p) => p.date)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    return {
      totalSales,
      totalPayments,
      pending: Math.max(0, totalSales - totalPayments),
      lastPaymentDate,
    };
  }, [historyLookup.data?.sales]);

  // Timeline del historial
  const historyTimeline = useMemo(() => {
    const sales = historyLookup.data?.sales ?? [];
    const items: Array<{
      id: string;
      type: 'sale' | 'payment';
      date: string;
      saleId: number;
      amount: number;
      paymentMethod?: string;
      reference?: string;
      isPaid?: boolean;
      description?: string;
    }> = [];

    sales.forEach((sale: Sale) => {
      items.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        date: sale.date,
        saleId: sale.id,
        amount: sale.totalAmount,
        isPaid: sale.isPaid,
        description: sale.productDescription,
      });

      (sale.payments ?? sale.payment ?? [])
        .filter((payment: Payment) => payment.paymentTypeId === 2)
        .forEach((payment: Payment) => {
          items.push({
            id: `payment-${payment.id}`,
            type: 'payment',
            date: payment.date || sale.date,
            saleId: sale.id,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            reference: payment.reference,
          });
        });
    });

    return items.sort((a, b) => {
      const diff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      if (diff !== 0) return diff;
      // Secondary sort: payments after their sale on same date
      if (a.type !== b.type) return a.type === 'sale' ? -1 : 1;
      return 0;
    });
  }, [historyLookup.data?.sales]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'El nombre es requerido';
    if (!formData.lastName.trim()) errors.lastName = 'El apellido es requerido';
    if (!formData.phone.trim()) {
      errors.phone = 'El teléfono es requerido';
    } else if (formData.phone.trim().length < 10) {
      errors.phone = 'El teléfono debe tener al menos 10 dígitos';
    }
    if (formData.sellerId <= 0) errors.sellerId = 'Debe seleccionar un vendedor';
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
      console.error('Error saving customer:', err);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <LoadingSpinner message="Cargando clientes..." />;

  if (error) {
    return <ErrorAlert error={error} title="Error al cargar clientes" onRetry={refetch} />;
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="mb-1">
            <FiUsers className="me-2" />
            Clientes
          </h4>
          <p className="text-muted mb-0">
            Gestiona los clientes y sus datos de contacto
          </p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <FiPlus className="me-2" />
          Agregar Cliente
        </Button>
      </div>

      {/* Search and Stats */}
      <Row className="mb-4 g-2">
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text>
              <FiSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por nombre, teléfono o RFC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar clientes"
            />
          </InputGroup>
        </Col>
        {customerSellers.length > 1 && (
          <Col md={3}>
            <Form.Select
              value={filterSellerId ?? ''}
              onChange={(e) => setFilterSellerId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos los vendedores</option>
              {customerSellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name} {seller.lastName}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}
        <Col className="d-flex align-items-center justify-content-md-end mt-2 mt-md-0">
          <Badge bg="secondary" className="fs-6">
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}
          </Badge>
        </Col>
      </Row>

      {/* Table */}
      <ResponsiveTable<Customer>
        data={filteredCustomers}
        keyExtractor={(c) => c.id}
        emptyMessage={searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
        columns={[
          {
            key: 'name',
            header: 'Cliente',
            isCardTitle: true,
            render: (c) => (
              <span>
                <strong>{c.name}</strong> {c.lastName}
              </span>
            ),
          },
          {
            key: 'phone',
            header: 'Teléfono',
            render: (c) => (
              <>
                <FiPhone className="me-1 text-muted" />
                {c.phone}
              </>
            ),
          },
          {
            key: 'rfc',
            header: 'RFC',
            render: (c) => c.rfc || '-',
          },
          {
            key: 'seller',
            header: 'Vendedor',
            render: (c) => (
              <Badge bg="info" text="dark">
                {getSellerName(c.sellerId)}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: 'Acciones',
            headerClassName: 'text-center',
            isActions: true,
            render: (c) => (
              <>
                <OverlayTrigger placement="top" overlay={<Tooltip>Ver historial</Tooltip>}>
                  <Button
                    size="sm"
                    variant="outline-success"
                    onClick={() => handleViewHistory(c)}
                    aria-label={`Ver historial de ${c.name}`}
                  >
                    <FiEye />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="top" overlay={<Tooltip>Copiar link</Tooltip>}>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => handleCopyLink(c)}
                    aria-label={`Copiar link para ${c.name}`}
                  >
                    <FiLink />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="top" overlay={<Tooltip>Editar</Tooltip>}>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleOpenModal(c)}
                    aria-label={`Editar ${c.name}`}
                  >
                    <FiEdit2 />
                  </Button>
                </OverlayTrigger>
              </>
            ),
          },
        ] satisfies Column<Customer>[]}
      />

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {isEditing ? 'Editar Cliente' : 'Agregar Cliente'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave} noValidate>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    isInvalid={!!formErrors.name}
                    placeholder="Ingresa el nombre"
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Apellido *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    isInvalid={!!formErrors.lastName}
                    placeholder="Ingresa el apellido"
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.lastName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FiPhone />
                    </InputGroup.Text>
                    <Form.Control
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      isInvalid={!!formErrors.phone}
                      placeholder="10 dígitos"
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.phone}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>RFC</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    placeholder="Opcional (12-13 caracteres)"
                    maxLength={13}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Vendedor Asignado *</Form.Label>
              <Form.Select
                value={formData.sellerId}
                onChange={(e) => setFormData({ ...formData, sellerId: Number(e.target.value) })}
                isInvalid={!!formErrors.sellerId}
                disabled={sellersLoading}
              >
                <option value={0}>Selecciona un vendedor</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} {seller.lastName}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {formErrors.sellerId}
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Mutation Error Alerts */}
      {createMutation.isError && (
        <ErrorAlert error={createMutation.error} title="Error al crear cliente" />
      )}
      {updateMutation.isError && (
        <ErrorAlert error={updateMutation.error} title="Error al actualizar cliente" />
      )}

      {/* Link Copied Alert */}
      {copiedLink && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
          <Alert variant="success" className="d-flex align-items-center mb-0">
            <FiCheckCircle className="me-2" />
            Link copiado al portapapeles
          </Alert>
        </div>
      )}

      {/* History Modal */}
      <Modal show={showHistoryModal} onHide={closeHistoryModal} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            Historial de {selectedCustomer?.name} {selectedCustomer?.lastName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {historyLookup.isPending && (
            <div className="text-center py-5">
              <LoadingSpinner message="Cargando historial..." />
            </div>
          )}

          {historyLookup.isError && (
            <Alert variant="danger">
              Error al cargar el historial. Verifica que el cliente tenga RFC registrado.
            </Alert>
          )}

          {historyLookup.isSuccess && (
            <>
              {/* Totales */}
              <Row className="g-3 mb-4">
                <Col xs={6} md={3}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <small className="text-muted d-block">Total compras</small>
                      <h4 className="mb-0">${historyTotals.totalSales.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={6} md={3}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <small className="text-muted d-block">Total abonado</small>
                      <h4 className="mb-0 text-success">${historyTotals.totalPayments.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={6} md={3}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <small className="text-muted d-block">Saldo pendiente</small>
                      <h4 className="mb-0 text-danger">${historyTotals.pending.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={6} md={3}>
                  <Card className="border-0 shadow-sm h-100 border-start border-4 border-primary">
                    <Card.Body>
                      <small className="text-muted d-block">Último abono</small>
                      {historyTotals.lastPaymentDate ? (
                        <span className="fw-semibold text-primary fs-6">
                          {new Date(historyTotals.lastPaymentDate).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-muted fst-italic fs-6">Sin abonos</span>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Timeline */}
              {historyTimeline.length === 0 ? (
                <Alert variant="info">
                  Este cliente no tiene movimientos registrados.
                </Alert>
              ) : (
                <ResponsiveTable
                  data={historyTimeline}
                  keyExtractor={(item) => item.id}
                  striped={false}
                  bordered={false}
                  columns={[
                    {
                      key: 'tipo',
                      header: 'Tipo / Fecha',
                      isCardTitle: true,
                      render: (item) => (
                        <span>
                          {item.type === 'sale' ? (
                            <Badge bg="primary" className="me-2"><FiShoppingCart className="me-1" />Compra</Badge>
                          ) : (
                            <Badge bg="success" className="me-2"><FiDollarSign className="me-1" />Abono</Badge>
                          )}
                          <small className="text-muted">{new Date(item.date).toLocaleDateString('es-MX')}</small>
                        </span>
                      ),
                    },
                    {
                      key: 'venta',
                      header: 'Venta',
                      render: (item) => <Badge bg="light" text="dark">#{item.saleId}</Badge>,
                    },
                    {
                      key: 'monto',
                      header: 'Monto',
                      className: 'fw-semibold',
                      render: (item) => `$${item.amount.toLocaleString()}`,
                    },
                    {
                      key: 'detalle',
                      header: 'Detalle',
                      render: (item) =>
                        item.type === 'sale' ? (
                          <span className="text-muted">{item.description || 'Registro de venta'}</span>
                        ) : (
                          <span>
                            {item.paymentMethod}
                            {item.reference ? <span className="text-muted"> - {item.reference}</span> : null}
                          </span>
                        ),
                    },
                    {
                      key: 'estado',
                      header: 'Estado',
                      render: (item) =>
                        item.type === 'sale' ? (
                          <Badge bg={item.isPaid ? 'success' : 'warning'}>
                            {item.isPaid ? 'Liquidada' : 'Pendiente'}
                          </Badge>
                        ) : (
                          <Badge bg="secondary"><FiClock className="me-1" />Aplicado</Badge>
                        ),
                    },
                  ]}
                />
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedCustomer && (
            <Button 
              variant="outline-secondary" 
              onClick={() => handleCopyLink(selectedCustomer)}
            >
              <FiCopy className="me-2" />
              Copiar link para cliente
            </Button>
          )}
          <Button variant="secondary" onClick={closeHistoryModal}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
