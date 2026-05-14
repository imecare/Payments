import { useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCompanyContext } from '../features/company/hooks/useCompanyContext';
import { Container, Nav, Button, Badge } from 'react-bootstrap';
import { 
  FiHome, FiShoppingCart, FiDollarSign, FiUsers, 
  FiUserCheck, FiSettings, FiLogOut, FiMenu, FiX, FiCreditCard
} from 'react-icons/fi';
import JumperLogo from '../components/JumperLogo';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon, label, badge, isActive, onClick }: NavItemProps) {
  return (
    <Nav.Item>
      <Nav.Link 
        as={Link} 
        to={to}
        onClick={onClick}
        className={`text-white d-flex align-items-center py-2 px-3 rounded mb-1 ${
          isActive ? 'bg-primary' : 'hover-bg-dark'
        }`}
        style={{ transition: 'background-color 0.2s' }}
      >
        <span className="me-3">{icon}</span>
        <span className="flex-grow-1">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge bg="danger" pill>{badge}</Badge>
        )}
      </Nav.Link>
    </Nav.Item>
  );
}

export default function SidebarLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout, isSuperAdmin, isCommissionist } = useAuth();
  const { data: companyData } = useCompanyContext();
  const navigate = useNavigate();
  const location = useLocation();

  const companyCode = companyData?.companyCode || companyData?.tenantId || '';
  const companyName = companyData?.companyName || 'Mi Empresa';
  const logoUrl = companyCode ? `/logos/${companyCode}.jpg` : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    ...(isSuperAdmin ? [{ to: '/dashboard', icon: <FiHome size={18} />, label: 'Dashboard' }] : []),
    ...(isCommissionist
      ? [{ to: '/mi-cartera', icon: <FiHome size={18} />, label: 'Mi Cartera' }]
      : []),
    { to: '/sales', icon: <FiShoppingCart size={18} />, label: 'Ventas' },
    ...(isSuperAdmin ? [{ to: '/abonos', icon: <FiCreditCard size={18} />, label: 'Abonos' }] : []),
    ...(isSuperAdmin
      ? [{ to: '/payments', icon: <FiDollarSign size={18} />, label: 'Registrar Abono' }]
      : []),
    ...(isSuperAdmin ? [{ to: '/clients', icon: <FiUsers size={18} />, label: 'Clientes' }] : []),
    ...(isSuperAdmin ? [{ to: '/sellers', icon: <FiUserCheck size={18} />, label: 'Vendedores' }] : []),
  ];

  return (
    <div className="d-flex flex-column flex-md-row min-vh-100">
      {/* Sidebar */}
      <aside
        className={`bg-dark text-white ${open ? 'd-block' : 'd-none'} d-md-flex flex-column`}
        style={{ 
          width: '250px', 
          minHeight: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* Logo/Brand */}
        <div className="p-3 text-center bg-white">
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={companyName}
              style={{ maxWidth: '180px', maxHeight: '60px', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = document.getElementById('company-name-fallback');
                if (fallback) fallback.style.display = 'block';
              }}
            />
          )}
          <h5 
            id="company-name-fallback" 
            className="text-dark mb-0" 
            style={{ display: logoUrl ? 'none' : 'block' }}
          >
            {companyName}
          </h5>
          <small className="text-muted d-block mt-1">{companyName}</small>
        </div>

        {/* Navigation */}
        <Nav className="flex-column p-3 flex-grow-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isActive={isActive(item.to)}
              onClick={() => setOpen(false)}
            />
          ))}
        </Nav>

        {/* Footer */}
        <div className="p-3 border-top border-secondary">
          <div className="mb-3 px-2">
            <div className="small text-white fw-semibold">{user?.displayName || user?.email || 'Usuario'}</div>
            <div className="small text-muted">
              {user?.userId && <span>ID: {user.userId}</span>}
            </div>
            <div className="small text-muted">
              {isSuperAdmin ? 'SuperAdmin' : isCommissionist ? 'Vendedor' : 'Sin rol'}
            </div>
          </div>

          {/* Versión del sistema */}
          <div className="mb-3 px-2">
            <div className="small text-muted">Versión</div>
            <div className="small text-white fw-bold">v1.0.0 Alpha</div>
            <div className="progress mt-1" style={{ height: '3px' }}>
              <div className="progress-bar bg-primary" style={{ width: '40%' }}></div>
            </div>
          </div>

          <Nav.Item>
            <Nav.Link 
              as={Link} 
              to="/settings" 
              className={`text-white d-flex align-items-center py-2 px-3 rounded mb-2 ${
                isActive('/settings') ? 'bg-primary' : ''
              }`}
            >
              <FiSettings className="me-3" size={18} />
              Configuración
            </Nav.Link>
          </Nav.Item>
          <Button 
            variant="outline-light" 
            className="w-100 d-flex align-items-center justify-content-center" 
            onClick={handleLogout}
          >
            <FiLogOut className="me-2" />
            Cerrar sesión
          </Button>

          {/* Powered by Jumper */}
          <div className="mt-3 pt-2 border-top border-secondary text-center">
            <small className="text-muted d-block mb-1" style={{ fontSize: '10px' }}>Powered by</small>
            <JumperLogo style={{ width: '80px', height: 'auto', opacity: 0.7 }} />
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div 
          className="d-md-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 999 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Header */}
      <header
        className="d-md-none sticky-top d-flex justify-content-between align-items-center px-3"
        style={{
          background: '#ffffff',
          borderBottom: '2px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          minHeight: '56px',
          zIndex: 1030,
        }}
      >
        {/* Logo o nombre de empresa */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            style={{ maxWidth: '140px', maxHeight: '38px', objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const fallback = document.getElementById('mobile-company-name');
              if (fallback) fallback.style.display = 'block';
            }}
          />
        ) : null}
        <span
          id="mobile-company-name"
          className="fw-bold text-dark"
          style={{ display: logoUrl ? 'none' : 'block', fontSize: '1rem' }}
        >
          {companyName}
        </span>

        {/* Botón hamburguesa */}
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          style={{ borderColor: '#dee2e6', color: '#495057' }}
        >
          {open ? <FiX size={20} /> : <FiMenu size={20} />}
        </Button>
      </header>

      {/* Main Content */}
      <main 
        className="flex-grow-1 bg-white"
        style={{ minHeight: '100vh' }}
      >
        <div className="d-none d-md-block">
          <Container fluid className="p-4">
            <Outlet />
          </Container>
        </div>
        <div className="d-md-none">
          <Container fluid className="p-3">
            <Outlet />
          </Container>
        </div>
      </main>

      {/* Custom styles */}
      <style>{`
        .hover-bg-dark:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        @media (min-width: 768px) {
          main {
            margin-left: 250px !important;
          }
        }
      `}</style>
    </div>
  );
}
