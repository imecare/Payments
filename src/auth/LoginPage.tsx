import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axiosClient from '../shared/api/axiosClient';
import { Form, Button, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FiRefreshCw } from 'react-icons/fi';
import JumperLogo from '../components/JumperLogo';


export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  type LoginResponse = {
    token: string;
    role?: string;
    sellerId?: number | null;
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  const getLandingPath = (response: LoginResponse): string => {
    if (response.role) {
      const normalizedRole = response.role.toLowerCase();
      if (normalizedRole === 'commissionist' || normalizedRole === 'seller' || normalizedRole === 'vendedor') {
        return '/mi-cartera';
      }
      return '/dashboard';
    }

    const token = response.token;
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const normalized = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const parsed = JSON.parse(atob(normalized)) as Record<string, unknown>;
      const roleRaw =
        parsed.role ??
        parsed.roles ??
        parsed.userRole ??
        parsed['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      const role = Array.isArray(roleRaw) ? String(roleRaw[0] ?? '') : String(roleRaw ?? '');
      const normalizedRole = role.toLowerCase();
      if (
        normalizedRole.includes('commission') ||
        normalizedRole.includes('seller') ||
        normalizedRole.includes('vendedor')
      ) {
        return '/mi-cartera';
      }
      return '/dashboard';
    } catch {
      return '/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsConnectionError(false);
    try {
      const { data } = await axiosClient.post<LoginResponse>('/api/Auth/login', credentials);
      login({
        token: data.token,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      });
      navigate(getLandingPath(data));
    } catch (e: unknown) {
      console.error('[Login error]', e);

      // Errors thrown by login() are plain Error objects (no .response)
      const isAxiosError = (err: unknown): err is { response?: { status?: number; data?: { message?: string; title?: string } }; code?: string; message: string } =>
        typeof err === 'object' && err !== null && 'message' in err;

      const err = isAxiosError(e) ? e : { message: 'Error desconocido', response: undefined, code: undefined };
      const httpStatus = err.response?.status;
      const serverMsg = err.response?.data?.message || err.response?.data?.title || '';

      if (httpStatus === 401 || httpStatus === 400) {
        setError('Credenciales inválidas. Verifica tu email y contraseña.');
      } else if (httpStatus !== undefined && httpStatus >= 500) {
        setError('Error en el servidor. Por favor, intenta más tarde.');
        setIsConnectionError(true);
      } else if (!err.response) {
        // No HTTP response: network error OR login() threw (bad token)
        const msg = err.message ?? '';
        if (msg.includes('Token inválido') || msg.includes('sellerId') || msg.includes('expirado')) {
          setError(`Error de autenticación: ${msg}`);
        } else if (err.code === 'ECONNABORTED' || msg.includes('timeout')) {
          setError('Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.');
          setIsConnectionError(true);
        } else {
          setError('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
          setIsConnectionError(true);
        }
      } else {
        setError(serverMsg || 'No se pudo iniciar sesión. Intenta de nuevo.');
      }

      setIsLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={4}>
          <div className="text-center mb-4">
            <JumperLogo className="w-100 h-auto" style={{ maxWidth: '280px', margin: '0 auto' }} />
          </div>
          <h3 className="text-center mb-3">Iniciar sesión</h3>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <div style={{ position: 'relative' }}>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                />
                <span
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#888',
                    fontSize: 20
                  }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={0}
                  role="button"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </Button>
          </Form>
          <div className="text-center mt-3">
            <small className="text-muted">¿Eres cliente?</small>{' '}
            <Link to="/consulta">Consultar historial sin login</Link>
          </div>
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
              {isConnectionError && (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  className="ms-2"
                  onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={isLoading}
                >
                  <FiRefreshCw className="me-1" />
                  Reintentar
                </Button>
              )}
            </Alert>
          )}
        </Col>
      </Row>
    </Container>
  );
}