import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import UserModal from '../../components/UserModal';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsersAndStats = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([
        api.get('/saas/users'),
        api.get('/saas/stats')
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      alert('Error cargando la información de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndStats();
  }, []);

  const handleCreateOrEdit = async (payload) => {
    try {
      if (editingUser) {
        await api.put(`/saas/users/${editingUser.id}`, payload);
      } else {
        await api.post('/saas/users', payload);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      await fetchUsersAndStats();
    } catch (error) {
      if (error.response && error.response.data) {
        alert(error.response.data.message);
      } else {
        alert('Error al guardar el usuario');
      }
    }
  };

  const handleToggleSuspend = async (user) => {
    if (!window.confirm(`¿Estás seguro de que deseas ${user.isActive ? 'suspender' : 'activar'} al usuario ${user.username}?`)) return;
    try {
      await api.put(`/saas/users/${user.id}`, { isActive: !user.isActive });
      await fetchUsersAndStats();
    } catch (error) {
      alert('Error cambiando estado del usuario');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¡ADVERTENCIA! Estás a punto de borrar al usuario ${user.username} y TODOS SUS NEGOCIOS. Esta acción no se puede deshacer. ¿Continuar?`)) return;
    try {
      await api.delete(`/saas/users/${user.id}`);
      await fetchUsersAndStats();
    } catch (error) {
      alert('Error eliminando usuario');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#111827' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Gestión de Usuarios (CEOs)</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
        >
          + Crear Usuario
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6B7280' }}>Usuarios Totales</h4>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalUsers}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6B7280' }}>Activos</h4>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#10B981' }}>{stats.activeUsers}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6B7280' }}>Suspendidos</h4>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#EF4444' }}>{stats.suspendedUsers}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#6B7280' }}>Negocios Totales</h4>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#3B82F6' }}>{stats.totalBusinesses}</p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre o usuario..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB' }}
        />
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '1rem' }}>Usuario</th>
              <th style={{ padding: '1rem' }}>Nombre</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Negocios</th>
              <th style={{ padding: '1rem' }}>Estado</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center' }}>Cargando...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center' }}>No se encontraron usuarios.</td></tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{u.username}</td>
                  <td style={{ padding: '1rem' }}>{u.fullName}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {u.businessCount}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      backgroundColor: u.isActive ? '#D1FAE5' : '#FEE2E2', 
                      color: u.isActive ? '#065F46' : '#991B1B', 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' 
                    }}>
                      {u.isActive ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                      style={{ padding: '0.5rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleToggleSuspend(u)}
                      style={{ padding: '0.5rem', backgroundColor: u.isActive ? '#FEF2F2' : '#ECFDF5', color: u.isActive ? '#DC2626' : '#059669', border: `1px solid ${u.isActive ? '#FCA5A5' : '#6EE7B7'}`, borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {u.isActive ? 'Suspender' : 'Activar'}
                    </button>
                    <button 
                      onClick={() => handleDelete(u)}
                      style={{ padding: '0.5rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }} 
        onSave={handleCreateOrEdit}
        initialData={editingUser}
      />
    </div>
  );
}

export default UserManagement;
