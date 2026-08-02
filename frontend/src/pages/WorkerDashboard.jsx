import { useNavigate } from 'react-router-dom';

function WorkerDashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Portal de Trabajador</div>
        <div>
          <span style={{marginRight: '1rem'}}>Hola, {username}</span>
          <button onClick={handleLogout} className="btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>Salir</button>
        </div>
      </nav>
      
      <div className="container">
        <h1>Bienvenido a tu turno</h1>
        <p>Registra tu asistencia y gestiona las ventas diarias desde este portal.</p>
        
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Registro de Asistencia</h3>
            <p>Marca tu hora de entrada y salida.</p>
            <button className="btn" style={{marginTop: '1rem'}}>Registrar</button>
          </div>
          <div className="dashboard-card">
            <h3>Nueva Venta</h3>
            <p>Registra una orden del menú.</p>
            <button className="btn" style={{marginTop: '1rem'}}>Ir a Ventas</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkerDashboard;
