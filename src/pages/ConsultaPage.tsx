import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiClock, FiDollarSign, FiInfo, FiSearch, FiShoppingCart } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { usePublicHistoryLookup } from '../features/sales/hooks/usePublicHistory';
import { parsePublicHistoryError } from '../features/sales/api/publicHistoryApi';
import type { Payment, Sale } from '../shared/types';
import JumperLogo from '../components/JumperLogo';

type TimelineItem = {
  id: string;
  type: 'sale' | 'payment';
  date: string;
  saleId: number;
  amount: number;
  paymentMethod?: string;
  reference?: string;
  isPaid?: boolean;
};

export default function ConsultaPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [rfc, setRfc] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [historyFilter, setHistoryFilter] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const lookup = usePublicHistoryLookup();

  const sales = lookup.data?.sales ?? [];
  const errorInfo = lookup.error ? parsePublicHistoryError(lookup.error) : null;
  const customerNotFound =
    errorInfo?.status === 404 || errorInfo?.statusCode === 'CUSTOMER_NOT_FOUND';
  const noMovements =
    lookup.isSuccess &&
    (lookup.data?.statusCode === 'CUSTOMER_WITHOUT_MOVEMENTS' ||
      (lookup.data?.hasMovements === false && sales.length === 0));

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    sales.forEach((sale: Sale) => {
      items.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        date: sale.date,
        saleId: sale.id,
        amount: sale.totalAmount,
        isPaid: sale.isPaid,
      });

      // Solo mostrar pagos de tipo abono (paymentTypeId = 2)
      (sale.payments ?? sale.payment ?? [])
        .filter((payment: Payment) => payment.paymentTypeId === 2)
        .forEach((payment: Payment) => {
          items.push({
            id: `payment-${payment.id}`,
            type: 'payment',
            date: payment.date,
            saleId: sale.id,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            reference: payment.reference,
          });
        });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales]);

  const hasMovements = lookup.isSuccess && timeline.length > 0;

  const filteredTimeline = useMemo(() => {
    const term = historyFilter.trim().toLowerCase();
    if (!term) return timeline;

    return timeline.filter((item) => {
      const sale = sales.find((s) => s.id === item.saleId);
      const saleDescription = (sale?.productDescription || '').toLowerCase();
      const paymentMethod = (item.paymentMethod || '').toLowerCase();
      const paymentReference = (item.reference || '').toLowerCase();

      return (
        String(item.saleId).includes(term) ||
        saleDescription.includes(term) ||
        paymentMethod.includes(term) ||
        paymentReference.includes(term)
      );
    });
  }, [historyFilter, sales, timeline]);

  const totals = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    // Solo sumar pagos de tipo abono (paymentTypeId = 2)
    const totalPayments = sales
      .flatMap((s) => s.payments ?? s.payment ?? [])
      .filter((p) => p.paymentTypeId === 2)
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      totalSales,
      totalPayments,
      pending: Math.max(0, totalSales - totalPayments),
    };
  }, [sales]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (phone.trim().length < 10 || !rfc.trim() || !companyCode.trim()) {
      return;
    }

    lookup.mutate({
      phone: phone.trim(),
      rfc: rfc.trim().toUpperCase(),
      companyCode: companyCode.trim(),
    });
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={10} xl={9}>
          {/* Header con logo de empresa */}
          {(companyCode || lookup.data?.companyName) && (
            <Card className="border-0 shadow-sm mb-4 bg-dark text-white">
              <Card.Body className="py-3">
                <div className="d-flex align-items-center gap-3">
                  {companyCode && (
                    <img
                      src={`/logos/${companyCode}.jpg`}
                      alt={lookup.data?.companyName || 'Logo empresa'}
                      style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h5 className="mb-0">{lookup.data?.companyName || 'Consulta de Historial'}</h5>
                    {lookup.data?.companyName && (
                      <small className="text-muted">Sistema de Gestión de Pagos</small>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          <Button
            variant="outline-secondary"
            size="sm"
            className="mb-3"
            onClick={() => navigate('/login')}
          >
            <FiArrowLeft className="me-1" />
            Volver al inicio
          </Button>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h2 className="mb-1">Consulta de Historial</h2>
              <p className="text-muted mb-4">
                Ingresa tus datos para consultar tu historial de compras y abonos.
              </p>

              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Teléfono</Form.Label>
                      <Form.Control
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10 dígitos"
                        isInvalid={submitted && phone.trim().length < 10}
                      />
                      <Form.Control.Feedback type="invalid">
                        Escribe un teléfono válido.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>RFC</Form.Label>
                      <Form.Control
                        value={rfc}
                        onChange={(e) => setRfc(e.target.value.toUpperCase())}
                        placeholder="XAXX010101000"
                        isInvalid={submitted && !rfc.trim()}
                      />
                      <Form.Control.Feedback type="invalid">
                        El RFC es obligatorio.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Código de empresa</Form.Label>
                      <Form.Control
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value)}
                        placeholder="Ej. BC-001"
                        isInvalid={submitted && !companyCode.trim()}
                      />
                      <Form.Control.Feedback type="invalid">
                        El código de empresa es obligatorio.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Button type="submit" disabled={lookup.isPending} className="w-100" variant="primary">
                      <FiSearch className="me-2" />
                      {lookup.isPending ? 'Consultando...' : 'Consultar historial'}
                    </Button>
                  </Col>
                </Row>
              </Form>

              {lookup.isError && customerNotFound && (
                <Alert variant="warning" className="mt-3 mb-0">
                  No existe un cliente con ese RFC y teléfono para la empresa indicada.
                </Alert>
              )}

              {lookup.isError && !customerNotFound && (
                <Alert variant="danger" className="mt-3 mb-0">
                  {errorInfo?.message || 'No fue posible consultar tu historial. Verifica los datos o intenta más tarde.'}
                </Alert>
              )}

              {(customerNotFound || noMovements || hasMovements) && (
                <Alert
                  className="mt-3 mb-0 d-flex align-items-center"
                  variant={customerNotFound ? 'danger' : noMovements ? 'warning' : 'success'}
                >
                  {customerNotFound ? (
                    <FiAlertTriangle className="me-2" />
                  ) : noMovements ? (
                    <FiInfo className="me-2" />
                  ) : (
                    <FiCheckCircle className="me-2" />
                  )}

                  <span>
                    {customerNotFound
                      ? 'Cliente no encontrado con los datos proporcionados.'
                      : noMovements
                        ? 'Cliente encontrado, pero sin movimientos registrados.'
                        : 'Cliente encontrado con historial disponible.'}
                  </span>
                </Alert>
              )}
            </Card.Body>
          </Card>

          {lookup.isSuccess && (
            <>
              <Row className="g-3 mb-4">
                <Col md={4}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <small className="text-muted d-block">Total compras</small>
                      <h4 className="mb-0">${totals.totalSales.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <small className="text-muted d-block">Total abonado</small>
                      <h4 className="mb-0 text-success">${totals.totalPayments.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <small className="text-muted d-block">Saldo pendiente</small>
                      <h4 className="mb-0 text-danger">${totals.pending.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white py-3">
                  <strong>Historial de {lookup.data?.customerName || 'Cliente'}</strong>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="p-3 border-bottom">
                    <div className="d-flex gap-2">
                      <Form.Control
                        placeholder="Filtrar historial por descripcion, ID de venta o referencia..."
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value)}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setHistoryFilter('')}
                        disabled={!historyFilter.trim()}
                      >
                        Limpiar
                      </Button>
                    </div>
                    <small className="text-muted d-block mt-2">
                      {filteredTimeline.length} resultado{filteredTimeline.length !== 1 ? 's' : ''}
                      {' de '}
                      {timeline.length} movimiento{timeline.length !== 1 ? 's' : ''}
                    </small>
                  </div>
                  {noMovements && (
                    <Alert variant="info" className="m-3 mb-0">
                      El cliente existe, pero no tiene movimientos registrados.
                    </Alert>
                  )}
                  {timeline.length === 0 ? (
                    <div className="p-4 text-muted">
                      {noMovements
                        ? 'Aun no hay compras ni abonos para este cliente.'
                        : 'No se encontraron movimientos con los datos proporcionados.'}
                    </div>
                  ) : (
                    <>
                    {filteredTimeline.length === 0 && (
                      <div className="p-4 text-muted">
                        No hay resultados para el filtro aplicado.
                      </div>
                    )}
                    {filteredTimeline.length > 0 && (
                    <Table responsive hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Venta</th>
                          <th>Monto</th>
                          <th>Detalle</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTimeline.map((item) => (
                          <tr key={item.id}>
                            <td>{new Date(item.date).toLocaleDateString('es-MX')}</td>
                            <td>
                              {item.type === 'sale' ? (
                                <Badge bg="primary"><FiShoppingCart className="me-1" />Compra</Badge>
                              ) : (
                                <Badge bg="success"><FiDollarSign className="me-1" />Abono</Badge>
                              )}
                            </td>
                            <td>#{item.saleId}</td>
                            <td className="fw-semibold">${item.amount.toLocaleString()}</td>
                            <td>
                              {item.type === 'sale' ? (
                                <span className="text-muted">
                                  {sales.find((s) => s.id === item.saleId)?.productDescription || 'Registro de venta'}
                                </span>
                              ) : (
                                <>
                                  <span>{item.paymentMethod}</span>
                                  {item.reference ? <span className="text-muted"> - {item.reference}</span> : null}
                                </>
                              )}
                            </td>
                            <td>
                              {item.type === 'sale' ? (
                                <Badge bg={item.isPaid ? 'success' : 'warning'}>
                                  {item.isPaid ? 'Liquidada' : 'Pendiente'}
                                </Badge>
                              ) : (
                                <Badge bg="secondary"><FiClock className="me-1" />Aplicado</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    )}
                    </>
                  )}
                </Card.Body>
              </Card>
            </>
          )}

          {/* Footer con Jumper */}
          <div className="text-center mt-4 pt-3 border-top">
            <small className="text-muted d-block mb-1">Powered by</small>
            <JumperLogo style={{ width: '100px', height: 'auto', opacity: 0.6 }} />
          </div>
        </Col>
      </Row>
    </Container>
  );
}
