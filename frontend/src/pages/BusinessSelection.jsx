import React, { useEffect, useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LogoDisplay from '../components/LogoDisplay';
import BusinessModal from '../components/BusinessModal';
import GlobalUserModal from '../components/GlobalUserModal';

function BusinessSelection() {
  const { selectBusiness } = useBusiness();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [isGlobalUserModalOpen, setIsGlobalUserModalOpen] = useState(false);
  const [editingGlobalUser, setEditingGlobalUser] = useState(null);
  const [activeTab, setActiveTab] = useState('businesses'); // 'businesses', 'global_personal'
  const [globalUsers, setGlobalUsers] = useState([]);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  
  const lastUsedBusinessId = parseInt(localStorage.getItem('lastUsedBusinessId')) || null;
  const username = localStorage.getItem('fullName') || localStorage.getItem('username');
  const currentUsername = localStorage.getItem('username');
  const systemRole = localStorage.getItem('systemRole') || 'EMPLEADO';
  const canManageUsers = localStorage.getItem('canManageUsers') === 'true';
  const canEditUsers = localStorage.getItem('canEditUsers') === 'true';
  const canDeleteUsers = localStorage.getItem('canDeleteUsers') === 'true';

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/businesses');
      setBusinesses(response.data);
    } catch (err) {
      setError('Error al cargar tus negocios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (activeTab === 'global_personal' && systemRole === 'CEO') {
      fetchGlobalUsers();
    }
  }, [activeTab, systemRole]);

  const fetchGlobalUsers = async () => {
    try {
      const res = await api.get('/global-users');
      setGlobalUsers(res.data);
    } catch (err) {
      console.error('Error fetching global users:', err);
    }
  };

  const handleSelect = (business) => {
    selectBusiness(business);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('systemRole');
    localStorage.removeItem('username');
    localStorage.removeItem('fullName');
    localStorage.removeItem('selectedBusiness');
    localStorage.removeItem('lastUsedBusinessId');
    navigate('/');
  };

  const handleCreateBusiness = async (formData) => {
    try {
      if (editingBusiness) {
        await api.put(`/businesses/${editingBusiness.id}`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'X-Business-Id': editingBusiness.id
          }
        });
      } else {
        await api.post('/businesses', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      await fetchBusinesses();
      setIsModalOpen(false);
      setEditingBusiness(null);
    } catch (err) {
      if (err.response && err.response.data) {
        alert(err.response.data.message || 'Error al guardar negocio');
      } else {
        alert('Error al guardar negocio');
      }
    }
  };

  const openCreateModal = () => {
    setEditingBusiness(null);
    setIsModalOpen(true);
  };

  const openEditModal = (business) => {
    setEditingBusiness(business);
    setIsModalOpen(true);
  };

  const openDeleteModal = (business) => {
    setBusinessToDelete(business);
    setDeletePassword('');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteBusiness = async () => {
    if (!deletePassword) {
      alert('Debes ingresar tu contraseña para eliminar el negocio');
      return;
    }
    
    try {
      await api.delete(`/businesses/${businessToDelete.id}`, {
        data: { password: deletePassword }
      });
      setIsDeleteModalOpen(false);
      setBusinessToDelete(null);
      setDeletePassword('');
      fetchBusinesses(); // Refresh the list
      
      // If the deleted business was the selected one, clear it
      if (localStorage.getItem('selectedBusiness') == businessToDelete.id) {
        localStorage.removeItem('selectedBusiness');
        localStorage.removeItem('businessRole');
      }
      alert('Negocio eliminado permanentemente');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el negocio');
    }
  };

  const handleCreateGlobalUser = async (data) => {
    try {
      if (editingGlobalUser) {
        await api.put(`/global-users/${editingGlobalUser.id}`, data);
      } else {
        await api.post('/global-users', data);
      }
      await fetchGlobalUsers();
      setIsGlobalUserModalOpen(false);
      setEditingGlobalUser(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar usuario global');
    }
  };

  const handleEditGlobalUser = (user) => {
    setEditingGlobalUser(user);
    setIsGlobalUserModalOpen(true);
  };

  const handleToggleSuspendGlobalUser = async (user) => {
    const newStatus = !user.isActive;
    if (!window.confirm(`¿Estás seguro de que deseas ${newStatus ? 'activar' : 'suspender'} a ${user.fullName}?`)) return;
    try {
      await api.put(`/global-users/${user.id}`, { isActive: newStatus });
      await fetchGlobalUsers();
    } catch (err) {
      alert('Error al cambiar estado del usuario');
    }
  };

  const handleDeleteGlobalUser = async (user) => {
    if (!window.confirm(`¿Estás seguro de que deseas ELIMINAR a ${user.fullName} de todo el sistema? Esta acción no se puede deshacer y lo desvinculará de todos los negocios.`)) return;
    try {
      await api.delete(`/global-users/${user.id}`);
      await fetchGlobalUsers();
    } catch (err) {
      alert('Error al eliminar usuario');
    }
  };

  if (loading && businesses.length === 0) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando tus negocios...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header and User Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Inicio</h1>
          <p style={{ color: 'var(--text-muted)' }}>Centro de Control Global</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: '500' }}>
              <span style={{ fontSize: '1.2rem' }}>👤</span> {username}
            </div>
          )}
          <button onClick={handleLogout} className="btn" style={{ backgroundColor: '#EF4444', color: 'white', border: 'none' }}>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('businesses')}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'businesses' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'businesses' ? 'bold' : 'normal', color: activeTab === 'businesses' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Negocios
        </button>
        {(systemRole === 'ADMIN' || canManageUsers || canEditUsers || canDeleteUsers) && (
          <button 
            onClick={() => setActiveTab('global_personal')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'global_personal' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'global_personal' ? 'bold' : 'normal', color: activeTab === 'global_personal' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Personal Global
          </button>
        )}
      </div>

      {error && <p className="text-error">{error}</p>}

      {activeTab === 'businesses' && (
        <>
          {/* Action Bar for Businesses */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              {(canDeleteUsers || systemRole === 'ADMIN') && (
              <button className="btn btn-primary" onClick={openCreateModal}>
                + Crear Nuevo Negocio
              </button>
            )}
          </div>

          {businesses.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3>Aún no perteneces a ningún negocio</h3>
              {(canDeleteUsers || systemRole === 'ADMIN') ? (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Crea tu primer negocio para empezar a administrar.</p>
                  <button className="btn btn-primary" onClick={openCreateModal}>+ Crear Nuevo Negocio</button>
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Espera a ser asignado a uno.</p>
              )}
            </div>
          )}

          {businesses.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {businesses.map((b) => {
                const isLastUsed = b.id === lastUsedBusinessId;
                
                return (
                  <div key={b.id} className="card" style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '1.5rem',
                    border: isLastUsed ? '2px solid var(--primary)' : '2px solid transparent',
                    position: 'relative'
                  }}>
                    {isLastUsed && (
                      <span style={{
                        position: 'absolute', top: '-10px', right: '10px',
                        backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px'
                      }}>
                        Último utilizado
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <LogoDisplay logo={b.logo} name={b.name} size={60} />
                      <div style={{ overflow: 'hidden' }}>
                        <h3 style={{ margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{b.name}</h3>
                        {b.description && (
                          <small style={{ color: 'var(--text-muted)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {b.description}
                          </small>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
                      <p style={{ margin: 0, color: 'var(--text-main)' }}><strong>Rol:</strong> {b.role === 'CEO' ? 'Administrador' : b.role === 'GERENTE' ? 'Encargado' : b.role === 'EMPLEADO' ? 'Personal' : b.role}</p>
                      {b.role === 'CEO' && (
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => openEditModal(b)}
                          style={{ padding: '0 0.8rem', fontSize: '0.85rem', minWidth: '85px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          Editar
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1 }}
                        onClick={() => handleSelect(b)}
                      >
                        Entrar
                      </button>
                      {b.role === 'CEO' && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0 0.8rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', minWidth: '85px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => openDeleteModal(b)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {(systemRole === 'ADMIN' || canManageUsers || canEditUsers || canDeleteUsers) && activeTab === 'global_personal' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Personal Global Registrado</h2>
            {(systemRole === 'ADMIN' || canManageUsers) && (
              <button className="btn btn-primary" onClick={() => { setEditingGlobalUser(null); setIsGlobalUserModalOpen(true); }}>
                + Crear Cuenta de Usuario
              </button>
            )}
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Fecha Creación</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {globalUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No hay cuentas globales registradas</td>
                  </tr>
                ) : (
                  globalUsers.map(u => (
                    <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.6 }}>
                      <td>{u.fullName}</td>
                      <td>{u.username}</td>
                      <td>{u.email || '-'}</td>
                      <td>{u.phone || '-'}</td>
                      <td>
                        <span style={{ 
                          backgroundColor: u.isActive ? '#D1FAE5' : '#FEE2E2', 
                          color: u.isActive ? '#065F46' : '#991B1B', 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' 
                        }}>
                          {u.isActive ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleEditGlobalUser(u)}
                          disabled={
                            (u.username !== currentUsername && !canEditUsers && systemRole !== 'ADMIN') || 
                            ((u.canDeleteUsers || u.canManageUsers || u.canEditUsers) && !canDeleteUsers && systemRole !== 'ADMIN' && u.username !== currentUsername)
                          }
                          title={
                            ((u.canDeleteUsers || u.canManageUsers || u.canEditUsers) && !canDeleteUsers && systemRole !== 'ADMIN' && u.username !== currentUsername) ? "No puedes editar a un usuario con permisos delegados" :
                            ((u.username !== currentUsername && !canEditUsers && systemRole !== 'ADMIN') ? "No tienes permiso para editar a otros usuarios" : "")
                          }
                          style={{ 
                            padding: '0.5rem', 
                            backgroundColor: '#F3F4F6', 
                            border: '1px solid #D1D5DB', 
                            borderRadius: '4px', 
                            cursor: (
                              (u.username !== currentUsername && !canEditUsers && systemRole !== 'ADMIN') || 
                              ((u.canDeleteUsers || u.canManageUsers || u.canEditUsers) && !canDeleteUsers && systemRole !== 'ADMIN' && u.username !== currentUsername)
                            ) ? 'not-allowed' : 'pointer',
                            opacity: (
                              (u.username !== currentUsername && !canEditUsers && systemRole !== 'ADMIN') || 
                              ((u.canDeleteUsers || u.canManageUsers || u.canEditUsers) && !canDeleteUsers && systemRole !== 'ADMIN' && u.username !== currentUsername)
                            ) ? 0.5 : 1
                          }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleToggleSuspendGlobalUser(u)}
                          disabled={
                            u.username === currentUsername || 
                            (!canEditUsers && systemRole !== 'ADMIN') || 
                            ((u.canDeleteUsers || u.canManageUsers || u.canEditUsers) && !canDeleteUsers && systemRole !== 'ADMIN')
                          }
                          title={
                            u.username === currentUsername ? "No puedes suspender tu propia cuenta" : 
                            (((u.canDeleteUsers || u.canManageUsers || u.canEditUsers) && !canDeleteUsers && systemRole !== 'ADMIN') ? "No puedes suspender a un usuario con permisos delegados" :
                            ((!canEditUsers && systemRole !== 'ADMIN') ? "No tienes permiso para suspender usuarios" : ""))
                          }
                          style={{ 
                            padding: '0.5rem', 
                            backgroundColor: u.isActive ? '#FEF2F2' : '#ECFDF5', 
                            color: u.isActive ? '#DC2626' : '#059669', 
                            border: `1px solid ${u.isActive ? '#FCA5A5' : '#6EE7B7'}`, 
                            borderRadius: '4px', 
                            cursor: (
                              u.username === currentUsername || 
                              (!canEditUsers && systemRole !== 'ADMIN') || 
                              ((u.canDeleteUsers || u.canManageUsers || u.canEditUsers) && !canDeleteUsers && systemRole !== 'ADMIN')
                            ) ? 'not-allowed' : 'pointer',
                            opacity: (
                              u.username === currentUsername || 
                              (!canEditUsers && systemRole !== 'ADMIN') || 
                              ((u.canDeleteUsers || u.canManageUsers || u.canEditUsers) && !canDeleteUsers && systemRole !== 'ADMIN')
                            ) ? 0.5 : 1
                          }}
                        >
                          {u.isActive ? 'Suspender' : 'Activar'}
                        </button>
                        <button 
                          onClick={() => handleDeleteGlobalUser(u)}
                          disabled={u.username === currentUsername || (!canDeleteUsers && systemRole !== 'ADMIN')}
                          title={u.username === currentUsername ? "No puedes eliminar tu propia cuenta" : ((!canDeleteUsers && systemRole !== 'ADMIN') ? "No tienes permiso para borrar cuentas" : "")}
                          style={{ 
                            padding: '0.5rem', 
                            backgroundColor: '#FEF2F2', 
                            color: '#DC2626', 
                            border: '1px solid #FCA5A5', 
                            borderRadius: '4px', 
                            cursor: (u.username === currentUsername || (!canDeleteUsers && systemRole !== 'ADMIN')) ? 'not-allowed' : 'pointer',
                            opacity: (u.username === currentUsername || (!canDeleteUsers && systemRole !== 'ADMIN')) ? 0.5 : 1
                          }}
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
        </div>
      )}

      <BusinessModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingBusiness(null); }}
        onSave={handleCreateBusiness}
        initialData={editingBusiness}
      />
      
      <GlobalUserModal 
        isOpen={isGlobalUserModalOpen}
        onClose={() => { setIsGlobalUserModalOpen(false); setEditingGlobalUser(null); }}
        onSave={handleCreateGlobalUser}
        initialData={editingGlobalUser}
      />

      {isDeleteModalOpen && businessToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h2 style={{ color: 'var(--error)' }}>⚠ Eliminar Negocio</h2>
            <p>
              Estás a punto de eliminar permanentemente el negocio <strong>{businessToDelete.name}</strong>. 
              Esta acción borrará todo el inventario, ventas, gastos, personal y configuraciones vinculadas. 
              <strong>No se puede deshacer.</strong>
            </p>
            <div className="form-group">
              <label>Confirma tu contraseña para continuar:</label>
              <input 
                type="password" 
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Tu contraseña..."
                required
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" style={{ backgroundColor: 'var(--error)', borderColor: 'var(--error)', color: 'white' }} onClick={handleDeleteBusiness}>
                Sí, Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusinessSelection;
