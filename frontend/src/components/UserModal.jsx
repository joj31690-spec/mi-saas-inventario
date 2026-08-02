import React, { useState, useEffect } from 'react';

function UserModal({ isOpen, onClose, onSave, initialData = null }) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setUsername(initialData.username || '');
      setFullName(initialData.fullName || '');
      setPassword('');
      setChangePassword(false);
    } else {
      setUsername('');
      setFullName('');
      setPassword('');
      setChangePassword(true);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = { username, fullName };
    if (changePassword && password) {
      payload.password = password;
    }
    
    await onSave(payload);
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#111827' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>{initialData ? 'Editar Usuario' : 'Crear Usuario CEO'}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ color: '#374151' }}>Nombre Completo *</label>
            <input 
              type="text" 
              required 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="Ej. Juan Pérez" 
              style={{ backgroundColor: '#F9FAFB', color: '#111827', border: '1px solid #D1D5DB' }}
            />
          </div>
          
          <div className="form-group">
            <label style={{ color: '#374151' }}>Usuario (Login) *</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Ej. jperez" 
              style={{ backgroundColor: '#F9FAFB', color: '#111827', border: '1px solid #D1D5DB' }}
            />
          </div>
          
          {initialData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="changePass" 
                checked={changePassword} 
                onChange={(e) => setChangePassword(e.target.checked)} 
              />
              <label htmlFor="changePass" style={{ color: '#374151', cursor: 'pointer' }}>Cambiar contraseña</label>
            </div>
          )}

          {changePassword && (
            <div className="form-group">
              <label style={{ color: '#374151' }}>{initialData ? 'Nueva Contraseña' : 'Contraseña'} *</label>
              <input 
                type="password" 
                required={!initialData || changePassword} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="********" 
                style={{ backgroundColor: '#F9FAFB', color: '#111827', border: '1px solid #D1D5DB' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn" style={{ backgroundColor: '#E5E7EB', color: '#374151' }} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !username.trim() || !fullName.trim() || (changePassword && !password)}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserModal;
