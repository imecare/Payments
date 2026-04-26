import { useContext, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../auth/AuthContext';
import { Container, Nav, Button, Badge } from 'react-bootstrap';
import { 
  FiHome, FiShoppingCart, FiDollarSign, FiUsers, 
  FiUserCheck, FiSettings, FiLogOut, FiMenu, FiX, FiCreditCard
} from 'react-icons/fi';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  isActive: boolean;
}

function NavItem({ to, icon, label, badge, isActive }: NavItemProps) {
  return (
    <Nav.Item>
      <Nav.Link 
        as={Link} 
        to={to} 
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
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { to: '/dashboard', icon: <FiHome size={18} />, label: 'Dashboard' },
    { to: '/sales', icon: <FiShoppingCart size={18} />, label: 'Ventas' },
    { to: '/abonos', icon: <FiCreditCard size={18} />, label: 'Abonos' },
    { to: '/payments', icon: <FiDollarSign size={18} />, label: 'Registrar Abono' },
    { to: '/clients', icon: <FiUsers size={18} />, label: 'Clientes' },
    { to: '/sellers', icon: <FiUserCheck size={18} />, label: 'Vendedores' },
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
        <div className="p-4 border-bottom border-secondary">
          <h4 className="mb-0 d-flex align-items-center">
            <FiDollarSign className="me-2 text-primary" />
            BusinessCloud
          </h4>
          <small className="text-muted">Sistema de Pagos</small>
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
            />
          ))}
        </Nav>

        {/* Footer */}
        <div className="p-3 border-top border-secondary">
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
      <header className="d-md-none bg-dark text-white p-3 d-flex justify-content-between align-items-center sticky-top">
        <h5 className="mb-0">
          <FiDollarSign className="me-2 text-primary" />
          BusinessCloud
        </h5>
        <Button
          variant="outline-light"
          size="sm"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          {open ? <FiX size={20} /> : <FiMenu size={20} />}
        </Button>
      </header>

      {/* Main Content */}
      <main 
        className="flex-grow-1 bg-light"
        style={{ 
          marginLeft: '0',
          minHeight: '100vh',
        }}
      >
        <div className="d-none d-md-block" style={{ marginLeft: '250px' }}>
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
