import { useEffect, useState } from 'react';
import ImageUploader from '../components/ImageUploader';

const STATUS_BADGE = {
  'Borrador':       { className: 'badge badge-warning', label: 'Borrador' },
  'Disponible':     { className: 'badge badge-success', label: 'Disponible' },
  'No disponible':  { className: 'badge badge-error', label: 'No disponible' },
};

const REASON_LABELS = {
  'complete': 'Listo para vender',
  'missing_price': 'Falta definir precio',
  'missing_recipe': 'Sin receta',
  'invalid_quantity': 'Cantidad de ingredientes inválida',
  'inactive_ingredient': 'Ingrediente inactivo',
  'out_of_stock': 'Stock agotado',
  'missing_product': 'Producto base eliminado',
  'manual': 'Desactivado manualmente'
};

function Menu() {
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'ingredients'
  
  const storedBusiness = localStorage.getItem('selectedBusiness');
  const businessRole = storedBusiness ? JSON.parse(storedBusiness).role : null;
  
  // Menu states
  const [menuItems, setMenuItems] = useState([]);
  const [searchTermMenu, setSearchTermMenu] = useState('');
  const [filterStatusMenu, setFilterStatusMenu] = useState('TODOS');
  const [filterCategoryMenu, setFilterCategoryMenu] = useState('TODOS');
  const [sortOrderMenu, setSortOrderMenu] = useState('NAME_ASC');
  
  // Ingredients states
  const [ingredients, setIngredients] = useState([]);
  const [searchTermIngredient, setSearchTermIngredient] = useState('');
  const [products, setProducts] = useState([]); // Insumos del inventario

  // Modals - Menu
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeRecipeMenu, setActiveRecipeMenu] = useState(null);
  const [recipeItems, setRecipeItems] = useState([]); // Items of a menu's recipe

  // Modals - Ingredients
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);

  // Forms
  const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '' });
  const [recipeForm, setRecipeForm] = useState({ ingredientId: '', quantity: '' });
  const [imageFileMenu, setImageFileMenu] = useState(null);
  
  // Formularios de ingredientes (manteniendo receta en estado local antes de guardar)
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    description: '',
    type: 'DIRECTO',
    linkedProductId: '',
    yieldQuantity: '',
    yieldUnit: 'Unidad',
    yieldDescription: ''
  });
  const [tempIngredientRecipe, setTempIngredientRecipe] = useState([]); // {type: 'PRODUCT'|'INGREDIENT', id, name, unit, averageCost, quantity}
  const [tempRecipeForm, setTempRecipeForm] = useState({ selectedId: '', quantity: '' });

  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetchMenuItems(signal);
    fetchProducts(signal);
    fetchIngredients(signal);

    return () => controller.abort();
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const apiCall = async (url, method, body, signal) => {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: body ? JSON.stringify(body) : undefined,
      signal
    });
    return res;
  };

  // --- FETCHERS ---
  const fetchMenuItems = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/menu`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) setMenuItems(await res.json());
    } catch (e) { if (e.name !== 'AbortError') showMessage('Error al cargar el menú', 'error'); }
  };

  const fetchIngredients = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ingredients`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) setIngredients(await res.json());
    } catch (e) { if (e.name !== 'AbortError') showMessage('Error al cargar ingredientes', 'error'); }
  };

  const fetchProducts = async (signal) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/products`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.filter(p => p.isActive && p.category === 'INSUMO'));
      }
    } catch (e) { if (e.name !== 'AbortError') console.error('Error cargando productos'); }
  };

  const fetchRecipeItems = async (menuId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/menu/${menuId}/recipe`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setRecipeItems(await res.json());
    } catch { showMessage('Error al cargar la receta', 'error'); }
  };

  // --- MENU HANDLERS ---
  const handleOpenMenuModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setMenuForm({ name: item.name, description: item.description || '', price: item.price !== null ? item.price : '' });
    } else {
      setEditingItem(null);
      setMenuForm({ name: '', description: '', price: '' });
    }
    setImageFileMenu(null);
    setIsMenuModalOpen(true);
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingItem;
    const url = isEditing ? `${import.meta.env.VITE_API_BASE_URL}/menu/${editingItem.id}` : `${import.meta.env.VITE_API_BASE_URL}/menu`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const formPayload = new FormData();
      formPayload.append('name', menuForm.name);
      formPayload.append('description', menuForm.description);
      formPayload.append('price', menuForm.price === '' ? '' : Number(menuForm.price));
      
      if (!isEditing) formPayload.append('type', 'PREPARADO');
      
      if (imageFileMenu === 'REMOVE') {
        formPayload.append('removeImage', 'true');
      } else if (imageFileMenu) {
        formPayload.append('image', imageFileMenu);
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formPayload
      });

      if (res.ok) {
        showMessage(`Producto del Menú ${isEditing ? 'actualizado' : 'creado'} correctamente`);
        setIsMenuModalOpen(false);
        fetchMenuItems();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al guardar', 'error');
      }
    } catch { showMessage('Error de conexión', 'error'); }
  };

  const handlePublish = async (item) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/menu/${item.id}/publish`, 'PATCH');
      if (res.ok) { showMessage(`"${item.name}" publicado`); fetchMenuItems(); } 
      else { const err = await res.json(); showMessage(err.message, 'error'); }
    } catch { showMessage('Error de conexión', 'error'); }
  };

  const handleUnpublish = async (item) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/menu/${item.id}/unpublish`, 'PATCH');
      if (res.ok) { showMessage(`"${item.name}" retirado`); fetchMenuItems(); }
      else { const err = await res.json(); showMessage(err.message, 'error'); }
    } catch { showMessage('Error de conexión', 'error'); }
  };

  const handleDeleteMenuItem = async (item) => {
    if (item.type === 'REVENTA') {
      if (!window.confirm(`¿Eliminar "${item.name}"? Se eliminará también del Inventario.`)) return;
      try {
        const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/products/${item.linkedProductId}`, 'DELETE');
        if (res.ok) { showMessage('Eliminado'); fetchMenuItems(); fetchIngredients(); fetchProducts(); }
        else { const err = await res.json(); showMessage(err.message, 'error'); }
      } catch { showMessage('Error', 'error'); }
    } else {
      if (!window.confirm(`¿Eliminar "${item.name}" permanentemente?`)) return;
      try {
        const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/menu/${item.id}`, 'DELETE');
        if (res.ok) { showMessage('Eliminado'); fetchMenuItems(); }
        else { const err = await res.json(); showMessage(err.message, 'error'); }
      } catch { showMessage('Error', 'error'); }
    }
  };

  const handleOpenRecipeModal = (menuItem) => {
    setActiveRecipeMenu(menuItem);
    setRecipeForm({ ingredientId: ingredients.length > 0 ? ingredients[0].id : '', quantity: '' });
    fetchRecipeItems(menuItem.id);
    setIsRecipeModalOpen(true);
  };

  const handleRecipeSubmit = async (e) => {
    e.preventDefault();
    if (Number(recipeForm.quantity) <= 0) { showMessage('La cantidad debe ser mayor a 0', 'error'); return; }

    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/menu/${activeRecipeMenu.id}/recipe`, 'POST', recipeForm);
      if (res.ok) {
        showMessage('Ingrediente añadido');
        setRecipeForm({ ...recipeForm, quantity: '' });
        fetchRecipeItems(activeRecipeMenu.id);
        fetchMenuItems();
        fetchIngredients();
      } else {
        const err = await res.json();
        showMessage(err.message, 'error');
      }
    } catch { showMessage('Error', 'error'); }
  };

  const handleDeleteRecipeItem = async (recipeItemId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/recipe/${recipeItemId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) {
        showMessage('Ingrediente eliminado');
        fetchRecipeItems(activeRecipeMenu.id);
        fetchMenuItems();
        fetchIngredients();
      } else { showMessage('Error', 'error'); }
    } catch { showMessage('Error', 'error'); }
  };

  // --- INGREDIENTS HANDLERS ---
  const handleOpenIngredientModal = (ing = null) => {
    if (ing) {
      setEditingIngredient(ing);
      setIngredientForm({
        name: ing.name,
        description: ing.description || '',
        type: ing.type,
        linkedProductId: ing.linkedProductId || (products.length > 0 ? products[0].id : ''),
        yieldQuantity: ing.yieldQuantity || '',
        yieldUnit: ing.yieldUnit || 'Unidad',
        yieldDescription: ing.yieldDescription || ''
      });
      if (ing.type === 'PREPARADO') {
        setTempIngredientRecipe(ing.recipeItems.map(ri => {
          if (ri.productId) {
            const productFromState = products.find(p => p.id === ri.productId);
            return {
              type: 'PRODUCT',
              id: ri.productId,
              quantity: ri.quantity,
              name: ri.product.name,
              unit: ri.product.unit,
              averageCost: productFromState ? (productFromState.averageCost || 0) : 0
            };
          } else if (ri.childIngredientId) {
            const ingFromState = ingredients.find(i => i.id === ri.childIngredientId);
            return {
              type: 'INGREDIENT',
              id: ri.childIngredientId,
              quantity: ri.quantity,
              name: ri.childIngredient.name,
              unit: ingFromState ? (ingFromState.yieldUnit || 'Unidad') : (ri.childIngredient.yieldUnit || 'Unidad'),
              averageCost: ingFromState ? (ingFromState.averageCost || 0) : 0
            };
          }
          return null;
        }).filter(Boolean));
      } else {
        setTempIngredientRecipe([]);
      }
    } else {
      setEditingIngredient(null);
      setIngredientForm({
        name: '',
        description: '',
        type: 'DIRECTO',
        linkedProductId: products.length > 0 ? products[0].id : '',
        yieldQuantity: '',
        yieldUnit: 'Unidad',
        yieldDescription: ''
      });
      setTempIngredientRecipe([]);
    }
    setTempRecipeForm({ selectedId: '', quantity: '' });
    setIsIngredientModalOpen(true);
  };

  const handleAddTempIngredientRecipe = (e) => {
    e.preventDefault();
    if (Number(tempRecipeForm.quantity) <= 0) return showMessage('Cantidad inválida', 'error');
    if (!tempRecipeForm.selectedId) return showMessage('Seleccione un ingrediente o producto', 'error');

    const [type, idStr] = tempRecipeForm.selectedId.split('_');
    const id = Number(idStr);

    const exists = tempIngredientRecipe.find(r => r.type === type && r.id === id);
    if (exists) {
      return showMessage('Este elemento ya está en la receta del ingrediente', 'error');
    }

    if (type === 'PRODUCT') {
      const prod = products.find(p => p.id === id);
      if (!prod) return;
      setTempIngredientRecipe([...tempIngredientRecipe, {
        type: 'PRODUCT',
        id: prod.id,
        quantity: Number(tempRecipeForm.quantity),
        name: prod.name,
        unit: prod.unit,
        averageCost: prod.averageCost || 0
      }]);
    } else if (type === 'INGREDIENT') {
      const ing = ingredients.find(i => i.id === id);
      if (!ing) return;
      setTempIngredientRecipe([...tempIngredientRecipe, {
        type: 'INGREDIENT',
        id: ing.id,
        quantity: Number(tempRecipeForm.quantity),
        name: ing.name,
        unit: ing.yieldUnit || 'Unidad',
        averageCost: ing.averageCost || 0
      }]);
    }
    setTempRecipeForm({ ...tempRecipeForm, quantity: '' });
  };

  const handleRemoveTempIngredientRecipe = (type, id) => {
    setTempIngredientRecipe(tempIngredientRecipe.filter(r => !(r.type === type && r.id === id)));
  };

  const handleIngredientSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingIngredient;
    const url = isEditing ? `${import.meta.env.VITE_API_BASE_URL}/ingredients/${editingIngredient.id}` : `${import.meta.env.VITE_API_BASE_URL}/ingredients`;
    const method = isEditing ? 'PUT' : 'POST';

    const payload = {
      name: ingredientForm.name,
      description: ingredientForm.description,
      type: ingredientForm.type,
    };

    if (ingredientForm.type === 'DIRECTO') {
      payload.linkedProductId = ingredientForm.linkedProductId;
    } else {
      if (tempIngredientRecipe.length === 0) return showMessage('Un ingrediente elaborado necesita una receta', 'error');
      if (Number(ingredientForm.yieldQuantity) <= 0) return showMessage('El rendimiento debe ser mayor a 0', 'error');
      
      payload.recipeItems = tempIngredientRecipe.map(item => ({
        productId: item.type === 'PRODUCT' ? item.id : null,
        childIngredientId: item.type === 'INGREDIENT' ? item.id : null,
        quantity: item.quantity
      }));
      payload.yieldQuantity = Number(ingredientForm.yieldQuantity);
      payload.yieldUnit = ingredientForm.yieldUnit;
      payload.yieldDescription = ingredientForm.yieldDescription;
    }

    try {
      const res = await apiCall(url, method, payload);
      if (res.ok) {
        showMessage(`Ingrediente ${isEditing ? 'actualizado' : 'creado'} correctamente`);
        setIsIngredientModalOpen(false);
        fetchIngredients();
        // Al actualizar un ingrediente, el estado del menú podría cambiar
        fetchMenuItems();
      } else {
        const err = await res.json();
        showMessage(err.message, 'error');
      }
    } catch { showMessage('Error de conexión', 'error'); }
  };

  const handleDeleteIngredient = async (ing) => {
    if (!window.confirm(`¿Eliminar ingrediente "${ing.name}"?`)) return;
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/ingredients/${ing.id}`, 'DELETE');
      if (res.ok) {
        showMessage('Ingrediente eliminado');
        fetchIngredients();
      } else {
        const err = await res.json();
        showMessage(err.message, 'error');
      }
    } catch { showMessage('Error de conexión', 'error'); }
  };


  // Filtering
  let filteredMenu = menuItems.filter(m => m.name.toLowerCase().includes(searchTermMenu.toLowerCase()));
  
  if (filterStatusMenu === 'AVAILABLE') {
    filteredMenu = filteredMenu.filter(m => {
      const statusInfo = m.statusInfo || { status: m.status };
      return statusInfo.status === 'Disponible';
    });
  } else if (filterStatusMenu === 'UNAVAILABLE') {
    filteredMenu = filteredMenu.filter(m => {
      const statusInfo = m.statusInfo || { status: m.status };
      return statusInfo.status === 'No disponible' || statusInfo.status === 'Borrador';
    });
  }
  
  if (filterCategoryMenu === 'PREPARADO') {
    filteredMenu = filteredMenu.filter(m => m.type === 'PREPARADO');
  } else if (filterCategoryMenu === 'REVENTA') {
    filteredMenu = filteredMenu.filter(m => m.type === 'REVENTA');
  }
  
  filteredMenu.sort((a, b) => {
    if (sortOrderMenu === 'NAME_ASC') return a.name.localeCompare(b.name);
    if (sortOrderMenu === 'NAME_DESC') return b.name.localeCompare(a.name);
    if (sortOrderMenu === 'NEWEST') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortOrderMenu === 'OLDEST') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortOrderMenu === 'HIGH_PRICE') return Number(b.price || 0) - Number(a.price || 0);
    if (sortOrderMenu === 'LOW_PRICE') return Number(a.price || 0) - Number(b.price || 0);
    return 0;
  });

  const totalMenu = menuItems.length;
  const totalDisponibles = menuItems.filter(m => (m.statusInfo?.status || m.status) === 'Disponible').length;
  const totalNoDisponibles = totalMenu - totalDisponibles;
  const filteredIngredients = ingredients.filter(i => i.name.toLowerCase().includes(searchTermIngredient.toLowerCase()));
  
  const selectedRecipeMenuIngredient = ingredients.find(i => i.id === Number(recipeForm.ingredientId));
  
  // Extraer información del item seleccionado para la receta temporal
  let selectedTempRecipeItemUnit = '-';
  let selectedTempRecipeItemYieldDesc = null;
  if (tempRecipeForm.selectedId) {
    const [type, idStr] = tempRecipeForm.selectedId.split('_');
    const id = Number(idStr);
    if (type === 'PRODUCT') {
      const prod = products.find(p => p.id === id);
      if (prod) selectedTempRecipeItemUnit = prod.unit;
    } else if (type === 'INGREDIENT') {
      const ing = ingredients.find(i => i.id === id);
      if (ing) {
        selectedTempRecipeItemUnit = ing.yieldUnit || 'Unidad';
        selectedTempRecipeItemYieldDesc = ing.yieldDescription;
      }
    }
  }
  
  // Real-time calculo de costo
  const totalLoteCost = tempIngredientRecipe.reduce((sum, item) => sum + (Number(item.averageCost) * Number(item.quantity)), 0);
  const yieldQty = Number(ingredientForm.yieldQuantity) || 1;
  const unitCost = totalLoteCost / yieldQty;
  
  // Plural/Singular helper
  const isSingular = ingredientForm.yieldUnit === 'Unidad' || yieldQty === 1;
  let unitDisplay = ingredientForm.yieldUnit;
  if (ingredientForm.yieldUnit === 'Gramos') unitDisplay = 'gramo';
  else if (ingredientForm.yieldUnit === 'Litros') unitDisplay = 'litro';
  else if (ingredientForm.yieldUnit === 'Mililitros') unitDisplay = 'mililitro';
  else if (ingredientForm.yieldUnit === 'Kg') unitDisplay = 'kg';
  else if (ingredientForm.yieldUnit === 'Unidad') unitDisplay = 'unidad';


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Gestión de Menú</h1>
          <p style={{ color: 'var(--text-muted)' }}>Administra la oferta comercial y recetas</p>
        </div>
        {activeTab === 'menu' && businessRole === 'CEO' && (
          <button className="btn" onClick={() => handleOpenMenuModal()}>+ Nuevo Producto Preparado</button>
        )}
        {activeTab === 'ingredients' && businessRole !== 'EMPLEADO' && (
          <button className="btn" onClick={() => handleOpenIngredientModal()}>+ Nuevo Ingrediente</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('menu')}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'menu' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'menu' ? 'bold' : 'normal', color: activeTab === 'menu' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >Productos</button>
        <button 
          onClick={() => setActiveTab('ingredients')}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'ingredients' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'ingredients' ? 'bold' : 'normal', color: activeTab === 'ingredients' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >Ingredientes</button>
      </div>

      {message.text && (
        <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '6px', backgroundColor: message.type === 'error' ? 'var(--error)' : 'var(--success)', color: 'white', textAlign: 'center' }}>
          {message.text}
        </div>
      )}

      {/* --- TAB MENU --- */}
      {activeTab === 'menu' && (
      <>
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="dashboard-card">
            <h3>Productos del menú</h3>
            <p className="number">{totalMenu}</p>
          </div>
          <div className="dashboard-card">
            <h3>Disponibles</h3>
            <p className="number" style={{ color: 'var(--success)' }}>{totalDisponibles}</p>
          </div>
          <div className="dashboard-card">
            <h3>No disponibles</h3>
            <p className="number" style={{ color: 'var(--error)' }}>{totalNoDisponibles}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTermMenu} 
            onChange={(e) => setSearchTermMenu(e.target.value)}
            style={{ flex: '1', minWidth: '200px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }} 
          />
          <select 
            value={filterStatusMenu} 
            onChange={e => setFilterStatusMenu(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="AVAILABLE">Disponibles</option>
            <option value="UNAVAILABLE">No disponibles</option>
          </select>
          <select 
            value={filterCategoryMenu} 
            onChange={e => setFilterCategoryMenu(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
          >
            <option value="TODOS">Todas las categorías</option>
            <option value="PREPARADO">Preparado</option>
            <option value="REVENTA">Reventa</option>
          </select>
          <select 
            value={sortOrderMenu} 
            onChange={e => setSortOrderMenu(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
          >
            <option value="NAME_ASC">Nombre (A → Z)</option>
            <option value="NAME_DESC">Nombre (Z → A)</option>
            <option value="NEWEST">Más reciente</option>
            <option value="OLDEST">Más antiguo</option>
            <option value="HIGH_PRICE">Mayor precio</option>
            <option value="LOW_PRICE">Menor precio</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Imagen</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Estado</th>
                {businessRole !== 'EMPLEADO' && <th style={{ textAlign: 'right' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMenu.length > 0 ? (
                filteredMenu.map(item => {
                  const statusInfo = item.statusInfo || { publishable: false, status: item.status, reason: 'missing_recipe', warnings: [] };
                  const badge = STATUS_BADGE[statusInfo.status] || STATUS_BADGE['Borrador'];
                  const reasonLabel = REASON_LABELS[statusInfo.reason] || statusInfo.reason;
                  const canPublish = statusInfo.publishable && statusInfo.status !== 'Disponible';
                  const canUnpublish = statusInfo.status === 'Disponible';

                  return (
                    <tr key={item.id}>
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
                          {item.imageUrl ? (
                            <img src={`${import.meta.env.VITE_BACKEND_URL}${item.imageUrl}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>📸</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.description}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {item.type === 'REVENTA' ? 'Reventa' : 'Preparado'}
                        </span>
                        {item.type === 'REVENTA' && item.linkedProduct && (
                          <div style={{ fontSize: '0.8rem', marginTop: '2px', color: Number(item.linkedProduct.currentStock) > 0 ? 'var(--success)' : 'var(--error)' }}>
                            Stock: {item.linkedProduct.currentStock} {item.linkedProduct.unit}
                          </div>
                        )}
                        {item.type === 'PREPARADO' && statusInfo.maxAvailablePlates !== undefined && (
                          <div style={{ fontSize: '0.8rem', marginTop: '2px', color: statusInfo.maxAvailablePlates > 0 ? 'var(--success)' : 'var(--error)' }}>
                            Disponibles: {statusInfo.maxAvailablePlates}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {item.price !== null ? `Bs. ${Number(item.price).toFixed(2)}` : '-'}
                      </td>
                      <td>
                        <span className={badge.className}>
                          {badge.label}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{reasonLabel}</div>
                        {statusInfo.warnings && statusInfo.warnings.map((w, idx) => (
                           <div key={idx} style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '2px' }}>
                             ⚠️ Stock: {w.ingredient} ({w.available}/{w.required})
                           </div>
                        ))}
                      </td>
                      {businessRole !== 'EMPLEADO' && (
                        <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {item.type === 'PREPARADO' && (
                            <button className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', color: 'inherit' }} onClick={() => handleOpenRecipeModal(item)}>Receta</button>
                          )}
                          <button className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', color: 'inherit' }} onClick={() => handleOpenMenuModal(item)}>Editar</button>
                          {canPublish && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} 
                              onClick={() => handlePublish(item)}
                            >
                              Activar
                            </button>
                          )}
                          {canUnpublish && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} 
                              onClick={() => handleUnpublish(item)}
                            >
                              Desactivar
                            </button>
                          )}
                          {businessRole === 'CEO' && item.type !== 'REVENTA' && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} 
                              onClick={() => handleDeleteMenuItem(item)}
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="5" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No se encontraron Productos del Menú.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
      )}

      {/* --- TAB INGREDIENTES --- */}
      {activeTab === 'ingredients' && (
      <>
        <div style={{ marginBottom: '1rem' }}>
          <input type="text" placeholder="Buscar ingrediente..." value={searchTermIngredient} onChange={(e) => setSearchTermIngredient(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Origen</th>
                <th>Estado</th>
                {businessRole !== 'EMPLEADO' && <th style={{ textAlign: 'right' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.length > 0 ? (
                filteredIngredients.map(ing => (
                  <tr key={ing.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{ing.name}</div>
                      {ing.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ing.description}</div>}
                    </td>
                    <td>{ing.type === 'DIRECTO' ? 'Directo' : 'Elaborado'}</td>
                    <td>
                      {ing.type === 'DIRECTO' && ing.linkedProduct ? (
                        <><span style={{color: 'var(--primary)'}}>{ing.linkedProduct.name}</span> <span style={{fontSize: '0.85rem', color:'var(--text-muted)'}}>→ Inventario</span></>
                      ) : (
                        <span style={{color: 'var(--text-muted)'}}>Receta propia → Elaborado</span>
                      )}
                    </td>
                    <td>
                      {ing.derivedStatus === 'Disponible'
                        ? <span className="badge badge-success">Disponible</span> 
                        : <span className="badge badge-error">No disponible</span>}
                    </td>
                    {businessRole !== 'EMPLEADO' && (
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', color: 'inherit' }} 
                          onClick={() => handleOpenIngredientModal(ing)}
                        >
                          Editar
                        </button>
                        {businessRole === 'CEO' && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} 
                            onClick={() => handleDeleteIngredient(ing)}
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No se encontraron ingredientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
      )}


      {/* --- MODAL MENU --- */}
      {isMenuModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingItem ? 'Editar Producto del Menú' : 'Nuevo Producto Preparado'}</h2>
              <button onClick={() => setIsMenuModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleMenuSubmit}>
              <ImageUploader 
                initialImage={editingItem?.imageUrl}
                onImageChange={(file) => setImageFileMenu(file)}
                disabled={editingItem?.type === 'REVENTA'}
              />
              <div className="form-group">
                <label>Nombre del Producto {editingItem?.type !== 'REVENTA' && '*'}</label>
                <input required={editingItem?.type !== 'REVENTA'} disabled={editingItem?.type === 'REVENTA'} value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea rows="2" disabled={editingItem?.type === 'REVENTA'} value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label>Precio *</label>
                <input type="number" step="0.01" min="0" required value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} />
              </div>
              
              {editingItem?.type === 'REVENTA' ? (
                <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', fontSize: '0.85rem' }}>El nombre y descripción de los productos de reventa se administran desde el Inventario.</small>
              ) : (
                <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '1rem', fontSize: '0.85rem' }}>Para activar el producto, agrega una receta válida y usa el botón "Activar" en la tabla.</small>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsMenuModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL RECETA MENU --- */}
      {isRecipeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Receta: {activeRecipeMenu?.name}</h2>
              <button onClick={() => setIsRecipeModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleRecipeSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Añadir Ingrediente</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Ingrediente *</label>
                  <select required value={recipeForm.ingredientId} onChange={e => setRecipeForm({...recipeForm, ingredientId: e.target.value})}>
                    <option value="" disabled>Seleccione un ingrediente</option>
                    <optgroup label="Productos de Inventario">
                      {ingredients.filter(i => i.isActive && i.type === 'DIRECTO').map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Ingredientes Elaborados">
                      {ingredients.filter(i => i.isActive && i.type === 'PREPARADO').map(i => (
                        <option key={i.id} value={i.id}>👨‍🍳 {i.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  {selectedRecipeMenuIngredient?.type === 'PREPARADO' && selectedRecipeMenuIngredient.yieldDescription && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '4px' }}>
                      ↳ Rinde: {selectedRecipeMenuIngredient.yieldDescription}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: selectedRecipeMenuIngredient?.type === 'PREPARADO' && selectedRecipeMenuIngredient.yieldDescription ? '20px' : 0 }}>
                  <label>Cantidad *</label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" step="0.01" min="0.01" required value={recipeForm.quantity} onChange={e => setRecipeForm({...recipeForm, quantity: e.target.value})} style={{ paddingRight: '4rem' }} />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none' }}>
                      {selectedRecipeMenuIngredient?.type === 'DIRECTO' 
                        ? selectedRecipeMenuIngredient.linkedProduct?.unit 
                        : (selectedRecipeMenuIngredient?.yieldUnit || 'Unidad')}
                    </span>
                  </div>
                </div>
                <div style={{ marginBottom: selectedRecipeMenuIngredient?.type === 'PREPARADO' && selectedRecipeMenuIngredient.yieldDescription ? '20px' : 0 }}>
                  <button type="submit" className="btn" style={{ height: '42px' }}>Añadir</button>
                </div>
              </div>
            </form>

            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Estado</th>
                    <th>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeItems.length > 0 ? (
                    recipeItems.map(ri => {
                      const ing = ri.ingredient;
                      const unit = ing.type === 'DIRECTO' && ing.linkedProduct ? ing.linkedProduct.unit : 'Unidad';
                      return (
                      <tr key={ri.id} style={{ opacity: ing.isActive ? 1 : 0.5 }}>
                        <td>{ing.name}</td>
                        <td>{ing.isActive ? <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>● Activo</span> : <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>● Inactivo</span>}</td>
                        <td>{Number(ri.quantity)} {unit}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => handleDeleteRecipeItem(ri.id)}>Eliminar</button>
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr><td colSpan="4" className="text-center" style={{ padding: '1rem', color: 'var(--text-muted)' }}>Esta receta aún no tiene ingredientes.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL INGREDIENT --- */}
      {isIngredientModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingIngredient ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}</h2>
              <button onClick={() => setIsIngredientModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleIngredientSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input required value={ingredientForm.name} onChange={e => setIngredientForm({...ingredientForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea 
                  rows="2"
                  value={ingredientForm.description} 
                  onChange={e => setIngredientForm({...ingredientForm, description: e.target.value})} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <label>Tipo de Ingrediente</label>
                <select disabled={!!editingIngredient && ((editingIngredient.menuRecipeItems?.length > 0) || (editingIngredient.parentRecipes?.length > 0))} value={ingredientForm.type} onChange={e => setIngredientForm({...ingredientForm, type: e.target.value})}>
                  <option value="DIRECTO">Directo (De inventario)</option>
                  <option value="PREPARADO">Elaborado (Receta propia)</option>
                </select>
                {!!editingIngredient && ((editingIngredient.menuRecipeItems?.length > 0) || (editingIngredient.parentRecipes?.length > 0)) && (
                  <small style={{ color: 'var(--warning)', display: 'block', marginTop: '0.5rem' }}>
                    (para poder modificar el tipo o procedencia necesitas quitarlo de las recetas donde se usa)
                  </small>
                )}
              </div>

              {ingredientForm.type === 'DIRECTO' ? (
                <div className="form-group">
                  <label>Producto de Inventario vinculado *</label>
                  <select disabled={!!editingIngredient && ((editingIngredient.menuRecipeItems?.length > 0) || (editingIngredient.parentRecipes?.length > 0))} required value={ingredientForm.linkedProductId} onChange={e => setIngredientForm({...ingredientForm, linkedProductId: e.target.value})}>
                    <option value="" disabled>Seleccione un producto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Receta del Ingrediente Elaborado</h4>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                      <label style={{ fontSize: '0.85rem' }}>Ingrediente o Producto</label>
                      <select value={tempRecipeForm.selectedId} onChange={e => setTempRecipeForm({...tempRecipeForm, selectedId: e.target.value})}>
                        <option value="" disabled>Seleccionar...</option>
                        <optgroup label="Productos de Inventario">
                          {products.filter(p => p.isActive).map(p => (
                            <option key={`PRODUCT_${p.id}`} value={`PRODUCT_${p.id}`}>{p.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Ingredientes Elaborados">
                          {ingredients.filter(i => i.isActive && i.type === 'PREPARADO' && i.id !== editingIngredient?.id).map(i => (
                            <option key={`INGREDIENT_${i.id}`} value={`INGREDIENT_${i.id}`}>👨‍🍳 {i.name}</option>
                          ))}
                        </optgroup>
                      </select>
                      {selectedTempRecipeItemYieldDesc && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '4px' }}>
                          ↳ Rinde: {selectedTempRecipeItemYieldDesc}
                        </div>
                      )}
                    </div>
                    <div className="form-group" style={{ marginBottom: selectedTempRecipeItemYieldDesc ? '20px' : 0, flex: 1 }}>
                      <label style={{ fontSize: '0.85rem' }}>Cant. ({selectedTempRecipeItemUnit})</label>
                      <input type="number" step="0.01" min="0.01" value={tempRecipeForm.quantity} onChange={e => setTempRecipeForm({...tempRecipeForm, quantity: e.target.value})} />
                    </div>
                    <div style={{ marginBottom: selectedTempRecipeItemYieldDesc ? '20px' : 0 }}>
                      <button type="button" className="btn" style={{ padding: '0.6rem 1rem', height: '38px' }} onClick={handleAddTempIngredientRecipe}>Añadir</button>
                    </div>
                  </div>

                  <table style={{ fontSize: '0.9rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.5rem' }}>Producto</th>
                        <th style={{ padding: '0.5rem' }}>Cantidad</th>
                        <th style={{ padding: '0.5rem' }}>Costo Unit.</th>
                        <th style={{ padding: '0.5rem' }}>Subtotal</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tempIngredientRecipe.length > 0 ? (
                        tempIngredientRecipe.map(r => (
                          <tr key={`${r.type}_${r.id}`}>
                            <td style={{ padding: '0.5rem' }}>{r.type === 'INGREDIENT' ? '👨‍🍳 ' : ''}{r.name}</td>
                            <td style={{ padding: '0.5rem' }}>{r.quantity} {r.unit}</td>
                            <td style={{ padding: '0.5rem' }}>Bs {Number(r.averageCost).toFixed(2)}</td>
                            <td style={{ padding: '0.5rem' }}>Bs {(Number(r.quantity) * Number(r.averageCost)).toFixed(2)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }} onClick={() => handleRemoveTempIngredientRecipe(r.type, r.id)}>❌</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Sin ingredientes en la receta</td></tr>
                      )}
                    </tbody>
                  </table>

                  <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>Rendimiento del lote</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Cantidad producida *</label>
                      <input type="number" step="0.01" min="0.01" required value={ingredientForm.yieldQuantity} onChange={e => setIngredientForm({...ingredientForm, yieldQuantity: e.target.value})} placeholder="Ej. 20" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Unidad *</label>
                      <select required value={ingredientForm.yieldUnit} onChange={e => setIngredientForm({...ingredientForm, yieldUnit: e.target.value})}>
                        <option value="Unidad">Unidad</option>
                        <option value="Kg">Kg</option>
                        <option value="Gramos">Gramos</option>
                        <option value="Litros">Litros</option>
                        <option value="Mililitros">Mililitros</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Descripción (Opcional)</label>
                      <input value={ingredientForm.yieldDescription} onChange={e => setIngredientForm({...ingredientForm, yieldDescription: e.target.value})} placeholder="Ej. Bollos" />
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.5rem', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Costo del lote</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Bs {totalLoteCost.toFixed(2)}</div>
                      <div style={{ margin: '0.5rem 0', color: 'var(--border-color)' }}>↓</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Rendimiento</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--primary)' }}>
                        {ingredientForm.yieldQuantity || '?'} {ingredientForm.yieldUnit} {ingredientForm.yieldDescription ? `(${ingredientForm.yieldDescription})` : ''}
                      </div>
                      <div style={{ margin: '0.5rem 0', color: 'var(--border-color)' }}>↓</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Costo por {unitDisplay}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        Bs {(Number(ingredientForm.yieldQuantity) > 0 ? unitCost : 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsIngredientModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn">Guardar Ingrediente</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Menu;
