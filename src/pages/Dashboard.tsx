import { useMemo } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert } from 'react-bootstrap';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  FiDollarSign, FiUsers, FiTrendingUp, FiPercent, 
  FiCheckCircle, FiClock, FiUserCheck, FiShoppingBag, FiCreditCard
} from 'react-icons/fi';
import { useDashboardStats } from '../features/dashboard/hooks/useDashboard';
import { useSales } from '../features/sales/hooks/useSales';
import { useCustomers } from '../features/customers/hooks/useCustomers';
import { useSellers } from '../features/sellers/hooks/useSellers';
import { useExpenses } from '../features/expenses/hooks/useExpenses';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import StatCard from '../components/StatCard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
);

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: customers = [] } = useCustomers();
  const { data: sellers = [] } = useSellers();
  const { data: expenses = [] } = useExpenses();
  
  const isLoading = statsLoading || salesLoading;
  
  // Memoized lookup map — O(1) customer name lookup instead of O(n) per call
  const customerMap = useMemo(
    () => new Map(customers.map(c => [c.id, `${c.name} ${c.lastName}`])),
    [customers]
  );
  const getCustomerName = (id: number) => customerMap.get(id) ?? 'Desconocido';

  // All derived computations memoized — only recalculate when sales/sellers change
  const derivedStats = useMemo(() => {
    const paidSales = sales.filter(s => s.isPaid);
    const pendingSales = sales.filter(s => !s.isPaid);
    const pendingCommissions = sales.filter(s => s.isPaid && !s.isCommissionPaid);
    const totalCommissionsPending = pendingCommissions.reduce((sum, s) => sum + s.commissionAmount, 0);
    const totalProfit = paidSales.reduce((sum, s) => sum + (s.totalAmount - (s.costPrice ?? 0)), 0);
    const recentSales = [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    return { paidSales, pendingSales, pendingCommissions, totalCommissionsPending, totalProfit, recentSales };
  }, [sales]);

  const sellerStats = useMemo(() => sellers.map(seller => {
    const sellerSales = sales.filter(s => s.sellerId === seller.id);
    const totalSales = sellerSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCommission = sellerSales.reduce((sum, s) => sum + s.commissionAmount, 0);
    return { ...seller, salesCount: sellerSales.length, totalSales, totalCommission };
  }).sort((a, b) => b.totalSales - a.totalSales).slice(0, 5), [sales, sellers]);

  const salesChartData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return monthNames[monthIndex];
    });
    const salesByMonth = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return sales.filter(s => new Date(s.date).getMonth() === monthIndex)
        .reduce((sum, s) => sum + s.totalAmount, 0);
    });
    return {
      labels: last6Months,
      datasets: [{
        label: 'Ventas',
        data: salesByMonth,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4,
      }],
    };
  }, [sales]);

  const abonosChartData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return monthNames[monthIndex];
    });
    const allPayments = sales.flatMap(s => s.payments ?? s.payment ?? []);
    const abonosByMonth = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return allPayments
        .filter(p => p.paymentTypeId === 2 && new Date(p.date).getMonth() === monthIndex)
        .reduce((sum, p) => sum + p.amount, 0);
    });
    return {
      labels: last6Months,
      datasets: [{
        label: 'Abonos cobrados',
        data: abonosByMonth,
        borderColor: 'rgb(13, 110, 253)',
        backgroundColor: 'rgba(13, 110, 253, 0.2)',
        fill: true,
        tension: 0.4,
      }],
    };
  }, [sales]);

  // ── Compras / Gastos: helpers y datasets ──
  const last6MonthsWindow = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { year: d.getFullYear(), month: d.getMonth(), label: monthNames[d.getMonth()] };
    });
  }, []);

  const monthlyExpensesTotal = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.cost, 0);
  }, [expenses]);

  const expensesChartData = useMemo(() => ({
    labels: last6MonthsWindow.map(m => m.label),
    datasets: [{
      label: 'Gastos',
      data: last6MonthsWindow.map(({ year, month }) =>
        expenses
          .filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
          })
          .reduce((sum, e) => sum + e.cost, 0)
      ),
      backgroundColor: 'rgba(220, 53, 69, 0.6)',
      borderColor: 'rgb(220, 53, 69)',
      borderWidth: 1,
    }],
  }), [expenses, last6MonthsWindow]);

  // Proyección de mensualidades: cada compra a meses aporta cost/months
  // en cada mes de su calendario (desde la fecha de compra por N meses).
  const installmentsChartData = useMemo(() => ({
    labels: last6MonthsWindow.map(m => m.label),
    datasets: [{
      label: 'Pagado a meses',
      data: last6MonthsWindow.map(({ year, month }) =>
        expenses
          .filter(e => e.paymentType === 'Installments' && e.months && e.months > 0)
          .reduce((sum, e) => {
            const start = new Date(e.date);
            const monthsCount = e.months as number;
            const windowIndex = (year - start.getFullYear()) * 12 + (month - start.getMonth());
            if (windowIndex >= 0 && windowIndex < monthsCount) {
              const monthly = e.monthlyAmount ?? e.cost / monthsCount;
              return sum + monthly;
            }
            return sum;
          }, 0)
      ),
      borderColor: 'rgb(13, 202, 240)',
      backgroundColor: 'rgba(13, 202, 240, 0.2)',
      fill: true,
      tension: 0.4,
    }],
  }), [expenses, last6MonthsWindow]);

  const statusChartData = useMemo(() => ({
    labels: ['Liquidadas', 'Pendientes'],
    datasets: [{
      data: [derivedStats.paidSales.length, derivedStats.pendingSales.length],
      backgroundColor: ['#198754', '#ffc107'],
      borderWidth: 0,
    }],
  }), [derivedStats.paidSales.length, derivedStats.pendingSales.length]);

  const commissionChartData = useMemo(() => ({
    labels: ['Pagadas', 'Pendientes'],
    datasets: [{
      data: [
        sales.filter(s => s.isCommissionPaid).length,
        derivedStats.pendingCommissions.length,
      ],
      backgroundColor: ['#0d6efd', '#dc3545'],
      borderWidth: 0,
    }],
  }), [sales, derivedStats.pendingCommissions.length]);

  const { paidSales, pendingSales, pendingCommissions, totalCommissionsPending, totalProfit, recentSales } = derivedStats;

  if (isLoading) {
    return <LoadingSpinner message="Cargando dashboard..." fullPage />;
  }
  
  if (statsError) {
    return <ErrorAlert error={statsError} title="Error al cargar estadísticas" />;
  }

  return (
    <Container fluid>
      {/* Header */}
      <div className="mb-4">
        <h4 className="mb-1">
          <FiTrendingUp className="me-2" />
          Dashboard
        </h4>
        <p className="text-muted mb-0">
          Resumen general del sistema de pagos y comisiones
        </p>
      </div>
      
      {/* Main Stats */}
      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <StatCard
            title="Total Ventas"
            value={`$${(stats?.totalSales ?? 0).toLocaleString()}`}
            icon={<FiDollarSign />}
            variant="primary"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Cobrado"
            value={`$${(stats?.totalCollected ?? 0).toLocaleString()}`}
            icon={<FiCheckCircle />}
            variant="success"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Por Cobrar"
            value={`$${(stats?.pendingCollection ?? 0).toLocaleString()}`}
            subtitle={`${pendingSales.length} ventas pendientes`}
            icon={<FiClock />}
            variant="warning"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Comisiones Pendientes"
            value={`$${totalCommissionsPending.toLocaleString()}`}
            subtitle={`${pendingCommissions.length} comisiones por pagar`}
            icon={<FiPercent />}
            variant="danger"
          />
        </Col>
      </Row>
      
      {/* Secondary Stats */}
      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <StatCard
            title="Clientes Activos"
            value={stats?.activeCustomers ?? customers.length}
            icon={<FiUsers />}
            variant="info"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Vendedores"
            value={stats?.activeSellers ?? sellers.length}
            icon={<FiUserCheck />}
            variant="primary"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Ganancia Total"
            value={`$${(stats?.totalProfit ?? totalProfit).toLocaleString()}`}
            icon={<FiTrendingUp />}
            variant="success"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Total Ventas"
            value={sales.length}
            subtitle={`${paidSales.length} liquidadas`}
            icon={<FiDollarSign />}
            variant="info"
          />
        </Col>
        <Col sm={6} lg={3}>
          <StatCard
            title="Gastos del Mes"
            value={`$${(stats?.monthlyExpenses ?? monthlyExpensesTotal).toLocaleString()}`}
            subtitle="Compras y gastos"
            icon={<FiShoppingBag />}
            variant="danger"
          />
        </Col>
      </Row>
      
      {/* Charts Row */}
      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-white">
              <h6 className="mb-0">Ventas por Mes</h6>
            </Card.Header>
            <Card.Body>
              <Line 
                data={salesChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString()}`,
                      },
                    },
                  },
                }}
                height={250}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-white">
              <h6 className="mb-0">Abonos Cobrados por Mes</h6>
            </Card.Header>
            <Card.Body>
              <Line 
                data={abonosChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString()}`,
                      },
                    },
                  },
                }}
                height={250}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Compras / Gastos Charts Row */}
      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-white">
              <h6 className="mb-0">
                <FiShoppingBag className="me-2" />
                Compras / Gastos por Mes
              </h6>
            </Card.Header>
            <Card.Body>
              <Bar
                data={expensesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString()}`,
                      },
                    },
                  },
                }}
                height={250}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-white">
              <h6 className="mb-0">
                <FiCreditCard className="me-2" />
                Pagado a Meses (proyección)
              </h6>
            </Card.Header>
            <Card.Body>
              <Line
                data={installmentsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString()}`,
                      },
                    },
                  },
                }}
                height={250}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Doughnuts Row */}
      <Row className="g-4 mb-4">
        <Col xs={6} lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-white py-2">
              <small className="fw-bold">Estado de Ventas</small>
            </Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <Doughnut 
                data={statusChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12 } },
                  },
                }}
                height={200}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={6}>
          <Card className="h-100">
            <Card.Header className="bg-white py-2">
              <small className="fw-bold">Comisiones</small>
            </Card.Header>
            <Card.Body className="d-flex align-items-center justify-content-center">
              <Doughnut 
                data={commissionChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12 } },
                  },
                }}
                height={200}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Tables Row */}
      <Row className="g-4">
        {/* Recent Sales */}
        <Col lg={7}>
          <Card>
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Ventas Recientes</h6>
              <Badge bg="secondary">{recentSales.length} ventas</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {recentSales.length === 0 ? (
                <Alert variant="light" className="m-3 text-center">
                  No hay ventas registradas
                </Alert>
              ) : (
                <Table responsive hover className="mb-0 table-responsive-cards">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th className="text-end">Total</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale) => (
                      <tr key={sale.id}>
                        <td data-label="ID">
                          <Badge bg="light" text="dark">#{sale.id}</Badge>
                        </td>
                        <td data-label="Cliente">{getCustomerName(sale.customerId)}</td>
                        <td data-label="Total" className="text-end fw-bold">
                          ${sale.totalAmount.toLocaleString()}
                        </td>
                        <td data-label="Estado">
                          <Badge bg={sale.isPaid ? 'success' : 'warning'} text={sale.isPaid ? undefined : 'dark'}>
                            {sale.isPaid ? 'Liquidada' : 'Pendiente'}
                          </Badge>
                        </td>
                        <td data-label="Fecha" className="text-muted">
                          {new Date(sale.date).toLocaleDateString('es-MX')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        {/* Top Sellers */}
        <Col lg={5}>
          <Card>
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Top Vendedores</h6>
              <Badge bg="primary">{sellers.length} activos</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {sellerStats.length === 0 ? (
                <Alert variant="light" className="m-3 text-center">
                  No hay vendedores registrados
                </Alert>
              ) : (
                <Table responsive hover className="mb-0 table-responsive-cards">
                  <thead className="table-light">
                    <tr>
                      <th>Vendedor</th>
                      <th className="text-center">Ventas</th>
                      <th className="text-end">Total</th>
                      <th className="text-end">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellerStats.map((seller, index) => (
                      <tr key={seller.id}>
                        <td data-label="Vendedor">
                          <div className="d-flex align-items-center">
                            <Badge 
                              bg={index === 0 ? 'warning' : index === 1 ? 'secondary' : 'light'} 
                              text={index > 1 ? 'dark' : undefined}
                              className="me-2"
                            >
                              {index + 1}
                            </Badge>
                            {seller.name} {seller.lastName}
                          </div>
                        </td>
                        <td data-label="Ventas" className="text-center">
                          <Badge bg="info">{seller.salesCount}</Badge>
                        </td>
                        <td data-label="Total" className="text-end">
                          ${seller.totalSales.toLocaleString()}
                        </td>
                        <td data-label="Comisión" className="text-end text-success">
                          ${seller.totalCommission.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Pending Commissions Alert */}
      {pendingCommissions.length > 0 && (
        <Alert variant="warning" className="mt-4">
          <Alert.Heading className="h6">
            <FiPercent className="me-2" />
            Tienes {pendingCommissions.length} comisiones pendientes de pago
          </Alert.Heading>
          <p className="mb-0">
            Hay <strong>${totalCommissionsPending.toLocaleString()}</strong> en comisiones de vendedores 
            que están listas para ser pagadas (ventas liquidadas).
          </p>
        </Alert>
      )}
    </Container>
  );
}

export default Dashboard;