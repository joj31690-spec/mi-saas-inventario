import { useEffect, useState } from 'react';
import ImageUploader from '../components/ImageUploader';

function Inventory() {
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'purchases'
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  
  const business = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
  const businessRole = business.role || 'EMPLEADO';

  // Persistent Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterCategory, setFilterCategory] = useState('TODOS');
  const [sortOrder, setSortOrder] = useState('NAME_ASC');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null); // Producto seleccionado para movimiento de stock
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [detailsTab, setDetailsTab] = useState('INFO');
  const [productAdjustments, setProductAdjustments] = useState([]);
  
  const [message, setMessage] = useState({ text: '', type: '' });
  const [deactivationWarning, setDeactivationWarning] = useState(null); // { product, impact }
  const [imageFile, setImageFile] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'INSUMO',
    unit: 'Unidad',
    minimumStock: 0
  });

  // Stock Form state
  const [stockTab, setStockTab] = useState('ENTRY'); // 'ENTRY' o 'ADJUSTMENT'
  const [stockForm, setStockForm] = useState({
    quantity: '',
    cost: '',
    reason: '',
    supplier: '',
    newStock: '' // Para ajuste
  });

  const validUnits = ['Unidad', 'Kg', 'Gramos', 'Litros', 'Mililitros'];

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetchProducts(signal);
    fetchCategories(signal);
    if (businessRole !== 'EMPLEADO') {
      fetchPurchases(signal);
    }

    return () => controller.abort();
  }, [businessRole]);

  const fetchPurchases = async (signal) => {
    setLoadingPurchases(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/inventory-movements`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error al cargar compras:', error);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const fetchProducts = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      if (error.name !== 'AbortError') showMessage('Error al cargar productos', 'error');
    }
  };

  const fetchCategories = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/categories`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      if (error.name !== 'AbortError') showMessage('Error al cargar categorías', 'error');
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const getStatusBadge = (product) => {
    const title = `Stock actual: ${product.currentStock}\nStock mínimo: ${product.minimumStock}`;
    if (product.statusCode === 'INACTIVE') {
      return <span className="badge" style={{ backgroundColor: '#6b7280', color: 'white' }} title={title}>No disponible</span>;
    }
    if (product.statusCode === 'OUT_OF_STOCK') {
      return <span className="badge badge-error" title={title}>Agotado</span>;
    }
    if (product.statusCode === 'LOW_STOCK') {
      return <span className="badge badge-warning" title={title}>Stock bajo</span>;
    }
    return <span className="badge badge-success" title={title}>Disponible</span>;
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category,
        unit: product.unit,
        minimumStock: product.minimumStock
      });
      setImageFile(null); // Reset file
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: 'INSUMO',
        unit: 'Unidad',
        minimumStock: 0
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setImageFile(null);
  };

  const handleOpenDetails = async (product) => {
    setDetailsProduct(product);
    setDetailsTab('INFO');
    setIsDetailsModalOpen(true);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/inventory-movements?productId=${product.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProductAdjustments(data);
      }
    } catch(e) {
      console.error('Error fetching movements', e);
    }
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setDetailsProduct(null);
    setProductAdjustments([]);
  };

  const handleOpenStockModal = (product) => {
    setStockProduct(product);
    setStockTab('ENTRY');
    setStockForm({
      quantity: '',
      cost: '',
      reason: '',
      supplier: '',
      newStock: product.currentStock
    });
    setIsStockModalOpen(true);
  };

  const closeStockModal = () => {
    setIsStockModalOpen(false);
    setStockProduct(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto de forma permanente?')) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          showMessage('Producto eliminado correctamente');
          fetchProducts();
        } else {
          const err = await res.json();
          showMessage(err.message || 'Error al eliminar producto', 'error');
        }
      } catch (error) {
        showMessage('Error de red', 'error');
      }
    }
  };

  const handleToggleActive = async (product) => {
    if (!product.isActive) {
      await applyToggleActive(product, true);
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${product.id}/deactivation-impact`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const impact = await res.json();
        if (impact.count > 0) {
          setDeactivationWarning({ product, impact });
        } else {
          await applyToggleActive(product, false);
        }
      }
    } catch (error) {
      showMessage('Error al verificar impacto', 'error');
    }
  };

  const applyToggleActive = async (product, newIsActive) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...product, isActive: newIsActive })
      });
      if (res.ok) {
        showMessage(`Producto ${newIsActive ? 'activado' : 'desactivado'} correctamente`);
        fetchProducts();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al actualizar', 'error');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    }
    setDeactivationWarning(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingProduct;
    const url = isEditing 
      ? `${import.meta.env.VITE_API_BASE_URL}/products/${editingProduct.id}` 
      : `${import.meta.env.VITE_API_BASE_URL}/products`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const formPayload = new FormData();
      Object.keys(formData).forEach(key => formPayload.append(key, formData[key]));
      if (imageFile === 'REMOVE') {
        formPayload.append('removeImage', 'true');
      } else if (imageFile) {
        formPayload.append('image', imageFile);
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: formPayload
      });
      
      if (res.ok) {
        showMessage(`Producto ${isEditing ? 'actualizado' : 'creado'} correctamente`);
        closeModal();
        fetchProducts();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al guardar', 'error');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    }
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    
    const url = stockTab === 'ENTRY' 
      ? `${import.meta.env.VITE_API_BASE_URL}/products/${stockProduct.id}/stock/entry`
      : `${import.meta.env.VITE_API_BASE_URL}/products/${stockProduct.id}/stock/adjustment`;

    let payload = {};
    if (stockTab === 'ENTRY') {
      payload = {
        quantity: stockForm.quantity,
        cost: stockForm.cost,
        reason: stockForm.reason,
        supplier: stockForm.supplier
      };
    } else {
      payload = {
        newStock: stockForm.newStock,
        reason: stockForm.reason
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showMessage(`Stock actualizado correctamente`);
        closeStockModal();
        fetchProducts();
        fetchPurchases();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al actualizar stock', 'error');
      }
    } catch (error) {
      showMessage('Error de conexión', 'error');
    }
  };

  const removeAccents = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const filteredProducts = products.filter(p => {
    const s = removeAccents(searchTerm.toLowerCase());
    const matchesSearch = removeAccents(p.name.toLowerCase()).includes(s) ||
                          removeAccents((p.description || '').toLowerCase()).includes(s) ||
                          removeAccents(p.category.toLowerCase()).includes(s);
    
    const matchesStatus = filterStatus === 'TODOS' || p.statusCode === filterStatus;
    const matchesCategory = filterCategory === 'TODOS' || p.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  filteredProducts.sort((a, b) => {
    if (sortOrder === 'NAME_ASC') return a.name.localeCompare(b.name);
    if (sortOrder === 'NAME_DESC') return b.name.localeCompare(a.name);
    if (sortOrder === 'NEWEST') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortOrder === 'OLDEST') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortOrder === 'HIGH_STOCK') return Number(b.currentStock) - Number(a.currentStock);
    if (sortOrder === 'LOW_STOCK') return Number(a.currentStock) - Number(b.currentStock);
    return 0;
  });

  const totalDisponibles = products.filter(p => p.statusCode === 'AVAILABLE').length;
  const totalBajo = products.filter(p => p.statusCode === 'LOW_STOCK').length;
  const totalAgotados = products.filter(p => p.statusCode === 'OUT_OF_STOCK').length;

  const totalInvested = purchases.reduce((sum, p) => sum + Number(p.cost || 0), 0);
  const totalPurchases = purchases.length;
  const lastPurchaseDate = purchases.length > 0 
    ? new Date(purchases[0].createdAt).toLocaleString() 
    : 'No hay compras';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Inventario</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona los productos y su historial</p>
        </div>
        {activeTab === 'products' && businessRole !== 'EMPLEADO' && (
          <button className="btn" onClick={() => handleOpenModal()}>+ Nuevo Producto</button>
        )}
      </div>

      {/* Tabs */}
      {businessRole !== 'EMPLEADO' && (
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
          <button 
            onClick={() => setActiveTab('products')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'products' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'products' ? 'bold' : 'normal', color: activeTab === 'products' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >Productos y Stock</button>
          <button 
            onClick={() => setActiveTab('purchases')}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'purchases' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'purchases' ? 'bold' : 'normal', color: activeTab === 'purchases' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          >Historial de Compras</button>
        </div>
      )}

      {message.text && (
        <div style={{ 
          padding: '1rem', marginBottom: '1rem', borderRadius: '6px',
          backgroundColor: message.type === 'error' ? 'var(--error)' : 'var(--success)',
          color: 'white', textAlign: 'center'
        }}>
          {message.text}
        </div>
      )}



      {/* Tab: Productos y Stock */}
      {activeTab === 'products' && (
      <>
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="dashboard-card">
            <h3>Total Productos</h3>
            <p className="number">{products.length}</p>
          </div>
          <div className="dashboard-card">
            <h3>Disponibles</h3>
            <p className="number" style={{ color: 'var(--success)' }}>{totalDisponibles}</p>
          </div>
          <div className="dashboard-card">
            <h3>Stock Bajo</h3>
            <p className="number" style={{ color: 'var(--warning)' }}>{totalBajo}</p>
          </div>
          <div className="dashboard-card">
            <h3>Agotados</h3>
            <p className="number" style={{ color: 'var(--error)' }}>{totalAgotados}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: '1', minWidth: '200px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
          />
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="AVAILABLE">Disponibles</option>
            <option value="LOW_STOCK">Stock bajo</option>
            <option value="OUT_OF_STOCK">Agotados</option>
            <option value="INACTIVE">No disponibles</option>
          </select>
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
          >
            <option value="TODOS">Todas las categorías</option>
            <option value="INSUMO">Insumos</option>
            <option value="REVENTA">Reventa</option>
          </select>
          <select 
            value={sortOrder} 
            onChange={e => setSortOrder(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
          >
            <option value="NAME_ASC">Nombre (A → Z)</option>
            <option value="NAME_DESC">Nombre (Z → A)</option>
            <option value="NEWEST">Más reciente</option>
            <option value="OLDEST">Más antiguo</option>
            <option value="HIGH_STOCK">Mayor stock</option>
            <option value="LOW_STOCK">Menor stock</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Imagen</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Medida</th>
                <th>Stock</th>
                <th>Estado</th>
                {businessRole !== 'EMPLEADO' && <th style={{ textAlign: 'right' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)'
                      }}>
                        {product.imageUrl ? (
                          <img src={`${import.meta.env.VITE_BACKEND_URL}${product.imageUrl}`} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>📸</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{product.name}</div>
                    </td>
                    <td>{product.category}</td>
                    <td>{product.unit}</td>
                    <td style={{ 
                      fontWeight: 'bold', 
                      color: product.statusCode === 'OUT_OF_STOCK' ? 'var(--error)' : product.statusCode === 'LOW_STOCK' ? 'var(--warning)' : 'inherit'
                    }}>
                      {Number(product.currentStock)} / {Number(product.minimumStock)}
                    </td>
                    <td>{getStatusBadge(product)}</td>
                    {businessRole !== 'EMPLEADO' && (
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleOpenDetails(product)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Detalles
                        </button>
                        <button 
                          onClick={() => handleOpenStockModal(product)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Stock
                        </button>
                        <button 
                          onClick={() => handleOpenModal(product)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleToggleActive(product)}
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            fontSize: '0.85rem',
                            backgroundColor: product.isActive ? '#FFF7ED' : '#F0FDF4', 
                            color: product.isActive ? '#EA580C' : '#16A34A', 
                            border: `1px solid ${product.isActive ? '#FED7AA' : '#BBF7D0'}`,
                            borderRadius: '4px', 
                            cursor: 'pointer'
                          }}
                        >
                          {product.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        {businessRole === 'CEO' && (
                          <button 
                            onClick={() => handleDelete(product.id)}
                            style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                    No se encontraron productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
      )}



      {/* Tab: Historial de Compras */}
      {activeTab === 'purchases' && businessRole !== 'EMPLEADO' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="dashboard-card">
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Compras Registradas</h3>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{totalPurchases}</div>
            </div>
            <div className="dashboard-card">
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Última Compra</h3>
              <div style={{ fontSize: '1.1rem', fontWeight: '500', marginTop: '0.5rem' }}>{lastPurchaseDate}</div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Costo Total</th>
                  <th>Proveedor</th>
                  <th>Registrado por</th>
                  {businessRole !== 'EMPLEADO' && <th style={{ textAlign: 'right' }}>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {loadingPurchases ? (
                  <tr>
                    <td colSpan={businessRole !== 'EMPLEADO' ? "7" : "6"} className="text-center" style={{ padding: '2rem' }}>Cargando...</td>
                  </tr>
                ) : purchases.length > 0 ? (
                  purchases.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.createdAt).toLocaleString()}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.product?.name || p.productNameSnapshot || 'Producto Eliminado'}</div>
                      </td>
                      <td>{p.quantity} {p.product?.unit || ''}</td>
                      <td style={{ fontWeight: 'bold' }}>
                        {p.cost !== null ? `Bs ${Number(p.cost).toFixed(2)}` : '-'}
                      </td>
                      <td>{p.supplier || '-'}</td>
                      <td>{p.user?.fullName || p.userNameSnapshot || '-'}</td>
                      {businessRole !== 'EMPLEADO' && (
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--error)', color: 'var(--error)' }} 
                            onClick={async () => {
                              if (window.confirm("¿Estás seguro de limpiar esta compra? Este cambio no se puede deshacer")) {
                                try {
                                  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/inventory-movements/${p.id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                  });
                                  if (res.ok) {
                                    showMessage('Compra limpiada exitosamente', 'success');
                                    fetchPurchases(); // Recargar historial
                                    fetchProducts(); // Recargar productos para actualizar stock
                                  } else {
                                    const data = await res.json();
                                    showMessage(data.message || 'Error al limpiar compra', 'error');
                                  }
                                } catch (error) {
                                  showMessage('Error de conexión', 'error');
                                }
                              }
                            }}
                          >
                            Limpiar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={businessRole !== 'EMPLEADO' ? "7" : "6"} className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                      No se han registrado compras.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL NUEVO/EDITAR PRODUCTO */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <ImageUploader 
                initialImage={editingProduct?.imageUrl}
                onImageChange={(file) => setImageFile(file)}
              />
              <div className="form-group">
                <label>Nombre</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Categoría</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="INSUMO">Insumo</option>
                    <option value="REVENTA">Reventa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Unidad de Medida</label>
                  <select required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                    {validUnits.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Stock Mínimo</label>
                  <input type="number" step="0.01" required value={formData.minimumStock} onChange={e => setFormData({...formData, minimumStock: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Descripción (Opcional)</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE STOCK */}
      {isStockModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Stock: {stockProduct?.name}</h2>
              <button onClick={closeStockModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            {/* Tabs for Stock */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => setStockTab('ENTRY')}
                style={{ background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: stockTab === 'ENTRY' ? 'bold' : 'normal', color: stockTab === 'ENTRY' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
              >Entrada</button>
              <button 
                type="button"
                onClick={() => setStockTab('ADJUSTMENT')}
                style={{ background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: stockTab === 'ADJUSTMENT' ? 'bold' : 'normal', color: stockTab === 'ADJUSTMENT' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
              >Ajuste</button>
            </div>

            <form onSubmit={handleStockSubmit}>
              {stockTab === 'ENTRY' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Cantidad ({stockProduct?.unit}) *</label>
                      <input type="number" step="0.01" min="0.01" required value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Costo total (Bs) *</label>
                      <input type="number" step="0.01" min="0" required value={stockForm.cost} onChange={e => setStockForm({...stockForm, cost: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Proveedor (Opcional)</label>
                    <input type="text" value={stockForm.supplier} onChange={e => setStockForm({...stockForm, supplier: e.target.value})} placeholder="Ej. Mercado Central, Proveedor Juan..." />
                  </div>
                  <div className="form-group">
                    <label>Observación (Opcional)</label>
                    <textarea 
                      value={stockForm.reason} 
                      onChange={e => setStockForm({...stockForm, reason: e.target.value})} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stock actual</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{Number(stockProduct?.currentStock)} {stockProduct?.unit}</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nuevo stock real ({stockProduct?.unit}) *</label>
                      <input type="number" step="0.01" min="0" required value={stockForm.newStock} onChange={e => setStockForm({...stockForm, newStock: e.target.value})} style={{ height: 'calc(100% - 24px)' }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Motivo *</label>
                    <textarea 
                      required 
                      value={stockForm.reason} 
                      onChange={e => setStockForm({...stockForm, reason: e.target.value})} 
                      placeholder="Ej. Inventario físico, Merma..." 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit' }}
                    />
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeStockModal}>Cancelar</button>
                <button type="submit" className="btn">{stockTab === 'ENTRY' ? 'Agregar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Producto */}
      {isDetailsModalOpen && detailsProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="modal-header">
              <h2>Detalles: {detailsProduct.name}</h2>
              <button onClick={closeDetailsModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <button 
                onClick={() => setDetailsTab('INFO')}
                style={{ padding: '0.5rem', background: 'none', border: 'none', borderBottom: detailsTab === 'INFO' ? '2px solid var(--primary)' : 'none', fontWeight: detailsTab === 'INFO' ? 'bold' : 'normal', color: detailsTab === 'INFO' ? 'var(--primary)' : 'inherit', cursor: 'pointer' }}
              >
                Información
              </button>
              <button 
                onClick={() => setDetailsTab('ADJUSTMENTS')}
                style={{ padding: '0.5rem', background: 'none', border: 'none', borderBottom: detailsTab === 'ADJUSTMENTS' ? '2px solid var(--primary)' : 'none', fontWeight: detailsTab === 'ADJUSTMENTS' ? 'bold' : 'normal', color: detailsTab === 'ADJUSTMENTS' ? 'var(--primary)' : 'inherit', cursor: 'pointer' }}
              >
                Ajustes de Stock
              </button>
            </div>

            {detailsTab === 'INFO' && (
              <div style={{ minHeight: '150px' }}>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Descripción General</h4>
                <p>{detailsProduct.description || <span style={{ color: 'var(--text-muted)' }}>Sin descripción registrada.</span>}</p>
                
                {productAdjustments && productAdjustments.length > 0 && (() => {
                  const lastPurchase = productAdjustments.find(a => a.type === 'ENTRY' && a.supplier);
                  if (lastPurchase) {
                    return (
                      <div style={{ marginTop: '1.5rem' }}>
                        <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Último Proveedor</h4>
                        <p>{lastPurchase.supplier}</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {detailsTab === 'ADJUSTMENTS' && (
              <div style={{ minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                {productAdjustments && productAdjustments.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Fecha</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Tipo</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Cant.</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Motivo/Obs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productAdjustments.map(adj => (
                        <tr key={adj.id}>
                          <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--bg-secondary)' }}>{new Date(adj.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--bg-secondary)' }}>
                            {adj.type === 'ENTRY' ? <span style={{ color: 'var(--success)' }}>Entrada</span> :
                             adj.type === 'CONSUMPTION' ? <span style={{ color: 'var(--error)' }}>Consumo</span> :
                             <span style={{ color: 'var(--warning)' }}>Ajuste</span>}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--bg-secondary)' }}>
                            {adj.type === 'ENTRY' ? '+' : '-'}{adj.quantity}
                          </td>
                          <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--bg-secondary)', color: 'var(--text-muted)' }}>
                            {adj.reason || adj.supplier || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No hay historial de movimientos.</p>
                )}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={closeDetailsModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de advertencia de cascada al desactivar */}
      {deactivationWarning && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, color: '#f59e0b' }}>⚠️ Atención</h2>
              <button onClick={() => setDeactivationWarning(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <p>Desactivar <strong>«{deactivationWarning.product.name}»</strong> afectará a los siguientes Productos del Menú que lo usan en sus recetas:</p>
              <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                {deactivationWarning.impact.menuItems.map(mi => (
                  <li key={mi.id} style={{ marginBottom: '0.25rem' }}>
                    <strong>{mi.name}</strong> <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>(Disponible → No disponible)</span>
                  </li>
                ))}
              </ul>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Estos productos dejarán de aparecer en el Punto de Venta automáticamente.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeactivationWarning(null)}>Cancelar</button>
              <button
                className="btn"
                style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
                onClick={() => applyToggleActive(deactivationWarning.product, false)}
              >
                Entendido, desactivar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
