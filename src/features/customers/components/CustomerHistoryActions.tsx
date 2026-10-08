import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { FiCheckCircle, FiClock, FiCopy, FiDollarSign, FiEye, FiLink, FiShoppingCart } from 'react-icons/fi';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ResponsiveTable from '../../../components/ResponsiveTable';
import { useCompanyContext } from '../../company/hooks/useCompanyContext';
import { usePublicHistoryLookup } from '../../sales/hooks/usePublicHistory';
import type { Customer, Payment, Sale } from '../../../shared/types';

interface CustomerHistoryActionsProps {
  customer: Customer;
}

export default function CustomerHistoryActions({ customer }: CustomerHistoryActionsProps) {
  const { data: companyData } = useCompanyContext();
  const historyLookup = usePublicHistoryLookup();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const companyCode = companyData?.companyCode || companyData?.tenantId || '';

  const getCustomerHistoryUrl = () => {
    const params = new URLSearchParams({
      phone: customer.phone,
      rfc: customer.rfc || 'XAXX010101000',
      code: companyCode,
    });
    return `${window.location.origin}/consulta?${params.toString()}`;
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getCustomerHistoryUrl());
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleViewHistory = () => {
    setShowHistoryModal(true);
    historyLookup.mutate({
      phone: customer.phone,
      rfc: customer.rfc || 'XAXX010101000',
      companyCode,
    });
  };

  const historyTotals = useMemo(() => {
    const sales = historyLookup.data?.sales ?? [];
    const payments = sales
      .flatMap((sale) => sale.payments ?? sale.payment ?? [])
      .filter((payment) => payment.paymentTypeId === 2);
    const lastPaymentDate = payments
      .map((payment) => payment.date)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    return {
      totalSales: historyLookup.data?.totalActivePurchases ?? 0,
      totalPayments: historyLookup.data?.totalPaidOnActivePurchases ?? 0,
      pending: Math.max(
        0,
        (historyLookup.data?.totalActivePurchases ?? 0) -
          (historyLookup.data?.totalPaidOnActivePurchases ?? 0)
      ),
      lastPaymentDate,
    };
  }, [historyLookup.data]);

  const historyTimeline = useMemo(() => {
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

    (historyLookup.data?.sales ?? []).forEach((sale: Sale) => {
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
      const difference = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      if (difference !== 0) return difference;
      if (a.type !== b.type) return a.type === 'sale' ? -1 : 1;
      return 0;
    });
  }, [historyLookup.data?.sales]);

  return (
    <>
      <OverlayTrigger placement="top" overlay={<Tooltip>Ver historial</Tooltip>}>
        <Button
          size="sm"
          variant="outline-success"
          onClick={handleViewHistory}
          aria-label={`Ver historial de ${customer.name}`}
        >
          <FiEye />
        </Button>
      </OverlayTrigger>
      <OverlayTrigger placement="top" overlay={<Tooltip>Copiar link</Tooltip>}>
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={handleCopyLink}
          aria-label={`Copiar link para ${customer.name}`}
        >
          <FiLink />
        </Button>
      </OverlayTrigger>

      {copiedLink && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
          <Alert variant="success" className="d-flex align-items-center mb-0">
            <FiCheckCircle className="me-2" />
            Link copiado al portapapeles
          </Alert>
        </div>
      )}

      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Historial de {customer.name} {customer.lastName}</Modal.Title>
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
              <Row className="g-3 mb-4">
                <Col xs={6} md={3}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <small className="text-muted d-block">Total compras activas</small>
                      <h4 className="mb-0">${historyTotals.totalSales.toLocaleString()}</h4>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={6} md={3}>
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <small className="text-muted d-block">Total abonado a compras activas</small>
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
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-muted fst-italic fs-6">Sin abonos</span>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {historyTimeline.length === 0 ? (
                <Alert variant="info">Este cliente no tiene movimientos registrados.</Alert>
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
                    { key: 'venta', header: 'Venta', render: (item) => <Badge bg="light" text="dark">#{item.saleId}</Badge> },
                    { key: 'monto', header: 'Monto', className: 'fw-semibold', render: (item) => `$${item.amount.toLocaleString()}` },
                    {
                      key: 'detalle',
                      header: 'Detalle',
                      render: (item) => item.type === 'sale'
                        ? <span className="text-muted">{item.description || 'Registro de venta'}</span>
                        : <span>{item.paymentMethod}{item.reference ? <span className="text-muted"> - {item.reference}</span> : null}</span>,
                    },
                    {
                      key: 'estado',
                      header: 'Estado',
                      render: (item) => item.type === 'sale'
                        ? <Badge bg={item.isPaid ? 'success' : 'warning'}>{item.isPaid ? 'Liquidada' : 'Pendiente'}</Badge>
                        : <Badge bg="secondary"><FiClock className="me-1" />Aplicado</Badge>,
                    },
                  ]}
                />
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleCopyLink}>
            <FiCopy className="me-2" />
            Copiar link para cliente
          </Button>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}