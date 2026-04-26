import { Spinner, Container } from 'react-bootstrap';

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean;
}

/**
 * Componente de carga reutilizable
 */
export function LoadingSpinner({ 
  message = 'Cargando...', 
  fullPage = false 
}: LoadingSpinnerProps) {
  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">{message}</span>
      </Spinner>
      <p className="mt-3 text-muted">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        {content}
      </Container>
    );
  }

  return content;
}

export default LoadingSpinner;
