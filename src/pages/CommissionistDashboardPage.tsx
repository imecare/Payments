import { useMemo, useState } from 'react';
import { Alert, Badge, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { FiCheckCircle, FiClock, FiDollarSign, FiUsers } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import StatCard from '../components/StatCard';
import { useAuth } from '../auth/AuthContext';
import { useSales } from '../features/sales/hooks/useSales';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import { useCommissionistDashboardStats } from '../features/dashboard/hooks/useDashboard';
import PaymentTable from '../features/payments/components/PaymentTable';

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

  const mySales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sales]
  );

  const myCustomers = useMemo(() => customers, [customers]);

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
              {myCustomers.length === 0 ? (
                <Alert variant="light" className="m-3 mb-0 text-center">
                  No tienes clientes asignados.
                </Alert>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Cliente</th>
                      <th>Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <strong>{customer.name}</strong> {customer.lastName}
                        </td>
                        <td>{customer.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="mb-4">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center gap-3">
              <h6 className="mb-0">Mis Ventas</h6>
              <Form.Select
                value={selectedSaleId || ''}
                onChange={(e) => setSelectedSaleId(Number(e.target.value))}
                style={{ maxWidth: 280 }}
              >
                <option value="">Selecciona una venta para ver abonos</option>
                {mySales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    Venta #{sale.id} - {getCustomerName(sale.customerId)}
                  </option>
                ))}
              </Form.Select>
            </Card.Header>
            <Card.Body className="p-0">
              {mySales.length === 0 ? (
                <Alert variant="light" className="m-3 mb-0 text-center">
                  No tienes ventas registradas.
                </Alert>
              ) : (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Descripcion</th>
                      <th className="text-end">Total</th>
                      <th className="text-end">Comisión</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mySales.map((sale) => (
                      <tr key={sale.id}>
                        <td>#{sale.id}</td>
                        <td>{getCustomerName(sale.customerId)}</td>
                        <td title={sale.productDescription || 'Sin descripcion'}>
                          {(sale.productDescription || 'Sin descripcion').slice(0, 35)}
                          {(sale.productDescription || '').length > 35 ? '...' : ''}
                        </td>
                        <td className="text-end">${sale.totalAmount.toLocaleString()}</td>
                        <td className="text-end">${sale.commissionAmount.toLocaleString()}</td>
                        <td>
                          <Badge bg={sale.isCommissionPaid ? 'success' : 'secondary'}>
                            Comisión {sale.isCommissionPaid ? 'pagada' : 'pendiente'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header className="bg-white">
              <h6 className="mb-0">Historial de abonos de la venta seleccionada</h6>
            </Card.Header>
            <Card.Body>
              {selectedSale ? (
                <PaymentTable saleId={selectedSale.id} totalAmount={selectedSale.totalAmount} />
              ) : (
                <Alert variant="light" className="mb-0">
                  Selecciona una venta para ver su historial de pagos y el saldo actual.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
