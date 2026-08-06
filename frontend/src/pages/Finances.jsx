import { useState, useEffect } from 'react';
import api from '../services/api';

function Finances() {
  const [activeTab, setActiveTab] = useState('summary');
  const [expenses, setExpenses] = useState([]);
  
  const [summaryData, setSummaryData] = useState(null);
  const [profitabilityData, setProfitabilityData] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  const [globalDateRange, setGlobalDateRange] = useState('ESTE_MES'); // HOY, ESTA_SEMANA, ESTE_MES, ESTE_ANIO, TODOS
  
  const [activityPage, setActivityPage] = useState(1);
  const [activityData, setActivityData] = useState({ data: [], totalItems: 0 });

  // States for Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    concept: '', category: 'SERVICIOS', amount: '', date: new Date().toISOString().split('T')[0], status: 'PAGADO', supplier: '', reference: '', observations: ''
  });

  // Filters for Expenses
  const [expenseFilterStatus, setExpenseFilterStatus] = useState('TODOS'); // TODOS, PENDIENTES, PAGADOS, ANULADOS

  // Modals for Top Rankings
  const [showTopSalesModal, setShowTopSalesModal] = useState(false);
  const [showTopProfitModal, setShowTopProfitModal] = useState(false);

  const [message, setMessage] = useState({ text: '', type: '' });
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    if (activeTab === 'summary') {
      fetchSummary(signal);
      fetchActivity(signal);
    } else if (activeTab === 'profitability') {
      fetchProfitability(signal);
    } else if (activeTab === 'expenses') {
      fetchExpenses(signal);
    }

    return () => controller.abort();
  }, [activeTab, globalDateRange]);

  useEffect(() => {
    setActivityPage(1);
  }, [globalDateRange]);

  useEffect(() => {
    if (activeTab !== 'summary') return;
    const controller = new AbortController();
    fetchActivity(controller.signal);
    return () => controller.abort();
  }, [activityPage]);

  const getQueryString = () => {
    if (globalDateRange === 'TODOS') return '';
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    if (globalDateRange === 'HOY') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (globalDateRange === 'ESTA_SEMANA') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (globalDateRange === 'ESTE_MES') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (globalDateRange === 'ESTE_ANIO') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }
    return `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
  };

  const fetchSummary = async (signal) => {
    setLoadingAnalytics(true);
    try {
      const qs = getQueryString();
      const res = await api.get(`/analytics/summary${qs}`, { signal });
      setSummaryData(res.data);
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') console.error('Error al cargar resumen:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchActivity = async (signal) => {
    try {
      const qs = getQueryString();
      const separator = qs ? '&' : '?';
      const res = await api.get(`/analytics/activity${qs}${separator}page=${activityPage}&limit=10`, { signal });
      setActivityData(res.data);
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') console.error('Error al cargar actividad:', error);
    }
  };

  const fetchProfitability = async (signal) => {
    setLoadingAnalytics(true);
    try {
      const qs = getQueryString();
      const res = await api.get(`/analytics/profitability${qs}`, { signal });
      setProfitabilityData(res.data);
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') console.error('Error al cargar rentabilidad:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchExpenses = async (signal) => {
    setLoadingExpenses(true);
    try {
      const qs = getQueryString();
      const res = await api.get(`/expenses${qs}`, { signal });
      setExpenses(res.data);
    } catch (error) {
      if (error.name !== 'CanceledError' && error.name !== 'AbortError') console.error('Error al cargar gastos', error);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleOpenExpenseModal = (item = null) => {
    if (item) {
      setEditingExpense(item);
      setExpenseForm({
        concept: item.concept,
        category: item.category,
        amount: item.amount,
        date: new Date(item.date).toISOString().split('T')[0],
        status: item.status,
        supplier: item.supplier || '',
        reference: item.reference || '',
        observations: item.observations || ''
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        concept: '', category: 'SERVICIOS', amount: '', date: new Date().toISOString().split('T')[0], status: 'PAGADO', supplier: '', reference: '', observations: ''
      });
    }
    setIsExpenseModalOpen(true);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingExpense;
    try {
      if (isEditing) {
        await api.put(`/expenses/${editingExpense.id}`, expenseForm);
      } else {
        await api.post('/expenses', expenseForm);
      }
      showMessage(isEditing ? 'Gasto actualizado.' : 'Gasto registrado exitosamente.');
      setIsExpenseModalOpen(false);
      fetchExpenses();
    } catch (error) {
      if (error.response && error.response.data) {
        showMessage(error.response.data.message || 'Error al guardar gasto', 'error');
      } else {
        showMessage('Error de red', 'error');
      }
    }
  };

  const handleCancelExpense = async (id) => {
    if (!window.confirm('¿Anular este gasto? No se tomará en cuenta para analíticas.')) return;
    try {
      await api.put(`/expenses/${id}/cancel`);
      showMessage('Gasto anulado.');
      fetchExpenses();
    } catch (error) {
      showMessage('Error de red', 'error');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('¿Borrar permanentemente este gasto anulado?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      showMessage('Gasto borrado exitosamente.');
      fetchExpenses();
    } catch (error) {
      showMessage('Error al borrar el gasto', 'error');
    }
  };

  const handleUncancelExpense = async (id) => {
    if (!window.confirm('¿Desanular este gasto? Volverá al estado Pendiente.')) return;
    try {
      await api.put(`/expenses/${id}/uncancel`);
      showMessage('Gasto restaurado a Pendiente.');
      fetchExpenses();
    } catch (error) {
      showMessage('Error al restaurar el gasto', 'error');
    }
  };

  // Expenses filtering
  let filteredExpenses = expenses;
  if (expenseFilterStatus !== 'TODOS') {
    filteredExpenses = filteredExpenses.filter(e => e.status === expenseFilterStatus);
  }

  const expenseTotal = filteredExpenses.filter(e => e.status !== 'ANULADO').reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const pendingTotal = filteredExpenses.filter(e => e.status === 'PENDIENTE').reduce((sum, item) => sum + parseFloat(item.amount), 0);

  // Categories sum
  const expensesByCategory = {};
  filteredExpenses.filter(e => e.status !== 'ANULADO').forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + parseFloat(e.amount);
  });
  let maxCategory = '-';
  let maxCategoryAmount = 0;
  Object.keys(expensesByCategory).forEach(cat => {
    if (expensesByCategory[cat] > maxCategoryAmount) {
      maxCategory = cat;
      maxCategoryAmount = expensesByCategory[cat];
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Finanzas</h1>
          <p style={{ color: 'var(--text-muted)' }}>Análisis económico y gestión de gastos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Periodo:</label>
          <select 
            value={globalDateRange} 
            onChange={(e) => setGlobalDateRange(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', minWidth: '150px' }}
          >
            <option value="HOY">Hoy</option>
            <option value="ESTA_SEMANA">Esta Semana</option>
            <option value="ESTE_MES">Este Mes</option>
            <option value="ESTE_ANIO">Este Año</option>
            <option value="TODOS">Histórico Total</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('summary')}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'summary' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'summary' ? 'bold' : 'normal', color: activeTab === 'summary' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Resumen
        </button>
        <button 
          onClick={() => setActiveTab('profitability')}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'profitability' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'profitability' ? 'bold' : 'normal', color: activeTab === 'profitability' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Rentabilidad
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'expenses' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'expenses' ? 'bold' : 'normal', color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Gastos
        </button>
      </div>

      {message.text && (
        <div className={`badge ${message.type === 'error' ? 'badge-error' : 'badge-success'}`} style={{ marginBottom: '1rem', display: 'block', padding: '1rem' }}>
          {message.text}
        </div>
      )}

      {/* TABS */}

      {/* --- RESUMEN --- */}
      {activeTab === 'summary' && (
        <>
          {loadingAnalytics || !summaryData ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando resumen...</div>
          ) : (
            <>
              <div className="dashboard-grid">
                <div className="dashboard-card" style={{ borderLeft: '4px solid var(--success)' }}>
                  <h3>Ingresos Totales</h3>
                  <p className="number" style={{ color: 'var(--success)' }}>Bs {summaryData.summary.income.toFixed(2)}</p>
                </div>
                <div className="dashboard-card" style={{ borderLeft: '4px solid var(--error)' }}>
                  <h3>Egresos Totales</h3>
                  <p className="number" style={{ color: 'var(--error)' }}>Bs {summaryData.summary.totalExpenses.toFixed(2)}</p>
                </div>
                <div className="dashboard-card" style={{ borderLeft: `4px solid ${summaryData.summary.profit >= 0 ? 'var(--success)' : 'var(--error)'}` }}>
                  <h3>Utilidad Neta</h3>
                  <p className="number" style={{ color: summaryData.summary.profit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    Bs {summaryData.summary.profit.toFixed(2)}
                  </p>
                </div>
                <div className="dashboard-card">
                  <h3>Margen Neto</h3>
                  <p className="number">{summaryData.summary.margin.toFixed(2)}%</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    {summaryData.summary.margin >= 0 
                      ? `Cada Bs 100 vendidos generan Bs ${(summaryData.summary.margin).toFixed(2)} de utilidad.` 
                      : 'El negocio está operando con pérdidas.'}
                  </div>
                </div>
                {(() => {
                  const metaGastosFijos = summaryData.summary.payroll + summaryData.summary.operatingExpenses + summaryData.summary.inventoryExpenses;
                  const ventas = summaryData.summary.income;
                  const progresoMeta = metaGastosFijos > 0 ? (ventas / metaGastosFijos) * 100 : 100;
                  const progresoBarra = Math.min(Math.round(progresoMeta / 10), 10);
                  const barraPintada = '█'.repeat(progresoBarra);
                  const barraVacia = '░'.repeat(10 - progresoBarra);
                  
                  return (
                    <div className="dashboard-card">
                      <h3>Meta para cubrir gastos</h3>
                      <p className="number">Bs {metaGastosFijos.toFixed(2)}</p>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Has vendido</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', marginTop: '0.25rem' }}>Bs {ventas.toFixed(2)}</div>
                      </div>
                      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', letterSpacing: '2px', color: progresoMeta >= 100 ? 'var(--success)' : 'var(--primary)', fontSize: '1.2rem' }}>
                          {barraPintada}<span style={{ color: 'var(--border-color)' }}>{barraVacia}</span>
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{progresoMeta.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '2rem' }}>
                <div className="dashboard-card">
                  <h3>Distribución de Egresos</h3>
                  {(() => {
                    const totalReal = summaryData.summary.totalExpenses;
                    const totalEstimado = totalReal + summaryData.summary.payroll;
                    
                    const pctInv = totalEstimado > 0 ? (summaryData.summary.inventoryExpenses / totalEstimado) * 100 : 0;
                    const pctOp = totalEstimado > 0 ? (summaryData.summary.operatingExpenses / totalEstimado) * 100 : 0;
                    const pctPay = totalEstimado > 0 ? (summaryData.summary.payroll / totalEstimado) * 100 : 0;
                    
                    return (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>Nómina (Estimada)</div>
                            <div style={{ fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--text-muted)' }}>Bs {summaryData.summary.payroll.toFixed(2)}</div>
                          </div>
                          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{pctPay.toFixed(0)}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>Compras Inventario</div>
                            <div style={{ fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--text-muted)' }}>Bs {summaryData.summary.inventoryExpenses.toFixed(2)}</div>
                          </div>
                          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{pctInv.toFixed(0)}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>Gastos Operativos</div>
                            <div style={{ fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--text-muted)' }}>Bs {summaryData.summary.operatingExpenses.toFixed(2)}</div>
                          </div>
                          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{pctOp.toFixed(0)}%</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>Total Egresos (Estimado)</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--error)' }}>Bs {totalEstimado.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="dashboard-card">
                  <h3>Actividad</h3>
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {activityData.data.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay actividad en este periodo.</div>
                    ) : (
                      activityData.data.map(act => (
                        <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              {new Date(act.date).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                            </div>
                            <span className={`badge ${act.type === 'Venta' ? 'badge-success' : act.type === 'Gasto' ? 'badge-error' : 'badge-warning'}`}>
                              {act.type}
                            </span>
                            <span style={{ fontWeight: 500 }}>{act.description}</span>
                          </div>
                          <div style={{ fontWeight: 'bold' }}>
                            Bs {act.amount.toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {activityData.totalItems > 10 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                        disabled={activityPage === 1}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                      >
                        Anterior
                      </button>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Página {activityPage} de {Math.ceil(activityData.totalItems / 10)}
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setActivityPage(p => p + 1)}
                        disabled={activityPage >= Math.ceil(activityData.totalItems / 10)}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* --- RENTABILIDAD DE PRODUCTOS --- */}
      {activeTab === 'profitability' && (
        <>
          {loadingAnalytics || !profitabilityData ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando rentabilidad...</div>
          ) : (
            <>
              {(() => {
                const prods = [...profitabilityData.products];
                const validProds = prods.filter(p => p.margin !== null && p.sold > 0);
                
                const topSold = prods.length > 0 ? prods[0] : null;
                const topProfitable = validProds.length > 0 ? [...validProds].sort((a, b) => b.totalProfit - a.totalProfit)[0] : null;
                const lowestProfitable = validProds.length > 0 ? [...validProds].sort((a, b) => a.margin - b.margin)[0] : null;
                
                const totalGenerated = validProds.reduce((sum, p) => sum + p.totalProfit, 0);

                return (
                  <>
                    <div className="dashboard-grid">
                      <div className="dashboard-card">
                        <h3>Producto Más Rentable</h3>
                        {validProds.length >= 2 ? (
                          <>
                            <p className="number">{topProfitable.name}</p>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                              <div><strong>Margen:</strong> {topProfitable.margin.toFixed(2)}%</div>
                              <div><strong>Costo Prom.:</strong> Bs {topProfitable.recipeCost.toFixed(2)}</div>
                              <div><strong>Gan. Unit.:</strong> Bs {topProfitable.unitProfit.toFixed(2)}</div>
                              <div><strong>Gan. Total:</strong> Bs {topProfitable.totalProfit.toFixed(2)}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="number" style={{ color: 'var(--text-muted)' }}>No disponible</p>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                              Se requieren al menos 2 productos con margen calculable.
                            </div>
                          </>
                        )}
                      </div>
                      <div className="dashboard-card">
                        <h3>Producto Menos Rentable</h3>
                        {validProds.length >= 2 ? (
                          <>
                            <p className="number" style={{ color: 'var(--warning)' }}>{lowestProfitable.name}</p>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                              <div><strong>Margen:</strong> {lowestProfitable.margin.toFixed(2)}%</div>
                              <div><strong>Costo Prom.:</strong> Bs {lowestProfitable.recipeCost.toFixed(2)}</div>
                              <div><strong>Gan. Unit.:</strong> Bs {lowestProfitable.unitProfit.toFixed(2)}</div>
                              <div><strong>Gan. Total:</strong> Bs {lowestProfitable.totalProfit.toFixed(2)}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="number" style={{ color: 'var(--text-muted)' }}>No disponible</p>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                              Se requieren al menos 2 productos con margen calculable.
                            </div>
                          </>
                        )}
                      </div>
                      <div className="dashboard-card">
                        <h3>Ganancia Total Generada</h3>
                        <p className="number" style={{ color: 'var(--success)' }}>Bs {totalGenerated.toFixed(2)}</p>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Solo productos vendidos</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                      <div className="dashboard-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ color: 'var(--primary)', margin: 0 }}>🏆 Top Ventas (Volumen)</h3>
                          {prods.length > 3 && (
                            <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setShowTopSalesModal(true)}>
                              Ver más
                            </button>
                          )}
                        </div>
                        {prods.slice(0, 3).map((p, i) => (
                          <div key={p.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{i + 1}. {p.name}</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{p.sold} {p.sold === 1 ? 'venta' : 'ventas'}</span>
                          </div>
                        ))}
                        {prods.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Sin ventas registradas.</div>}
                      </div>
                      
                      <div className="dashboard-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ color: 'var(--success)', margin: 0 }}>💰 Mayor ganancia generada</h3>
                          {validProds.length > 3 && (
                            <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setShowTopProfitModal(true)}>
                              Ver más
                            </button>
                          )}
                        </div>
                        {validProds.sort((a,b) => b.totalProfit - a.totalProfit).slice(0, 3).map((p, i) => (
                          <div key={p.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{i + 1}. {p.name}</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>Bs {p.totalProfit.toFixed(2)}</span>
                          </div>
                        ))}
                        {validProds.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Aún no existen productos con rentabilidad calculable.</div>}
                      </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                      <h3>Desglose de Productos</h3>
                      <div className="table-container" style={{ marginTop: '1rem' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Producto</th>
                              <th style={{ textAlign: 'center' }}>Vendidas</th>
                              <th style={{ textAlign: 'center' }}>Precio Medio</th>
                              <th style={{ textAlign: 'center' }}>Costo Promedio</th>
                              <th style={{ textAlign: 'center' }}>Margen</th>
                              <th style={{ textAlign: 'center' }}>Ganancia Unit.</th>
                              <th style={{ textAlign: 'center' }}>Ganancia Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prods.map(p => (
                              <tr key={p.menuItemId}>
                                <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                                <td style={{ textAlign: 'center' }}>{p.sold} {p.sold === 1 ? 'venta' : 'ventas'}</td>
                                <td style={{ textAlign: 'center' }}>Bs {p.price.toFixed(2)}</td>
                                <td style={{ textAlign: 'center' }}>
                                  {p.recipeCost !== null ? `Bs ${p.recipeCost.toFixed(2)}` : <span style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>Sin historial</span>}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {p.margin !== null ? (
                                    <span className={`badge ${p.margin > 40 ? 'badge-success' : p.margin > 15 ? 'badge-warning' : 'badge-error'}`}>
                                      {p.margin.toFixed(2)}%
                                    </span>
                                  ) : '-'}
                                </td>
                                <td style={{ textAlign: 'center', color: p.unitProfit !== null ? (p.unitProfit > 0 ? 'var(--success)' : 'var(--error)') : 'inherit' }}>
                                  {p.unitProfit !== null ? `Bs ${p.unitProfit.toFixed(2)}` : '-'}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: p.totalProfit !== null ? (p.totalProfit > 0 ? 'var(--success)' : 'var(--error)') : 'inherit' }}>
                                  {p.totalProfit !== null ? `Bs ${p.totalProfit.toFixed(2)}` : '-'}
                                </td>
                              </tr>
                            ))}
                            {prods.length === 0 && (
                              <tr><td colSpan="7" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No existen datos para el período seleccionado.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </>
      )}

      {/* --- GASTOS --- */}
      {activeTab === 'expenses' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select value={expenseFilterStatus} onChange={e => setExpenseFilterStatus(e.target.value)} className="btn btn-secondary" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                <option value="TODOS">Todos los Estados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="PAGADO">Pagados</option>
                <option value="ANULADO">Anulados</option>
              </select>
            </div>
            <button className="btn" onClick={() => handleOpenExpenseModal()}>+ Registrar Gasto</button>
          </div>

          <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="dashboard-card">
              <h3>Total Gastos (Efectivos)</h3>
              <p className="number" style={{ color: 'var(--error)' }}>Bs {expenseTotal.toFixed(2)}</p>
            </div>
            <div className="dashboard-card">
              <h3>Gastos Pendientes</h3>
              <p className="number" style={{ color: 'var(--warning)' }}>Bs {pendingTotal.toFixed(2)}</p>
            </div>
            <div className="dashboard-card">
              <h3>Categoría Principal</h3>
              <p className="number" style={{ fontSize: '1.5rem' }}>{maxCategory}</p>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bs {maxCategoryAmount.toFixed(2)}</div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Proveedor / Beneficiario</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingExpenses ? (
                  <tr>
                    <td colSpan="7" className="text-center" style={{ padding: '2rem' }}>Cargando gastos...</td>
                  </tr>
                ) : filteredExpenses.length > 0 ? (
                  filteredExpenses.map(item => (
                    <tr key={item.id} style={{ opacity: item.status === 'ANULADO' ? 0.5 : 1 }}>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.concept}</div>
                        {item.observations && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.observations}</div>}
                        {item.reference && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ref: {item.reference}</div>}
                      </td>
                      <td>{item.supplier || '-'}</td>
                      <td>{item.category}</td>
                      <td>
                        {item.status === 'PAGADO' && <span className="badge badge-success">Pagado</span>}
                        {item.status === 'PENDIENTE' && <span className="badge badge-warning">Pendiente</span>}
                        {item.status === 'ANULADO' && <span className="badge badge-error" style={{ backgroundColor: '#6b7280' }}>Anulado</span>}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>Bs {parseFloat(item.amount).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {item.status !== 'ANULADO' && (
                          <>
                            <button className="action-btn btn-edit" onClick={() => handleOpenExpenseModal(item)}>Editar</button>
                            <button className="action-btn btn-toggle" onClick={() => handleCancelExpense(item.id)}>Anular</button>
                          </>
                        )}
                        {item.status === 'ANULADO' && (
                          <>
                            <button className="action-btn btn-toggle" onClick={() => handleUncancelExpense(item.id)}>Desanular</button>
                            <button className="action-btn btn-delete" onClick={() => handleDeleteExpense(item.id)}>Borrar</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                      No hay gastos registrados en este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Concepto *</label>
                  <input required value={expenseForm.concept} onChange={e => setExpenseForm({...expenseForm, concept: e.target.value})} placeholder="Ej. Factura de luz" />
                </div>
                <div className="form-group">
                  <label>Monto (Bs) *</label>
                  <input type="number" step="0.01" min="0" required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Categoría *</label>
                  <select required value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                    <option value="SERVICIOS">Servicios</option>
                    <option value="ALQUILER">Alquiler</option>
                    <option value="PUBLICIDAD">Publicidad</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                    <option value="TRANSPORTE">Transporte</option>
                    <option value="LIMPIEZA">Limpieza</option>
                    <option value="PAPELERIA">Papelería</option>
                    <option value="SEGURIDAD">Seguridad</option>
                    <option value="SALARIOS">Salarios</option>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha *</label>
                  <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Proveedor / Beneficiario (Opcional)</label>
                  <input type="text" value={expenseForm.supplier} onChange={e => setExpenseForm({...expenseForm, supplier: e.target.value})} placeholder="Ej. Empresa Eléctrica" />
                </div>
                <div className="form-group">
                  <label>Estado *</label>
                  <select required value={expenseForm.status} onChange={e => setExpenseForm({...expenseForm, status: e.target.value})}>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="PAGADO">Pagado</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Referencia / Comprobante (Opcional)</label>
                <input type="text" value={expenseForm.reference} onChange={e => setExpenseForm({...expenseForm, reference: e.target.value})} placeholder="Ej. Factura N° 4512" />
              </div>

              <div className="form-group">
                <label>Observaciones (Opcional)</label>
                <textarea rows="2" value={expenseForm.observations} onChange={e => setExpenseForm({...expenseForm, observations: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Sales Modal */}
      {showTopSalesModal && profitabilityData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, color: 'var(--primary)' }}>🏆 Ranking de Ventas</h2>
              <button onClick={() => setShowTopSalesModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>&times;</button>
            </div>
            <div style={{ marginTop: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {profitabilityData.products.map((p, i) => (
                <div key={p.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 500 }}>{i + 1}. {p.name}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{p.sold} {p.sold === 1 ? 'venta' : 'ventas'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Profit Modal */}
      {showTopProfitModal && profitabilityData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, color: 'var(--success)' }}>💰 Ranking de Ganancias</h2>
              <button onClick={() => setShowTopProfitModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>&times;</button>
            </div>
            <div style={{ marginTop: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {[...profitabilityData.products].filter(p => p.margin !== null && p.sold > 0).sort((a,b) => b.totalProfit - a.totalProfit).map((p, i) => (
                <div key={p.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 500 }}>{i + 1}. {p.name}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>Bs {p.totalProfit.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Finances;
