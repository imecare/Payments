import { Alert } from 'react-bootstrap';
import axios from 'axios';
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
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;

  const resolvedVariant = status === 403 ? 'warning' : 'danger';
  const resolvedTitle =
    status === 403
      ? 'Acceso denegado'
      : status === 401
        ? 'Sesion no valida'
        : title;

  return (
    <Alert variant={resolvedVariant} className="my-3">
      <Alert.Heading>{resolvedTitle}</Alert.Heading>
      <p>{message}</p>
      {status === 403 && (
        <small className="text-muted">
          Tu usuario no tiene permisos para este recurso. Si crees que es un error, solicita acceso al administrador.
        </small>
      )}
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
