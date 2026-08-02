import { Link, useLocation, useNavigate } from 'react-router-dom';

function SaasAdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar" style={{ backgroundColor: '#111827' }}>
        <div className="sidebar-header" style={{ padding: '2rem 1rem', textAlign: 'center', borderBottom: '1px solid #374151' }}>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.4rem' }}>Panel SaaS</h2>
          <span style={{ backgroundColor: '#EF4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginTop: '0.5rem', display: 'inline-block' }}>
            ADMIN
          </span>
        </div>
        <nav className="sidebar-nav">
          <Link 
            to="/saas-admin" 
            className={`sidebar-link ${location.pathname === '/saas-admin' ? 'active' : ''}`}
          >
            Usuarios
          </Link>
          
          <a href="#" onClick={handleLogout} className="sidebar-link" style={{ color: '#F87171', marginTop: 'auto', borderTop: '1px solid #374151', paddingTop: '1rem' }}>
            Cerrar Sesión
          </a>
        </nav>
      </aside>
      <main className="admin-content" style={{ backgroundColor: '#F3F4F6' }}>
        {children}
      </main>
    </div>
  );
}

export default SaasAdminLayout;
