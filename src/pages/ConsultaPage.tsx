import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiDollarSign, FiInfo, FiSearch, FiShoppingCart } from 'react-icons/fi';
import { usePublicHistoryLookup } from '../features/sales/hooks/usePublicHistory';
import { parsePublicHistoryError } from '../features/sales/api/publicHistoryApi';
import type { Payment, Sale } from '../shared/types';

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
  const [phone, setPhone] = useState('');
  const [rfc, setRfc] = useState('');
  const [companyCode, setCompanyCode] = useState('');
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
  const hasMovements = lookup.isSuccess && timeline.length > 0;

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

      (sale.payment ?? []).forEach((payment: Payment) => {
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

  const totals = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalPayments = sales
      .flatMap((s) => s.payment ?? [])
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
                  <strong>Historial (ordenado por fecha)</strong>
                </Card.Header>
                <Card.Body className="p-0">
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
                        {timeline.map((item) => (
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
                                <span className="text-muted">Registro de venta</span>
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
                </Card.Body>
              </Card>
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}
