import { useEffect, useState } from 'react';

function Sales() {
  const [activeTab, setActiveTab] = useState('registers'); // 'registers', 'history', 'pos'
  const [message, setMessage] = useState({ text: '', type: '' });

  // Data state
  const [cashRegisters, setCashRegisters] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  // POS State
  const [activeRegister, setActiveRegister] = useState(null);
  const [cart, setCart] = useState([]);
  
  // Modal State
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

  // Active Assignment for EMPLEADO
  const [activeAssignment, setActiveAssignment] = useState(null);

  const currentUsername = localStorage.getItem('username');
  const business = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
  const businessRole = business.role || 'EMPLEADO';

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetchCashRegisters(signal);
    fetchSalesHistory(signal);
    fetchMenuItems(signal);
    if (businessRole === 'EMPLEADO') {
      fetchActiveAssignment(signal);
    }

    return () => controller.abort();
  }, []);

  const fetchActiveAssignment = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/assignments/active`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) {
        setActiveAssignment(await res.json());
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Error al cargar asignación activa', e);
    }
  };

  const fetchCashRegisters = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sales/cash-registers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) setCashRegisters(await res.json());
    } catch (error) { 
      if (error.name !== 'AbortError') showMessage('Error al cargar cajas', 'error'); 
    }
  };

  const fetchSalesHistory = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sales`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) setSalesHistory(await res.json());
    } catch (error) { 
      if (error.name !== 'AbortError') showMessage('Error al cargar historial', 'error'); 
    }
  };

  const fetchMenuItems = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/menu`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        // Solo cargar Productos Disponibles - la caja no piensa
        setMenuItems(data.filter(item => (item.statusInfo?.status || item.status) === 'Disponible'));
      }
    } catch (error) { 
      if (error.name !== 'AbortError') showMessage('Error al cargar menú', 'error'); 
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // --- POS Logic ---
  const handleOperateRegister = (register) => {
    setActiveRegister(register);
    setCart([]);
    setActiveTab('pos');
  };

  const handleAddToCart = (menuItem) => {
    const existingIndex = cart.findIndex(item => item.menuItem.id === menuItem.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { menuItem, quantity: 1 }]);
    }
    showMessage('Producto agregado al carrito');
  };

  const updateCartQuantity = (menuItemId, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.menuItem.id === menuItemId) {
          const newQ = item.quantity + delta;
          return { ...item, quantity: newQ > 0 ? newQ : 1 };
        }
        return item;
      });
    });
  };

  const removeFromCart = (menuItemId) => {
    setCart(cart.filter(item => item.menuItem.id !== menuItemId));
    showMessage('Producto eliminado del carrito');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.menuItem.price) * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      showMessage('No existen productos en el carrito', 'error');
      return;
    }

    const itemsPayload = cart.map(item => ({
      menuItemId: item.menuItem.id,
      quantity: item.quantity
    }));

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sales`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          cashRegisterId: activeRegister.id,
          items: itemsPayload
        })
      });

      if (res.ok) {
        showMessage('Venta registrada correctamente');
        setCart([]);
        fetchSalesHistory(); // Refrescar historial
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al procesar la venta', 'error');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    }
  };

  // --- Sale Details Logic ---
  const handleOpenSaleDetails = async (saleId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sales/${saleId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSaleDetails(data);
        setSelectedSaleId(saleId);
      } else {
        showMessage('Error al obtener detalles de la venta', 'error');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    }
  };

  // --- Renderers ---
  const filteredRegisters = cashRegisters.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredMenu = menuItems.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredHistory = salesHistory.filter(s => 
    (s.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) || s.userNameSnapshot?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (s.cashRegister?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.cashRegisterNameSnapshot?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    s.id.toString().includes(searchTerm));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Gestión de Ventas</h1>
          <p style={{ color: 'var(--text-muted)' }}>Opera las cajas y revisa el historial</p>
        </div>
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

      {/* Tabs */}
      {activeTab !== 'pos' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
          <button 
            onClick={() => { setActiveTab('registers'); setSearchTerm(''); }}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'registers' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'registers' ? 'bold' : 'normal', color: activeTab === 'registers' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >Cajas</button>
          <button 
            onClick={() => { setActiveTab('history'); setSearchTerm(''); }}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'history' ? 'bold' : 'normal', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >Historial de Ventas</button>
        </div>
      )}

      {/* Tab: Cajas */}
      {activeTab === 'registers' && (
        <div>
          <input 
            type="text" 
            placeholder="Buscar caja..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
          />
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Nombre de Caja</th><th>Empleado Asignado</th><th style={{ textAlign: 'right' }}>Acción</th></tr>
              </thead>
              <tbody>
                {filteredRegisters.map(item => {
                  const isEmpleado = businessRole === 'EMPLEADO';
                  const isAssignedToThis = activeAssignment && activeAssignment.cashRegisterId === item.id;
                  const canOperate = !isEmpleado || isAssignedToThis;
                  
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>{item.assignedUser ? `${item.assignedUser.fullName} (@${item.assignedUser.username})` : <span style={{ color: 'var(--text-muted)' }}>Sin asignación</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        {canOperate ? (
                          <button 
                            style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} 
                            onClick={() => handleOperateRegister(item)}
                          >
                            Operar
                          </button>
                        ) : (
                          <span style={{ color: 'var(--error)', fontSize: '0.85rem' }}>Fuera de turno</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredRegisters.length === 0 && <tr><td colSpan="3" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No hay cajas disponibles.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: POS */}
      {activeTab === 'pos' && activeRegister && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Punto de Venta: {activeRegister.name}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Operando como: @{currentUsername}</p>
            </div>
            <button 
              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} 
              onClick={() => { setActiveTab('registers'); setCart([]); }}
            >
              Cerrar Caja
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            {/* Izquierda: Menú */}
            <div>
              <input 
                type="text" 
                placeholder="Buscar producto del menú..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {filteredMenu.map(item => (
                  <div key={item.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl?.startsWith('http') ? item.imageUrl : `${import.meta.env.VITE_BACKEND_URL || ''}${item.imageUrl}`} alt={item.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '120px', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>📸</span>
                      </div>
                    )}
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0' }}>{item.name}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold' }}>Bs. {Number(item.price).toFixed(2)}</p>
                          {item.type === 'REVENTA' && item.linkedProduct && (
                            <span style={{ fontSize: '0.8rem', color: Number(item.linkedProduct.currentStock) > 0 ? 'var(--success)' : 'var(--error)' }}>
                              Stock: {item.linkedProduct.currentStock}
                            </span>
                          )}
                          {item.type === 'PREPARADO' && item.statusInfo?.maxAvailablePlates !== undefined && (
                            <span style={{ fontSize: '0.8rem', color: item.statusInfo.maxAvailablePlates > 0 ? 'var(--success)' : 'var(--error)' }}>
                              Disponibles: {item.statusInfo.maxAvailablePlates}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        style={{ padding: '0.5rem 1rem', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', width: '100%' }} 
                        onClick={() => handleAddToCart(item)}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                ))}
                {filteredMenu.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No se encontraron Productos del Menú.</div>}
              </div>
            </div>

            {/* Derecha: Carrito */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0 }}>Carrito ({cartItemCount})</h3>
              </div>
              <div style={{ padding: '1rem', flexGrow: 1, overflowY: 'auto', maxHeight: '400px' }}>
                {cart.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>El carrito está vacío</p>
                ) : (
                  cart.map(item => (
                    <div key={item.menuItem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.menuItem?.name || item.menuItemNameSnapshot || 'Plato Eliminado'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bs. {Number(item.menuItem.price).toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button style={{ padding: '0.2rem 0.6rem', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => updateCartQuantity(item.menuItem.id, -1)}>-</button>
                        <span>{item.quantity}</span>
                        <button style={{ padding: '0.2rem 0.6rem', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => updateCartQuantity(item.menuItem.id, 1)}>+</button>
                        <button style={{ padding: '0.2rem 0.6rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', marginLeft: '0.5rem' }} onClick={() => removeFromCart(item.menuItem.id)}>Quitar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--primary)' }}>Bs. {cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', backgroundColor: cart.length === 0 ? '#F3F4F6' : '#F0FDF4', color: cart.length === 0 ? '#9CA3AF' : '#16A34A', border: `1px solid ${cart.length === 0 ? '#E5E7EB' : '#BBF7D0'}`, borderRadius: '6px', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }} 
                  onClick={handleConfirmSale} 
                  disabled={cart.length === 0}
                >
                  Confirmar Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === 'history' && (
        <div>
          <input 
            type="text" 
            placeholder="Buscar venta (Usuario, Caja, ID)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
          />
          <div className="table-container">
            <table>
              <thead>
                <tr><th>ID Venta</th><th>Fecha</th><th>Caja</th><th>Usuario</th><th>Cant. Productos</th><th>Total</th><th style={{ textAlign: 'right' }}>Acción</th></tr>
              </thead>
              <tbody>
                {filteredHistory.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>#{item.id}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                    <td>{item.cashRegister?.name || item.cashRegisterNameSnapshot || 'Eliminada'}</td>
                    <td>{item.user ? `@${item.user.username}` : (item.userNameSnapshot || 'Eliminado')}</td>
                    <td>{item._count.items}</td>
                    <td style={{ fontWeight: 500, color: 'var(--primary)' }}>Bs. {Number(item.total).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button 
                        style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} 
                        onClick={() => handleOpenSaleDetails(item.id)}
                      >
                        Ver Detalles
                      </button>
                      {businessRole === 'CEO' && (
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderColor: 'var(--error)', color: 'var(--error)' }} 
                          onClick={async () => {
                            if (window.confirm("¿Estás seguro de limpiar esta venta? Este cambio no se puede deshacer")) {
                              try {
                                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sales/${item.id}`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                });
                                if (res.ok) {
                                  showMessage('Venta limpiada exitosamente', 'success');
                                  fetchSalesHistory();
                                } else {
                                  const data = await res.json();
                                  showMessage(data.message || 'Error al limpiar venta', 'error');
                                }
                              } catch (error) {
                                showMessage('Error de conexión', 'error');
                              }
                            }
                          }}
                        >
                          Limpiar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && <tr><td colSpan="7" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No hay ventas registradas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detalles Venta */}
      {selectedSaleId && saleDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Detalle de Venta #{saleDetails.id}</h2>
              <button onClick={() => setSelectedSaleId(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Fecha y Hora</p>
                <p style={{ margin: 0, fontWeight: 500 }}>{new Date(saleDetails.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Caja Operada</p>
                <p style={{ margin: 0, fontWeight: 500 }}>{saleDetails.cashRegister?.name || saleDetails.cashRegisterNameSnapshot || 'Caja Eliminada'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Vendedor</p>
                <p style={{ margin: 0, fontWeight: 500 }}>
                  {saleDetails.user ? `${saleDetails.user.fullName} (@${saleDetails.user.username})` : (saleDetails.userNameSnapshot || 'Usuario Eliminado')}
                </p>
              </div>
            </div>

            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Productos Vendidos</h3>
            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>P. Unitario</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {saleDetails.items.map(si => (
                    <tr key={si.id}>
                      <td>{si.menuItem?.name || si.menuItemNameSnapshot || 'Plato Eliminado'}</td>
                      <td>{si.quantity}</td>
                      <td>Bs. {Number(si.unitPrice).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>Bs. {Number(si.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '1.2rem', marginRight: '1rem' }}>Total Final:</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>Bs. {Number(saleDetails.total).toFixed(2)}</span>
            </div>
            
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn" onClick={() => setSelectedSaleId(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Sales;
