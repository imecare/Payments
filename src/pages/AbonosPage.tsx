import { useState, useMemo } from 'react';
import {
  Container, Row, Col, Card, Table,
  Button, InputGroup, Form, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import { FiSearch, FiDollarSign, FiCheckCircle, FiClock, FiCircle } from 'react-icons/fi';
import { useCustomerDebts } from '../features/sales/hooks/useSales';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import StatCard from '../components/StatCard';
import type { CustomerDebt } from '../shared/types';

// ============================================
// TYPES
// ============================================
type Filter = 'all' | 'red' | 'orange' | 'green';
type SortBy = 'payment-asc' | 'payment-desc' | 'seller-asc' | 'seller-desc';
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

function getPaymentStatusForDebt(
  lastPaymentDate: string | null,
  today: Date
): { status: PaymentStatus; tooltip: string } {
  const { current, previous } = getQuincenaRanges(today);
  const day = today.getDate();
  const paymentDate = lastPaymentDate ? new Date(lastPaymentDate) : null;
  const hasPaymentInCurrent = paymentDate !== null
    && paymentDate >= current.start
    && paymentDate <= current.end;
  const hasPaymentInPrevious = paymentDate !== null
    && paymentDate >= previous.start
    && paymentDate <= previous.end;

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
  const { data: debts = [], isLoading, error, refetch } = useCustomerDebts();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('payment-asc');
  const [filterSellerId, setFilterSellerId] = useState<number | null>(null);

  // ----------------------------------------
  // Derived data
  // ----------------------------------------
  const debtSellers = useMemo(() => {
    const sellers = new Map<number, string>();
    debts.forEach((debt) => sellers.set(debt.sellerId, debt.sellerName));
    return [...sellers.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [debts]);

  const filteredDebts = useMemo(() => {
    let result = [...debts];

    if (filter !== 'all') {
      result = result.filter(
        (debt) => getPaymentStatusForDebt(debt.lastPaymentDate, new Date()).status === filter
      );
    }

    if (filterSellerId !== null) {
      result = result.filter((debt) => debt.sellerId === filterSellerId);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLocaleLowerCase('es-MX');
      result = result.filter((debt) => debt.customerName.toLocaleLowerCase('es-MX').includes(term));
    }

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'payment-asc':
          if (!a.lastPaymentDate) return b.lastPaymentDate ? -1 : a.customerName.localeCompare(b.customerName);
          if (!b.lastPaymentDate) return 1;
          return new Date(a.lastPaymentDate).getTime() - new Date(b.lastPaymentDate).getTime();
        case 'payment-desc':
          if (!a.lastPaymentDate) return b.lastPaymentDate ? 1 : a.customerName.localeCompare(b.customerName);
          if (!b.lastPaymentDate) return -1;
          return new Date(b.lastPaymentDate).getTime() - new Date(a.lastPaymentDate).getTime();
        case 'seller-asc':
          return a.sellerName.localeCompare(b.sellerName);
        case 'seller-desc':
          return b.sellerName.localeCompare(a.sellerName);
        default:
          return 0;
      }
    });
  }, [debts, filter, searchTerm, sortBy, filterSellerId]);

  const debtsBySellerFilter = useMemo(() => {
    if (filterSellerId === null) return debts;
    return debts.filter((debt) => debt.sellerId === filterSellerId);
  }, [debts, filterSellerId]);

  const stats = useMemo(() => {
    return debtsBySellerFilter.reduce(
      (summary, debt) => ({
        total: summary.total + debt.totalAmount,
        collected: summary.collected + debt.paidAmount,
        debt: summary.debt + debt.debtAmount,
        customers: summary.customers + 1,
      }),
      { total: 0, collected: 0, debt: 0, customers: 0 }
    );
  }, [debtsBySellerFilter]);

  // ----------------------------------------
  // Render
  // ----------------------------------------
  if (isLoading) return <LoadingSpinner fullPage message="Cargando deudas..." />;
  if (error)     return <ErrorAlert error={error} title="Error al cargar deudas" onRetry={refetch} />;

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Deudas</h2>
          <p className="text-muted mb-0">Consulta los clientes con saldo pendiente</p>
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
            title="Deuda pendiente"
            value={`$${stats.debt.toLocaleString()}`}
            icon={<FiDollarSign size={20} />}
            variant="danger"
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard
            title="Clientes con deuda"
            value={stats.customers}
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
                  placeholder="Buscar por cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={6} className="d-flex gap-2 justify-content-md-end">
              {(['all', 'red', 'orange', 'green'] as Filter[]).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? ({ all: 'primary', red: 'danger', orange: 'warning', green: 'success' } as const)[f] : 'outline-secondary'}
                  onClick={() => setFilter(f)}
                >
                  {{ all: 'Todos', red: 'Rojo', orange: 'Naranja', green: 'Verde' }[f]}
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
                <option value="payment-asc">Último abono (más antiguo)</option>
                <option value="payment-desc">Último abono (más reciente)</option>
                <option value="seller-asc">Vendedor (A-Z)</option>
                <option value="seller-desc">Vendedor (Z-A)</option>
              </Form.Select>
            </Col>
            {debtSellers.length > 0 && (
              <Col md={4}>
                <Form.Select
                  size="sm"
                  value={filterSellerId ?? ''}
                  onChange={(e) => setFilterSellerId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Todos los vendedores</option>
                  {debtSellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Debts table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0 table-responsive-cards">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Ventas pendientes</th>
                <th>Total</th>
                <th>Abonado</th>
                <th>Deuda</th>
                <th>Último abono</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    No se encontraron clientes con deuda.
                  </td>
                </tr>
              ) : (
                filteredDebts.map((debt: CustomerDebt) => {
                  const { status, tooltip } = getPaymentStatusForDebt(debt.lastPaymentDate, new Date());
                  
                  const statusColors: Record<PaymentStatus, string> = {
                    green: '#28a745',
                    orange: '#fd7e14',
                    red: '#dc3545',
                    none: 'transparent',
                  };

                  return (
                    <tr key={debt.customerId}>
                      <td data-label="Estado Pago" className="text-center align-middle">
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
                      <td data-label="Cliente">{debt.customerName}</td>
                      <td data-label="Vendedor" className="text-muted">{debt.sellerName}</td>
                      <td data-label="Ventas pendientes">{debt.pendingSalesCount}</td>
                      <td data-label="Total" className="fw-semibold">${debt.totalAmount.toLocaleString()}</td>
                      <td data-label="Abonado" className="text-success fw-semibold">${debt.paidAmount.toLocaleString()}</td>
                      <td data-label="Deuda" className="text-danger fw-semibold">${debt.debtAmount.toLocaleString()}</td>
                      <td data-label="Último abono" className="text-muted">
                        {debt.lastPaymentDate
                          ? new Date(debt.lastPaymentDate).toLocaleDateString('es-MX')
                          : 'Sin abonos'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

    </Container>
  );
}
