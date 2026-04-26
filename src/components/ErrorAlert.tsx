import { Alert } from 'react-bootstrap';
import { extractErrorMessage } from '../shared/api/axiosClient';

interface ErrorAlertProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

/**
 * Componente de alerta de error reutilizable
 */
export function ErrorAlert({ 
  error, 
  title = 'Error', 
  onRetry 
}: ErrorAlertProps) {
  const message = extractErrorMessage(error);

  return (
    <Alert variant="danger" className="my-3">
      <Alert.Heading>{title}</Alert.Heading>
      <p>{message}</p>
      {onRetry && (
        <>
          <hr />
          <div className="d-flex justify-content-end">
            <Alert.Link onClick={onRetry} style={{ cursor: 'pointer' }}>
              Reintentar
            </Alert.Link>
          </div>
        </>
      )}
    </Alert>
  );
}

export default ErrorAlert;
