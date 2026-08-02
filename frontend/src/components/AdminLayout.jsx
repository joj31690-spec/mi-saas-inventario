import { Link, useLocation } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import LogoDisplay from './LogoDisplay';

function AdminLayout({ children }) {
  const location = useLocation();
  const { selectedBusiness, clearBusiness } = useBusiness();

  const username = localStorage.getItem('fullName') || localStorage.getItem('username');

  const handleChangeBusiness = (e) => {
    e.preventDefault();
    clearBusiness();
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ 
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
          padding: '1.25rem 1rem', borderBottom: '1px solid #374151', backgroundColor: '#111827'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LogoDisplay logo={selectedBusiness?.logo} name={selectedBusiness?.name || 'Local'} size={45} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedBusiness?.name || 'Local de comida'}</h3>
              {username && <div style={{ color: '#D1D5DB', fontSize: '0.8rem', marginTop: '2px' }}>👤 {username}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ backgroundColor: '#3B82F6', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              Rol: {selectedBusiness?.role === 'CEO' ? 'Administrador' : selectedBusiness?.role === 'GERENTE' ? 'Encargado' : selectedBusiness?.role === 'EMPLEADO' ? 'Personal' : (selectedBusiness?.role || 'Admin')}
            </span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <Link 
            to="/admin" 
            className={`sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`}
          >
            Inicio
          </Link>
          <Link 
            to="/admin/inventory" 
            className={`sidebar-link ${location.pathname.includes('/inventory') ? 'active' : ''}`}
          >
            Inventario
          </Link>
          <Link 
            to="/admin/menu" 
            className={`sidebar-link ${location.pathname.includes('/menu') ? 'active' : ''}`}
          >
            Menú
          </Link>
          <Link 
            to="/admin/users" 
            className={`sidebar-link ${location.pathname.includes('/users') ? 'active' : ''}`}
          >
            Usuarios Locales
          </Link>
          <Link 
            to="/admin/personal" 
            className={`sidebar-link ${location.pathname.includes('/personal') ? 'active' : ''}`}
          >
            Personal Local
          </Link>
          <Link 
            to="/admin/sales" 
            className={`sidebar-link ${location.pathname.includes('/sales') ? 'active' : ''}`}
          >
            Ventas
          </Link>
          {selectedBusiness?.role === 'CEO' && (
            <Link 
              to="/admin/finances" 
              className={`sidebar-link ${location.pathname.includes('/finances') ? 'active' : ''}`}
            >
              Finanzas
            </Link>
          )}
          <a href="#" onClick={handleChangeBusiness} className="sidebar-link" style={{ color: '#EF4444', marginTop: 'auto', borderTop: '1px solid #374151', paddingTop: '1rem', fontWeight: 'bold' }}>
            Salir
          </a>
        </nav>
      </aside>
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
