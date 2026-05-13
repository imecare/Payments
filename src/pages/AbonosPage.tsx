import { useState, useMemo } from 'react';
import {
  Container, Row, Col, Card, Table, Modal, Badge,
  Button, InputGroup, Form, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import { FiSearch, FiDollarSign, FiCheckCircle, FiClock, FiPlus, FiFilter, FiCircle } from 'react-icons/fi';
import { useSales } from '../features/sales/hooks/useSales';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import { useSellers } from '../features/sellers/hooks/useSellers';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import StatCard from '../components/StatCard';
import PaymentForm from '../features/payments/components/PaymentForm';
import PaymentTable from '../features/payments/components/PaymentTable';
import type { Sale, Payment } from '../shared/types';

// ============================================
// TYPES
// ============================================
type Filter = 'all' | 'pending' | 'paid';
type SortBy = 'date-desc' | 'date-asc' | 'seller-asc' | 'seller-desc';
type PaymentStatus = 'green' | 'orange' | 'red' | 'none';

// ============================================
// HELPER: Sistema de Semaforización por Quincenas
// ============================================
interface QuincenaRange {
  start: Date;
  end: Date;
  criticalDay: number; // Día crítico después del cual se vuelve naranja
}

function getQuincenaRanges(today: Date): { current: QuincenaRange; previous: QuincenaRange } {
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  let current: QuincenaRange;
  let previous: QuincenaRange;

  if (day >= 13 && day <= 25) {
    // Estamos en la quincena del 15 (período 13-25)
    current = {
      start: new Date(year, month, 13, 0, 0, 0),
      end: new Date(year, month, 25, 23, 59, 59),
      criticalDay: 15,
    };
    // Quincena anterior: del 29 del mes pasado al 12 del mes actual
    previous = {
      start: new Date(year, month - 1, 29, 0, 0, 0),
      end: new Date(year, month, 12, 23, 59, 59),
      criticalDay: 1,
    };
  } else if (day >= 29 || day <= 12) {
    // Estamos en la quincena del 30 (período 29 al 12 del siguiente mes)
    if (day >= 29) {
      // Estamos en el mismo mes (días 29-31)
      current = {
        start: new Date(year, month, 29, 0, 0, 0),
        end: new Date(year, month + 1, 12, 23, 59, 59),
        criticalDay: 1,
      };
      // Quincena anterior: 13-25 del mes actual
      previous = {
        start: new Date(year, month, 13, 0, 0, 0),
        end: new Date(year, month, 25, 23, 59, 59),
        criticalDay: 15,
      };
    } else {
      // Estamos en días 1-12 del mes (parte final de la quincena del 30)
      current = {
        start: new Date(year, month - 1, 29, 0, 0, 0),
        end: new Date(year, month, 12, 23, 59, 59),
        criticalDay: 1,
      };
      // Quincena anterior: 13-25 del mes pasado
      previous = {
        start: new Date(year, month - 1, 13, 0, 0, 0),
        end: new Date(year, month - 1, 25, 23, 59, 59),
        criticalDay: 15,
      };
    }
  } else {
    // Días 26-28: período de gracia/transición, consideramos quincena del 15 como anterior
    current = {
      start: new Date(year, month, 13, 0, 0, 0),
      end: new Date(year, month, 25, 23, 59, 59),
      criticalDay: 15,
    };
    previous = {
      start: new Date(year, month - 1, 29, 0, 0, 0),
      end: new Date(year, month, 12, 23, 59, 59),
      criticalDay: 1,
    };
  }

  return { current, previous };
}

function getPaymentStatusForSale(sale: Sale, today: Date): { status: PaymentStatus; tooltip: string } {
  // Si la venta ya está liquidada, no necesita indicador
  if (sale.isPaid) {
    return { status: 'none', tooltip: 'Venta liquidada' };
  }

  const payments = (sale.payments ?? sale.payment ?? []).filter((p) => p.paymentTypeId === 2);
  const { current, previous } = getQuincenaRanges(today);
  const day = today.getDate();

  // Verificar si hay abono en la quincena actual
  const hasPaymentInCurrent = payments.some((p) => {
    const paymentDate = new Date(p.date);
    return paymentDate >= current.start && paymentDate <= current.end;
  });

  // Verificar si hay abono en la quincena anterior
  const hasPaymentInPrevious = payments.some((p) => {
    const paymentDate = new Date(p.date);
    return paymentDate >= previous.start && paymentDate <= previous.end;
  });

  // VERDE: Abonó en la quincena actual
  if (hasPaymentInCurrent) {
    return { status: 'green', tooltip: 'Abono al corriente en esta quincena' };
  }

  // ROJO: No abonó en toda la quincena anterior (y tampoco en la actual)
  if (!hasPaymentInPrevious) {
    return { status: 'red', tooltip: 'Sin abono en la quincena anterior' };
  }

  // NARANJA: Ya pasó el día crítico y no ha abonado en esta quincena
  // Para quincena del 30: día crítico es 1
  // Para quincena del 15: día crítico es 15
  const isPastCriticalDay = day > current.criticalDay || 
    (current.criticalDay === 1 && day >= 1 && day <= 12);
  
  if (isPastCriticalDay) {
    return { status: 'orange', tooltip: 'Abono pendiente en esta quincena' };
  }

  // Aún está en tiempo (antes del día crítico)
  return { status: 'green', tooltip: 'Dentro del período de pago' };
}

// ============================================
// PAGE
// ============================================
export default function AbonosPage() {
  const { data: sales = [], isLoading, error, refetch } = useSales();
  const { data: customers = [] } = useCustomers();
  const { data: sellers = [] } = useSellers();

  // Modal state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');
  const [filterSellerId, setFilterSellerId] = useState<number | null>(null);

  // ----------------------------------------
  // Derived data
  // ----------------------------------------
  const getCustomerName = (customerId: number) => {
    const c = customers.find((x) => x.id === customerId);
    return c ? `${c.name} ${c.lastName}` : `Cliente #${customerId}`;
  };

  const getSellerName = (sellerId: number | null | undefined) => {
    if (!sellerId) return 'Sin asignar';
    const s = sellers.find((x) => x.id === sellerId);
    return s ? `${s.name} ${s.lastName}` : `Vendedor #${sellerId}`;
  };

  // Get unique sellers from sales for dropdown
  const salesSellers = useMemo(() => {
    const sellerIds = [...new Set(sales.map(s => s.sellerId).filter(Boolean))] as number[];
    return sellers.filter(s => sellerIds.includes(s.id));
  }, [sales, sellers]);

  const filteredSales = useMemo(() => {
    let result = sales;

    if (filter === 'pending') result = result.filter((s) => !s.isPaid);
    if (filter === 'paid')    result = result.filter((s) => s.isPaid);

    // Filter by seller
    if (filterSellerId !== null) {
      result = result.filter((s) => s.sellerId === filterSellerId);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          String(s.id).includes(term) ||
          getCustomerName(s.customerId).toLowerCase().includes(term)
      );
    }

    // Sorting
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'seller-asc': {
          const sellerA = getSellerName(a.sellerId).toLowerCase();
          const sellerB = getSellerName(b.sellerId).toLowerCase();
          return sellerA.localeCompare(sellerB);
        }
        case 'seller-desc': {
          const sellerA = getSellerName(a.sellerId).toLowerCase();
          const sellerB = getSellerName(b.sellerId).toLowerCase();
          return sellerB.localeCompare(sellerA);
        }
        default:
          return 0;
      }
    });
  }, [sales, filter, searchTerm, customers, sortBy, filterSellerId, sellers]);

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
          <Row className="g-2 align-items-center mt-2">
            <Col md={4}>
              <Form.Select
                size="sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="date-desc">Fecha (más reciente)</option>
                <option value="date-asc">Fecha (más antigua)</option>
                <option value="seller-asc">Vendedor (A-Z)</option>
                <option value="seller-desc">Vendedor (Z-A)</option>
              </Form.Select>
            </Col>
            {salesSellers.length > 0 && (
              <Col md={4}>
                <Form.Select
                  size="sm"
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
          </Row>
        </Card.Body>
      </Card>

      {/* Sales table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>#</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Total</th>
                <th>Abonado</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No se encontraron ventas.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const totalAbonado = (sale.payments ?? sale.payment ?? [])
                    .filter((p) => p.paymentTypeId === 2)
                    .reduce((acc, p) => acc + p.amount, 0);
                  const { status, tooltip } = getPaymentStatusForSale(sale, new Date());
                  
                  const statusColors: Record<PaymentStatus, string> = {
                    green: '#28a745',
                    orange: '#fd7e14',
                    red: '#dc3545',
                    none: 'transparent',
                  };

                  return (
                    <tr key={sale.id}>
                      <td className="text-center align-middle">
                        {status !== 'none' && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>{tooltip}</Tooltip>}
                          >
                            <span>
                              <FiCircle 
                                size={12} 
                                fill={statusColors[status]} 
                                color={statusColors[status]}
                              />
                            </span>
                          </OverlayTrigger>
                        )}
                      </td>
                      <td className="text-muted">{sale.id}</td>
                      <td>{getCustomerName(sale.customerId)}</td>
                      <td className="text-muted">{getSellerName(sale.sellerId)}</td>
                      <td className="fw-semibold">${sale.totalAmount.toLocaleString()}</td>
                      <td className="text-success fw-semibold">${totalAbonado.toLocaleString()}</td>
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
                  );
                })
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
