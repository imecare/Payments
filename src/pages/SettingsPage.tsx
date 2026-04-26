import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Row } from 'react-bootstrap';
import { FiCheckCircle, FiCopy, FiKey } from 'react-icons/fi';
import { useCompanyContext } from '../features/company/hooks/useCompanyContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

export default function SettingsPage() {
  const { data, isLoading, error, refetch } = useCompanyContext();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data?.companyCode) return;
    await navigator.clipboard.writeText(data.companyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isLoading) {
    return <LoadingSpinner message="Cargando configuración..." fullPage />;
  }

  if (error && !data?.companyCode) {
    return <ErrorAlert error={error} title="No se pudo cargar el código de empresa" onRetry={refetch} />;
  }

  return (
    <Container fluid>
      <div className="mb-4">
        <h4 className="mb-1">Configuración</h4>
        <p className="text-muted mb-0">Código para consulta pública de clientes</p>
      </div>

      <Row className="g-3">
        <Col lg={7}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-3">
                <FiKey size={20} className="me-2 text-primary" />
                <h5 className="mb-0">Código de Empresa</h5>
              </div>

              <p className="text-muted mb-2">
                Comparte este código con el cliente para que pueda consultar su historial en la página pública.
              </p>

              <div className="border rounded p-3 bg-light d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted d-block">Código</small>
                  <h4 className="mb-0">{data?.companyCode || 'No disponible'}</h4>
                </div>
                <Button
                  variant="outline-primary"
                  onClick={handleCopy}
                  disabled={!data?.companyCode}
                >
                  <FiCopy className="me-2" />
                  Copiar
                </Button>
              </div>

              {copied && (
                <Alert variant="success" className="mt-3 mb-0 py-2">
                  <FiCheckCircle className="me-2" />
                  Código copiado al portapapeles.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <h6>Datos de empresa</h6>
              <hr />
              <p className="mb-2">
                <strong>Nombre:</strong> {data?.companyName || 'No disponible'}
              </p>
              <p className="mb-0">
                <strong>Tenant:</strong> {data?.tenantId || 'No disponible'}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
