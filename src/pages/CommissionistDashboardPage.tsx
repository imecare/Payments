import { useMemo, useState } from 'react';
import { Alert, Badge, Card, Col, Form, InputGroup, Row } from 'react-bootstrap';
import { FiCheckCircle, FiClock, FiDollarSign, FiSearch, FiUsers, FiShoppingBag, FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import StatCard from '../components/StatCard';
import ResponsiveTable from '../components/ResponsiveTable';
import { useAuth } from '../auth/AuthContext';
import { useSales } from '../features/sales/hooks/useSales';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import { useCommissionistDashboardStats } from '../features/dashboard/hooks/useDashboard';
import PaymentTable from '../features/payments/components/PaymentTable';
import type { Sale, Customer } from '../shared/types';

export default function CommissionistDashboardPage() {
  const { user } = useAuth();
  const sellerId = user?.sellerId ?? 0;

  const { data: sales = [], isLoading: loadingSales, error: salesError, refetch: refetchSales } = useSales('mine');
  const { data: customers = [], isLoading: loadingCustomers, error: customersError, refetch: refetchCustomers } = useCustomers('mine');
  const {
    data: stats,
    isLoading: loadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useCommissionistDashboardStats();

  const [selectedSaleId, setSelectedSaleId] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  const mySales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sales]
  );

  const myCustomers = useMemo(() => customers, [customers]);

  // Filtrar ventas por nombre de cliente
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return mySales;
    const term = searchTerm.toLowerCase();
    return mySales.filter((sale) => {
      const customer = customers.find((c) => c.id === sale.customerId);
      if (!customer) return false;
      const fullName = `${customer.name} ${customer.lastName}`.toLowerCase();
      return fullName.includes(term);
    });
  }, [mySales, customers, searchTerm]);

  const paidSales = useMemo(() => mySales.filter((sale) => sale.isPaid), [mySales]);

  const pendingCommissions = useMemo(
    () => mySales.filter((sale) => sale.isPaid && !sale.isCommissionPaid),
    [mySales]
  );

  const paidCommissions = useMemo(
    () => mySales.filter((sale) => sale.isCommissionPaid),
    [mySales]
  );

  const totalPendingCommissions = useMemo(
    () => pendingCommissions.reduce((sum, sale) => sum + sale.commissionAmount, 0),
    [pendingCommissions]
  );

  const totalPaidCommissions = useMemo(
    () => paidCommissions.reduce((sum, sale) => sum + sale.commissionAmount, 0),
    [paidCommissions]
  );

  // Estadísticas de ventas/abonos/deuda (sin llamadas API adicionales)
  const totalVentas = useMemo(
    () => mySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    [mySales]
  );

  const totalAbonos = useMemo(
    () => mySales.reduce((sum, sale) => sum + (sale.paidAmount ?? 0), 0),
    [mySales]
  );

  const deudaPendiente = useMemo(
    () => mySales.reduce((sum, sale) => sum + (sale.remainingBalance ?? 0), 0),
    [mySales]
  );

  const selectedSale = useMemo(
    () => mySales.find((sale) => sale.id === selectedSaleId) ?? null,
    [mySales, selectedSaleId]
  );

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((item) => item.id === customerId);
    return customer ? `${customer.name} ${customer.lastName}` : `Cliente #${customerId}`;
  };

  if (loadingSales || loadingCustomers || loadingStats) {
    return <LoadingSpinner fullPage message="Cargando tu cartera..." />;
  }

  if (!sellerId) {
    return (
      <Alert variant="warning">
        Tu usuario no tiene sellerId en el token. Solicita al administrador que vincule tu usuario comisionista con un vendedor.
      </Alert>
    );
  }

  if (salesError || customersError || statsError) {
    return (
      <>
        {salesError && <ErrorAlert error={salesError} title="Error al cargar ventas" onRetry={refetchSales} />}
        {customersError && (
          <ErrorAlert error={customersError} title="Error al cargar clientes" onRetry={refetchCustomers} />
        )}
        {statsError && (
          <ErrorAlert error={statsError} title="Error al cargar estadísticas" onRetry={refetchStats} />
        )}
      </>
    );
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h4 className="mb-1">Mi cartera de clientes</h4>
        <p className="text-muted mb-0">
          Consulta tus clientes, ventas, comisiones y el historial de abonos para compartir estados de cuenta.
        </p>
      </div>

      {/* Estadísticas de ventas y deuda */}
      <Row className="g-3 mb-3">
        <Col sm={6} lg={4}>
          <StatCard
            title="Total Ventas"
            value={`$${totalVentas.toLocaleString()}`}
            subtitle={`${mySales.length} ventas`}
            icon={<FiShoppingBag />}
            variant="primary"
          />
        </Col>
        <Col sm={6} lg={4}>
          <StatCard
            title="Total Abonos"
            value={`$${totalAbonos.toLocaleString()}`}
            icon={<FiCreditCard />}
            variant="success"
          />
        </Col>
        <Col sm={6} lg={4}>
          <StatCard
            title="Deuda Pendiente"
            value={`$${deudaPendiente.toLocaleString()}`}
            icon={<FiAlertCircle />}
            variant="danger"
          />
        </Col>
      </Row>

      {/* Estadísticas de comisiones */}
      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <StatCard
            title="Mis Clientes"
            value={stats?.totalCustomers ?? myCustomers.length}
            icon={<FiUsers />}
            variant="primary"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Ventas Liquidadas"
            value={stats?.paidSales ?? paidSales.length}
            icon={<FiCheckCircle />}
            variant="success"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Comisiones Pendientes"
            value={`$${(stats?.pendingCommissionsAmount ?? totalPendingCommissions).toLocaleString()}`}
            subtitle={`${stats?.pendingCommissionsCount ?? pendingCommissions.length} ventas`}
            icon={<FiClock />}
            variant="warning"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Comisiones Pagadas"
            value={`$${(stats?.paidCommissionsAmount ?? totalPaidCommissions).toLocaleString()}`}
            subtitle={`${stats?.paidCommissionsCount ?? paidCommissions.length} ventas`}
            icon={<FiDollarSign />}
            variant="info"
          />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={5}>
          <Card className="h-100">
            <Card.Header className="bg-white">
              <h6 className="mb-0">Mis Clientes ({myCustomers.length})</h6>
            </Card.Header>
            <Card.Body className="p-0">
              <ResponsiveTable<Customer>
                data={myCustomers}
                keyExtractor={(c) => c.id}
                emptyMessage="No tienes clientes asignados."
                bordered={false}
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
                    render: (c) => c.phone,
                  },
                ]}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="mb-4">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center gap-3">
              <h6 className="mb-0">Mis Ventas</h6>
              <InputGroup style={{ maxWidth: 280 }}>
                <InputGroup.Text>
                  <FiSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Buscar por cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Card.Header>
            <Card.Body className="p-0">
              <ResponsiveTable<Sale>
                data={filteredSales}
                keyExtractor={(sale) => sale.id}
                emptyMessage={searchTerm ? 'No se encontraron ventas con ese cliente.' : 'No tienes ventas registradas.'}
                onRowClick={(sale) => setSelectedSaleId(sale.id)}
                isRowSelected={(sale) => sale.id === selectedSaleId}
                bordered={false}
                columns={[
                  {
                    key: 'id',
                    header: 'ID',
                    isCardTitle: true,
                    render: (sale) => `#${sale.id}`,
                  },
                  {
                    key: 'customer',
                    header: 'Cliente',
                    render: (sale) => getCustomerName(sale.customerId),
                  },
                  {
                    key: 'description',
                    header: 'Descripción',
                    render: (sale) => (
                      <span title={sale.productDescription || 'Sin descripcion'}>
                        {(sale.productDescription || 'Sin descripcion').slice(0, 35)}
                        {(sale.productDescription || '').length > 35 ? '...' : ''}
                      </span>
                    ),
                  },
                  {
                    key: 'total',
                    header: 'Total',
                    className: 'text-end',
                    render: (sale) => `$${sale.totalAmount.toLocaleString()}`,
                  },
                  {
                    key: 'commission',
                    header: 'Comisión',
                    className: 'text-end',
                    render: (sale) => `$${sale.commissionAmount.toLocaleString()}`,
                  },
                  {
                    key: 'status',
                    header: 'Estado',
                    render: (sale) => (
                      <Badge bg={sale.isCommissionPaid ? 'success' : 'secondary'}>
                        Comisión {sale.isCommissionPaid ? 'pagada' : 'pendiente'}
                      </Badge>
                    ),
                  },
                ]}
              />
            </Card.Body>
          </Card>

          <Card>
            <Card.Header className="bg-white">
              <h6 className="mb-0">
                {selectedSale 
                  ? `Historial de abonos - Venta #${selectedSale.id} (${getCustomerName(selectedSale.customerId)})`
                  : 'Historial de abonos'
                }
              </h6>
            </Card.Header>
            <Card.Body>
              {selectedSale ? (
                <PaymentTable saleId={selectedSale.id} totalAmount={selectedSale.totalAmount} />
              ) : (
                <Alert variant="light" className="mb-0">
                  Haz clic en una venta de la tabla para ver su historial de pagos y el saldo actual.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
