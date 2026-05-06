import { Alert, Button, Card, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiShieldOff, FiHome } from 'react-icons/fi';

export default function ForbiddenPage() {
  return (
    <Container fluid className="py-4">
      <Card className="mx-auto" style={{ maxWidth: 720 }}>
        <Card.Body className="p-4 p-md-5 text-center">
          <div className="mb-3 text-warning">
            <FiShieldOff size={40} />
          </div>
          <h4 className="mb-2">Acceso denegado</h4>
          <p className="text-muted mb-4">
            Tu usuario no tiene permisos para acceder a esta seccion.
          </p>

          <Alert variant="warning" className="text-start mb-4">
            Si necesitas este acceso, solicita al administrador que ajuste tu rol o permisos.
          </Alert>

          <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
            <Button as={Link} to="/sales" variant="primary">
              <FiHome className="me-2" />
              Volver a Ventas
            </Button>
            <Button as={Link} to="/mi-cartera" variant="outline-secondary">
              Ir a Mi Cartera
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
