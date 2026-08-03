import { useEffect, useState } from 'react';

function Users() {
  const [users, setUsers] = useState([]);
  const [globalUsers, setGlobalUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentUsername = localStorage.getItem('username');
  const canDeleteUsers = localStorage.getItem('canDeleteUsers') === 'true';
  const systemRole = localStorage.getItem('systemRole');
  const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
  const localUserRole = selectedBusiness.role;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    fullName: '',
    username: '',
    password: '',
    phone: '',
    email: '',
    roleId: '',
    isActive: true
  });

  const [salaryFormData, setSalaryFormData] = useState({
    contractType: 'Mensual',
    baseSalary: '',
    nextPaymentDate: ''
  });

  useEffect(() => {
    fetchRoles();
    fetchUsers();
    fetchGlobalUsers();
  }, []);

  const fetchGlobalUsers = async () => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/global-users`);
      if (res.ok) {
        setGlobalUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const apiCall = async (url, method = 'GET', body = null) => {
    return await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: body ? JSON.stringify(body) : undefined
    });
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/roles`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, roleId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      showMessage('Error al cargar usuarios', 'error');
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        userId: user.id,
        fullName: user.fullName,
        username: user.username,
        password: '', // Vacio intencionalmente, opcional en edicion
        phone: user.phone || '',
        email: user.email || '',
        roleId: user.role || (roles.length > 0 ? roles[0].id : ''),
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({
        userId: '',
        fullName: '',
        username: '',
        password: '',
        phone: '',
        email: '',
        roleId: roles.length > 0 ? roles[0].id : '',
        isActive: true
      });
    }
    setIsModalOpen(true);
    setShowPassword(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingUser;
    
    const url = isEditing 
      ? `${import.meta.env.VITE_API_BASE_URL}/users/${editingUser.id}` 
      : `${import.meta.env.VITE_API_BASE_URL}/users`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const payload = isEditing 
        ? { ...formData, role: formData.roleId } 
        : { userId: formData.userId, role: formData.roleId };

      const res = await apiCall(url, method, payload);
      
      if (res.ok) {
        showMessage(`Usuario ${isEditing ? 'actualizado' : 'vinculado'} correctamente`);
        closeModal();
        fetchUsers();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al guardar', 'error');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    }
  };

  const handleUnlink = async (user) => {
    if (!window.confirm(`¿Estás seguro de que deseas desvincular a ${user.fullName} de este local? Su cuenta global no se eliminará.`)) return;
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/users/${user.id}`, 'DELETE');
      if (res.ok) {
        showMessage('Usuario desvinculado exitosamente');
        fetchUsers();
      } else {
        showMessage('Error al desvincular', 'error');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    }
  };
  const handleOpenSalaryModal = (user) => {
    setEditingUser(user);
    setSalaryFormData({
      contractType: user.contractType || 'Mensual',
      baseSalary: user.baseSalary || '',
      nextPaymentDate: user.nextPaymentDate ? user.nextPaymentDate.split('T')[0] : '',
      paymentMode: user.paymentMode || 'AUTOMATIC'
    });
    setIsSalaryModalOpen(true);
  };

  const closeSalaryModal = () => {
    setIsSalaryModalOpen(false);
    setEditingUser(null);
  };

  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...salaryFormData };
      if (payload.contractType === 'Sueldo Unificado / Rotativo') {
        payload.baseSalary = 0;
      }
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/users/${editingUser.id}/salary`, 'PUT', payload);
      if (res.ok) {
        showMessage('Salario configurado correctamente');
        closeSalaryModal();
        fetchUsers();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al guardar', 'error');
      }
    } catch (e) {
      showMessage('Error de conexión', 'error');
    }
  };

  const handleClearSalary = async () => {
    if(!window.confirm("¿Estás seguro de que quieres borrar el salario de este usuario?")) return;
    try {
      const payload = { contractType: null, baseSalary: null, nextPaymentDate: null, paymentMode: 'AUTOMATIC' };
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/users/${editingUser.id}/salary`, 'PUT', payload);
      if (res.ok) {
        showMessage('Salario borrado');
        closeSalaryModal();
        fetchUsers();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al borrar', 'error');
      }
    } catch(e) {
      showMessage('Error de red', 'error');
    }
  };

  const handlePayManualSalary = async (userId) => {
    if (!window.confirm('¿Confirmas que se ha realizado el pago de este salario? Esto registrará un gasto en el sistema y actualizará la próxima fecha de pago.')) return;
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}/pay-salary`, 'POST');
      if (res.ok) {
        showMessage('Pago manual registrado y fecha actualizada');
        fetchUsers();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al registrar pago', 'error');
      }
    } catch (e) {
      showMessage('Error de conexión', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Gestión de Usuarios Locales</h1>
          <p style={{ color: 'var(--text-muted)' }}>Administra el acceso de los empleados a este local</p>
        </div>
        <button className="btn" onClick={() => handleOpenModal()} style={{ display: activeTab === 'personal' ? 'block' : 'none' }}>+ Vincular Usuario</button>
      </div>

      {message.text && (
        <div style={{ 
          padding: '1rem', marginBottom: '1rem', borderRadius: '6px',
          backgroundColor: message.type === 'error' ? 'var(--error)' : 'var(--success)',
          color: 'white', textAlign: 'center'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button 
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'personal' ? '2px solid var(--primary)' : 'none', color: activeTab === 'personal' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'personal' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1.2rem' }}
          onClick={() => setActiveTab('personal')}
        >
          Personal
        </button>
        {localUserRole === 'CEO' && (
          <button 
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'salarios' ? '2px solid var(--primary)' : 'none', color: activeTab === 'salarios' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'salarios' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '1.2rem' }}
            onClick={() => setActiveTab('salarios')}
          >
            Salarios
          </button>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre completo o usuario..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
        />
      </div>

      <div className="table-container">
        {activeTab === 'personal' && (
        <table>
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => {
                const isTargetSupremeAdmin = user.systemRole === 'ADMIN';
                const isTargetOriginalCEO = user.canDeleteUsers;
                const isTargetLocalAdmin = user.role === 'CEO';
                
                const disableEdit = 
                  user.username === currentUsername ||
                  isTargetSupremeAdmin || 
                  (isTargetOriginalCEO && !canDeleteUsers && systemRole !== 'ADMIN') ||
                  (!canDeleteUsers && systemRole !== 'ADMIN' && localUserRole !== 'CEO') ||
                  (!canDeleteUsers && systemRole !== 'ADMIN' && localUserRole === 'CEO' && isTargetLocalAdmin);

                const disableDesvincular = 
                  user.username === currentUsername || 
                  isTargetSupremeAdmin || 
                  (isTargetOriginalCEO && !canDeleteUsers && systemRole !== 'ADMIN') || 
                  (!canDeleteUsers && systemRole !== 'ADMIN' && localUserRole !== 'CEO') || 
                  (!canDeleteUsers && systemRole !== 'ADMIN' && localUserRole === 'CEO' && isTargetLocalAdmin);

                return (
                <tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.6 }}>
                  <td style={{ fontWeight: 500 }}>{user.fullName}</td>
                  <td>{user.username}</td>
                  <td>
                    {user.role === 'CEO' ? 'Administrador' : 
                     user.role === 'GERENTE' ? 'Encargado' : 
                     user.role === 'EMPLEADO' ? 'Personal' : user.role}
                  </td>
                  <td>
                    {user.isActive 
                      ? <span className="badge badge-success">Activo</span> 
                      : <span className="badge badge-error">Inactivo</span>
                    }
                  </td>
                  <td>{user.phone || '-'}</td>
                  <td>{user.email || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="action-btn btn-edit"
                        onClick={() => handleOpenModal(user)}
                        disabled={disableEdit}
                        title={
                          user.username === currentUsername ? "No puedes editar tu propio rol aquí" :
                          isTargetSupremeAdmin ? "No puedes editar al Admin Supremo" :
                          (isTargetOriginalCEO && !canDeleteUsers && systemRole !== 'ADMIN') ? "No puedes editar a un CEO Original" : 
                          (!canDeleteUsers && systemRole !== 'ADMIN' && localUserRole !== 'CEO') ? "No tienes permisos para editar roles" :
                          (!canDeleteUsers && systemRole !== 'ADMIN' && localUserRole === 'CEO' && isTargetLocalAdmin) ? "No puedes editar a otro Administrador" : ""
                        }
                        style={{ opacity: disableEdit ? 0.5 : 1 }}
                      >
                        Editar
                      </button>
                      <button 
                        className="action-btn btn-toggle"
                        onClick={() => handleUnlink(user)}
                        disabled={disableDesvincular}
                        title={
                          user.username === currentUsername ? "No puedes desvincularte a ti mismo" :
                          isTargetSupremeAdmin ? "No puedes desvincular al Admin Supremo" :
                          (isTargetOriginalCEO && !canDeleteUsers && systemRole !== 'ADMIN') ? "No puedes desvincular a un CEO Original" : 
                          (!canDeleteUsers && systemRole !== 'ADMIN' && localUserRole !== 'CEO') ? "Solo administradores pueden desvincular" : 
                          (!canDeleteUsers && systemRole !== 'ADMIN' && localUserRole === 'CEO' && isTargetLocalAdmin) ? "No puedes desvincular a otro Administrador" : ""
                        }
                        style={{ opacity: disableDesvincular ? 0.5 : 1 }}
                      >
                        Desvincular
                      </button>
                    </div>
                  </td>
                </tr>
              )})
            ) : (
              <tr>
                <td colSpan="7" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
        {activeTab === 'salarios' && (
          <table>
            <thead>
              <tr>
                <th>Nombre Completo</th>
                <th>Usuario</th>
                <th>Tipo de Contrato</th>
                <th>Salario Base (Bs)</th>
                <th>Modo de Pago</th>
                <th>Próximo Pago</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.fullName}</td>
                    <td>{user.username}</td>
                    <td>{user.contractType || '-'}</td>
                    <td>{user.baseSalary !== null && user.baseSalary !== undefined ? `${user.baseSalary} Bs` : '-'}</td>
                    <td>
                      <span className={`badge ${user.paymentMode === 'MANUAL' ? 'badge-warning' : 'badge-success'}`}>
                        {user.paymentMode === 'MANUAL' ? 'Manual' : 'Automático'}
                      </span>
                    </td>
                    <td>{user.nextPaymentDate ? new Date(user.nextPaymentDate).toLocaleDateString() : '-'}</td>
                    <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {user.paymentMode === 'MANUAL' && (localUserRole === 'CEO' || canDeleteUsers) && user.baseSalary !== null && user.baseSalary !== undefined && (
                        <button 
                          className="action-btn btn-details"
                          onClick={() => handlePayManualSalary(user.id)}
                        >
                          Registrar Pago
                        </button>
                      )}
                      <button 
                        className="action-btn btn-edit"
                        onClick={() => handleOpenSalaryModal(user)}
                      >
                        Configurar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingUser ? 'Editar Usuario Local' : 'Vincular Usuario Global'}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              {!editingUser ? (
                <div className="form-group">
                  <label>Seleccionar Usuario Global *</label>
                  <select 
                    required 
                    value={formData.userId} 
                    onChange={e => setFormData({...formData, userId: e.target.value})}
                  >
                    <option value="">-- Seleccione un usuario --</option>
                    {globalUsers.filter(gu => !users.some(u => u.id === gu.id)).map(gu => (
                      <option key={gu.id} value={gu.id}>{gu.fullName} ({gu.username})</option>
                    ))}
                  </select>
                  {globalUsers.filter(gu => !users.some(u => u.id === gu.id)).length === 0 && (
                    <small style={{ color: 'var(--warning)' }}>No hay usuarios globales disponibles para vincular.</small>
                  )}
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                  <p style={{ margin: 0, color: '#0369a1', fontSize: '0.9rem' }}>
                    <strong>ℹ️ Aviso:</strong> Para editar los datos personales (nombre, usuario, contraseña, teléfono, correo), por favor utiliza el panel principal de <strong>Personal Global</strong> en Inicio.
                  </p>
                </div>
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Rol *</label>
                  <select required value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})}>
                    {roles.filter(r => (canDeleteUsers || systemRole === 'ADMIN') ? true : r.id !== 'CEO').map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    Nota: El rol seleccionado ('ADMINISTRADOR', 'ENCARGADO', etc.) solo tiene validez dentro de este local.
                  </small>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSalaryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Configurar Salario - {editingUser?.fullName}</h2>
              <button onClick={closeSalaryModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSalarySubmit}>
              <div className="form-group">
                <label>Tipo de Contrato *</label>
                <select 
                  required 
                  value={salaryFormData.contractType} 
                  onChange={e => setSalaryFormData({...salaryFormData, contractType: e.target.value})}
                >
                  <option value="Mensual">Mensual</option>
                  <option value="Quincenal">Quincenal</option>
                  <option value="Por Hora">Por Hora</option>
                  <option value="Por Día">Por Día</option>
                  <option value="Sueldo Unificado / Rotativo">Sueldo Unificado / Rotativo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Modo de Pago *</label>
                <select 
                  required 
                  value={salaryFormData.paymentMode} 
                  onChange={e => setSalaryFormData({...salaryFormData, paymentMode: e.target.value})}
                >
                  <option value="AUTOMATIC">Automático (Registrar gasto automáticamente)</option>
                  <option value="MANUAL">Manual (Registrar gasto manualmente)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Salario Base (Bs) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required={salaryFormData.contractType !== 'Sueldo Unificado / Rotativo'}
                  disabled={salaryFormData.contractType === 'Sueldo Unificado / Rotativo'}
                  value={salaryFormData.contractType === 'Sueldo Unificado / Rotativo' ? 0 : salaryFormData.baseSalary} 
                  onChange={e => setSalaryFormData({...salaryFormData, baseSalary: e.target.value})}
                />
                {salaryFormData.contractType === 'Sueldo Unificado / Rotativo' && (
                  <small style={{ color: 'var(--text-muted)' }}>
                    Al ser un empleado rotativo, el salario base queda en 0 para este local. Sus ingresos se calcularán mediante los turnos extra/reemplazos.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Próxima Fecha de Pago</label>
                <input 
                  type="date" 
                  value={salaryFormData.nextPaymentDate} 
                  onChange={e => setSalaryFormData({...salaryFormData, nextPaymentDate: e.target.value})}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                {editingUser?.baseSalary !== null && editingUser?.baseSalary !== undefined ? (
                  <button type="button" className="btn btn-secondary" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }} onClick={handleClearSalary}>Borrar Salario</button>
                ) : (
                  <div></div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeSalaryModal}>Cancelar</button>
                  <button type="submit" className="btn">Guardar Salario</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
