import { useState, useCallback, useMemo } from 'react';
import { 
  Container, Row, Col, Form, Button, Alert, Card, Table, 
  Badge, InputGroup, ProgressBar, Modal 
} from 'react-bootstrap';
import { 
  FiDollarSign, FiCreditCard, FiSearch, FiCheck, FiClock,
  FiPlus, FiRefreshCw, FiEdit2, FiTrash2
} from 'react-icons/fi';
import { useSales } from '../features/sales/hooks/useSales';
import { 
  useCreatePayment, 
  useUpdatePayment,
  useDeletePayment,
  usePaymentsBySale,
  PAYMENT_TYPE_ABONO,
} from '../features/payments/hooks/usePayments';
import type { Sale } from '../shared/types';
import type { CreatePaymentDTO, UpdatePaymentDTO, Payment, PaymentMethod } from '../features/payments/api/paymentsApi';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

type PaymentMethodType = PaymentMethod;

const paymentMethods: { value: PaymentMethodType; label: string }[] = [
  { value: 'Cash', label: 'Efectivo' },
  { value: 'Card', label: 'Tarjeta' },
  { value: 'Transfer', label: 'Transferencia' },
];

// Componente para mostrar historial de una venta seleccionada
function PaymentHistory({ saleId }: { saleId: number }) {
  const { data: payments = [], isLoading } = usePaymentsBySale(saleId);
  const updateMutation = useUpdatePayment(saleId);
  const deleteMutation = useDeletePayment(saleId);

  // Edit state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState<UpdatePaymentDTO>({ amount: 0, paymentMethod: 'Cash', reference: '' });

  // Delete state
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
                  variant="link"
                  size="sm"
                  className="p-0 me-2 text-primary"
                  title="Editar abono"
                  onClick={() => openEdit(payment)}
                >
                  <FiEdit2 />
                </Button>
                <Button
                  variant="link"
                  size="sm"
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
                type="number"
                min={0.01}
                step={0.01}
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

// Componente para tarjeta de venta pendiente
function PendingSaleCard({ 
  sale, 
  customerName,
  onSelect,
  isSelected
}: { 
  sale: Sale;
  customerName: string;
  onSelect: () => void;
  isSelected: boolean;
}) {
  // Use server-computed fields from DTO — eliminates N+1 per-card request
  const paid = sale.paidAmount ?? 0;
  const remaining = sale.remainingBalance ?? Math.max(0, sale.totalAmount - paid);
  const progress = sale.paymentProgress ?? (sale.totalAmount > 0 ? Math.min(100, (paid / sale.totalAmount) * 100) : 0);
  
  return (
    <Card 
      className={`mb-3 cursor-pointer ${isSelected ? 'border-primary border-2' : ''}`}
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 className="mb-1">{customerName}</h6>
            <small className="text-muted">Venta #{sale.id}</small>
          </div>
          <Badge bg={sale.isPaid ? 'success' : 'warning'} text={sale.isPaid ? undefined : 'dark'}>
            {sale.isPaid ? 'Liquidada' : 'Pendiente'}
          </Badge>
        </div>
        
        <div className="d-flex justify-content-between mb-2">
          <span>Total: <strong>${sale.totalAmount.toLocaleString()}</strong></span>
          <span className="text-danger">Debe: <strong>${remaining.toLocaleString()}</strong></span>
        </div>
        
        <ProgressBar 
          now={progress} 
          variant={sale.isPaid ? 'success' : 'primary'}
          style={{ height: '8px' }}
        />
        <small className="text-muted d-block mt-1 text-end">
          {progress.toFixed(0)}% pagado
        </small>
      </Card.Body>
    </Card>
  );
}

export default function PaymentsPage() {
  // Data fetching
  const { data: sales = [], isLoading: salesLoading, error: salesError, refetch: refetchSales } = useSales();
  const { data: customers = [] } = useCustomers();
  const createPaymentMutation = useCreatePayment();
  
  // State
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllSales, setShowAllSales] = useState(false);
  const [formData, setFormData] = useState<CreatePaymentDTO>({
    saleId: 0,
    amount: 0,
    paymentMethod: 'Cash',
    reference: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{ amount: number; remaining: number } | null>(null);
  
  // Get selected sale
  const selectedSale = useMemo(() => 
    sales.find(s => s.id === selectedSaleId) || null
  , [sales, selectedSaleId]);
  
  // Use server-computed balance fields from DTO — no extra request needed
  const selectedSaleBalance = useMemo(() => {
    if (!selectedSale) return null;
    const paid = selectedSale.paidAmount ?? 0;
    const remaining = selectedSale.remainingBalance ?? Math.max(0, selectedSale.totalAmount - paid);
    const progress = selectedSale.paymentProgress ?? (selectedSale.totalAmount > 0 ? Math.min(100, (paid / selectedSale.totalAmount) * 100) : 0);
    return { totalPaid: paid, remainingBalance: remaining, progress, isPaid: selectedSale.isPaid };
  }, [selectedSale]);
  
  // Filter pending sales
  const pendingSales = useMemo(() => {
    let result = showAllSales ? sales : sales.filter(s => !s.isPaid);
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => {
        const customer = customers.find(c => c.id === s.customerId);
        const customerName = customer ? `${customer.name} ${customer.lastName}`.toLowerCase() : '';
        return customerName.includes(term) || s.id.toString().includes(term);
      });
    }
    
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, customers, searchTerm, showAllSales]);
  
  // Get customer name
  const getCustomerName = useCallback((customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.name} ${customer.lastName}` : 'Cliente desconocido';
  }, [customers]);
  
  // Handlers
  const handleSelectSale = useCallback((sale: Sale) => {
    setSelectedSaleId(sale.id);
    setFormData({
      saleId: sale.id,
      amount: 0,
      paymentMethod: 'Cash',
      reference: '',
    });
    setFormErrors({});
  }, []);
  
  const handlePayFullAmount = useCallback(() => {
    if (selectedSaleBalance) {
      setFormData(prev => ({
        ...prev,
        amount: selectedSaleBalance.remainingBalance,
      }));
    }
  }, [selectedSaleBalance]);
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!selectedSaleId) {
      errors.saleId = 'Debe seleccionar una venta';
    }
    
    if (formData.amount <= 0) {
      errors.amount = 'El monto debe ser mayor a 0';
    }
    
    if (selectedSaleBalance && formData.amount > selectedSaleBalance.remainingBalance) {
      errors.amount = `El monto no puede ser mayor al saldo pendiente ($${selectedSaleBalance.remainingBalance.toLocaleString()})`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedSaleBalance) return;
    
    try {
      await createPaymentMutation.mutateAsync({
        ...formData,
        saleId: selectedSaleId!,
      });
      
      const newRemaining = selectedSaleBalance.remainingBalance - formData.amount;
      setLastPaymentInfo({
        amount: formData.amount,
        remaining: newRemaining,
      });
      
      // Reset form
      setFormData({
        saleId: selectedSaleId!,
        amount: 0,
        paymentMethod: 'Cash',
        reference: '',
      });
      
      setShowSuccessModal(true);
      
      // If sale is now paid, clear selection
      if (newRemaining <= 0) {
        setTimeout(() => {
          setSelectedSaleId(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Error registering payment:', err);
    }
  };
  
  // Render
  if (salesLoading) {
    return <LoadingSpinner message="Cargando ventas..." fullPage />;
  }
  
  if (salesError) {
    return <ErrorAlert error={salesError} title="Error al cargar ventas" onRetry={refetchSales} />;
  }
  
  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h4 className="mb-1">
            <FiDollarSign className="me-2" />
            Registrar Abono
          </h4>
          <p className="text-muted mb-0">
            Selecciona una venta y registra el abono del cliente
          </p>
        </Col>
      </Row>
      
      <Row>
        {/* Left Panel - Sales List */}
        <Col lg={5} xl={4} className="mb-4 mb-lg-0">
          <Card>
            <Card.Header className="bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Ventas</h6>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => refetchSales()}
                >
                  <FiRefreshCw />
                </Button>
              </div>
              
              <InputGroup size="sm" className="mb-2">
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
              
              <Form.Check
                type="switch"
                id="show-all-sales"
                label="Mostrar ventas liquidadas"
                checked={showAllSales}
                onChange={(e) => setShowAllSales(e.target.checked)}
              />
            </Card.Header>
            <Card.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {pendingSales.length === 0 ? (
                <Alert variant="light" className="text-center mb-0">
                  <FiCheck className="me-2" />
                  {showAllSales ? 'No hay ventas registradas' : 'No hay ventas pendientes de pago'}
                </Alert>
              ) : (
                pendingSales.map((sale) => (
                  <PendingSaleCard
                    key={sale.id}
                    sale={sale}
                    customerName={getCustomerName(sale.customerId)}
                    onSelect={() => handleSelectSale(sale)}
                    isSelected={selectedSaleId === sale.id}
                  />
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
        
        {/* Right Panel - Payment Form */}
        <Col lg={7} xl={8}>
          {!selectedSale ? (
            <Card className="h-100">
              <Card.Body className="d-flex flex-column align-items-center justify-content-center py-5">
                <FiCreditCard size={48} className="text-muted mb-3" />
                <h5 className="text-muted">Selecciona una venta</h5>
                <p className="text-muted text-center">
                  Elige una venta de la lista para registrar un abono
                </p>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Header className="bg-white">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">Venta #{selectedSale.id}</h5>
                    <small className="text-muted">
                      {getCustomerName(selectedSale.customerId)}
                    </small>
                  </div>
                  <Badge bg={selectedSale.isPaid ? 'success' : 'primary'} className="fs-6">
                    {selectedSale.isPaid ? 'Liquidada' : `Debe: $${selectedSaleBalance?.remainingBalance.toLocaleString()}`}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body>
                {/* Sale Summary */}
                <Row className="mb-4 g-3">
                  <Col sm={4}>
                    <Card bg="light">
                      <Card.Body className="py-3 text-center">
                        <small className="text-muted d-block">Total Venta</small>
                        <h5 className="mb-0">${selectedSale.totalAmount.toLocaleString()}</h5>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col sm={4}>
                    <Card bg="success" text="white">
                      <Card.Body className="py-3 text-center">
                        <small className="d-block opacity-75">Pagado</small>
                        <h5 className="mb-0">${selectedSaleBalance?.totalPaid.toLocaleString()}</h5>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col sm={4}>
                    <Card bg="danger" text="white">
                      <Card.Body className="py-3 text-center">
                        <small className="d-block opacity-75">Pendiente</small>
                        <h5 className="mb-0">${selectedSaleBalance?.remainingBalance.toLocaleString()}</h5>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Progreso de pago</span>
                    <span className="fw-bold">{selectedSaleBalance?.progress.toFixed(1)}%</span>
                  </div>
                  <ProgressBar 
                    now={selectedSaleBalance?.progress ?? 0} 
                    variant={selectedSale.isPaid ? 'success' : 'primary'}
                    animated={!selectedSale.isPaid}
                    style={{ height: '12px' }}
                  />
                </div>
                
                {/* Payment Form */}
                {!selectedSale.isPaid && (
                  <Form onSubmit={handleSubmit}>
                    <h6 className="border-bottom pb-2 mb-3">
                      <FiPlus className="me-2" />
                      Nuevo Abono
                    </h6>
                    
                    <Row className="g-3">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Monto del Abono *</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>$</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min={0}
                              max={selectedSaleBalance?.remainingBalance}
                              step={0.01}
                              value={formData.amount || ''}
                              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                              isInvalid={!!formErrors.amount}
                              placeholder="0.00"
                            />
                            <Button 
                              variant="outline-secondary"
                              onClick={handlePayFullAmount}
                              title="Pagar total pendiente"
                            >
                              Total
                            </Button>
                            <Form.Control.Feedback type="invalid">
                              {formErrors.amount}
                            </Form.Control.Feedback>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                      
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Método de Pago</Form.Label>
                          <Form.Select
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              paymentMethod: e.target.value as PaymentMethodType 
                            })}
                          >
                            {paymentMethods.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Referencia</Form.Label>
                          <Form.Control
                            type="text"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            placeholder="Opcional"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={createPaymentMutation.isPending}
                        size="lg"
                      >
                        <FiDollarSign className="me-2" />
                        {createPaymentMutation.isPending ? 'Registrando...' : 'Registrar Abono'}
                      </Button>
                    </div>
                  </Form>
                )}
                
                {/* Payment History */}
                <div className="mt-4">
                  <h6 className="border-bottom pb-2 mb-3">
                    <FiClock className="me-2" />
                    Historial de Abonos
                  </h6>
                  <PaymentHistory saleId={selectedSale.id} />
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
      
      {/* Success Modal */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Body className="text-center py-4">
          <div className="text-success mb-3">
            <FiCheck size={64} />
          </div>
          <h4>¡Abono Registrado!</h4>
          <p className="mb-0">
            Se registró un abono de <strong>${lastPaymentInfo?.amount.toLocaleString()}</strong>
          </p>
          {lastPaymentInfo && lastPaymentInfo.remaining > 0 ? (
            <p className="text-muted">
              Saldo pendiente: <strong>${lastPaymentInfo.remaining.toLocaleString()}</strong>
            </p>
          ) : (
            <Alert variant="success" className="mt-3 mb-0">
              <FiCheck className="me-2" />
              ¡La venta ha sido liquidada completamente!
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center border-0 pt-0">
          <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
            Continuar
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Error Alert */}
      {createPaymentMutation.isError && (
        <ErrorAlert error={createPaymentMutation.error} title="Error al registrar abono" />
      )}
    </Container>
  );
}