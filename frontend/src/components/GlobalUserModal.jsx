import React, { useState, useEffect } from 'react';

function GlobalUserModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    canManageUsers: false,
    canEditUsers: false
  });
  const [loading, setLoading] = useState(false);
  const currentUsername = localStorage.getItem('username');
  const canDeleteUsers = localStorage.getItem('canDeleteUsers') === 'true';
  const systemRole = localStorage.getItem('systemRole');

  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || '',
        username: initialData.username || '',
        password: '', // Leave empty for edit unless they want to change
        email: initialData.email || '',
        phone: initialData.phone || '',
        canManageUsers: initialData.canManageUsers || false,
        canEditUsers: initialData.canEditUsers || false
      });
    } else {
      setFormData({ fullName: '', username: '', password: '', email: '', phone: '', canManageUsers: false, canEditUsers: false });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
    setFormData({ fullName: '', username: '', password: '', email: '', phone: '' });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{initialData ? 'Editar Personal Global' : 'Crear Cuenta de Personal Global'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nombre Completo *</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Nombre de Usuario *</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Contraseña {initialData ? '(Opcional)' : '*'}</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required={!initialData} minLength={4} placeholder={initialData ? "Dejar vacío para mantener actual" : ""} />
          </div>
          <div className="form-group">
            <label>Email (opcional)</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Teléfono (opcional)</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
          </div>
          
          {(!initialData || initialData.username !== currentUsername) && (canDeleteUsers || systemRole === 'ADMIN') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  name="canManageUsers" 
                  id="canManageUsers"
                  checked={formData.canManageUsers} 
                  onChange={handleChange} 
                  style={{ margin: 0, width: 'auto', height: 'auto' }}
                />
                <label htmlFor="canManageUsers" style={{ margin: 0 }}>Permitir agregar otros usuarios</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  name="canEditUsers" 
                  id="canEditUsers"
                  checked={formData.canEditUsers} 
                  onChange={handleChange} 
                  style={{ margin: 0, width: 'auto', height: 'auto' }}
                />
                <label htmlFor="canEditUsers" style={{ margin: 0 }}>Permitir editar usuarios</label>
              </div>
            </div>
          )}
          
          <div className="modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Crear Usuario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GlobalUserModal;
