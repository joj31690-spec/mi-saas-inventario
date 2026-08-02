import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      const data = response.data;

      localStorage.setItem('token', data.token);
      const systemRole = data.user.systemRole || data.user.role;
      localStorage.setItem('systemRole', systemRole);
      localStorage.setItem('username', response.data.user.username);
      localStorage.setItem('fullName', response.data.user.fullName || data.user.username);
      localStorage.setItem('canManageUsers', response.data.user.canManageUsers);
      localStorage.setItem('canEditUsers', response.data.user.canEditUsers);
      localStorage.setItem('canDeleteUsers', response.data.user.canDeleteUsers);

      if (systemRole === 'ADMIN') {
        navigate('/saas-admin');
      } else {
        navigate('/businesses');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || 'Error de autenticación');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="premium-glass-card">
        <h2 className="login-title">Ingreso al sistema</h2>
        <p className="login-subtitle">Gestión Avanzada de Negocios</p>
        
        <form onSubmit={handleLogin} className="premium-form">
          <div className="premium-input-group">
            <label htmlFor="username">Usuario</label>
            <div className="premium-input-wrapper">
              <input
                id="username"
                type="text"
                className="premium-input"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="premium-input-group">
            <label htmlFor="password">Contraseña</label>
            <div className="premium-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="premium-input"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          
          {error && <div className="error-bubble">{error}</div>}
          
          <button type="submit" className="premium-btn" disabled={loading}>
            {loading ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
