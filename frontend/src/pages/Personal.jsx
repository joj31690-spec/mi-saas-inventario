import { useEffect, useState } from 'react';

// Helpers de tiempo
const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
};

const formatTimeFromInput = (timeString) => {
  if (!timeString) return null;
  // Guardamos en DB asumiendo 1970-01-01T{time}Z para tratar solo la hora
  return `1970-01-01T${timeString}:00.000Z`;
};

const calculateDuration = (startStr, endStr, bStartStr, bEndStr) => {
  if (!startStr || !endStr) return '';
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  let diff = end.getTime() - start.getTime();
  if (diff < 0) diff += 24 * 60 * 60 * 1000;

  if (bStartStr && bEndStr) {
    const bStart = new Date(bStartStr);
    const bEnd = new Date(bEndStr);
    let bDiff = bEnd.getTime() - bStart.getTime();
    if (bDiff < 0) bDiff += 24 * 60 * 60 * 1000;
    diff -= bDiff;
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins > 0 ? mins + 'm' : ''}`.trim();
};

const getDaysString = (item) => {
  const days = [
    { key: 'monday', label: 'Lun' },
    { key: 'tuesday', label: 'Mar' },
    { key: 'wednesday', label: 'Mié' },
    { key: 'thursday', label: 'Jue' },
    { key: 'friday', label: 'Vie' },
    { key: 'saturday', label: 'Sáb' },
    { key: 'sunday', label: 'Dom' }
  ];
  
  const activeDays = days.filter(d => item[d.key]);
  if (activeDays.length === 7) return 'Todos los días';
  if (activeDays.length === 5 && item.monday && item.tuesday && item.wednesday && item.thursday && item.friday) return 'Lun–Vie';
  
  return activeDays.map(d => d.label).join(', ');
};

const getFullDaysString = (item) => {
  if (!item) return '';
  const days = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];
  
  const activeDays = days.filter(d => item[d.key]);
  if (activeDays.length === 7) return 'Todos los días';
  if (activeDays.length === 5 && item.monday && item.tuesday && item.wednesday && item.thursday && item.friday) return 'Lunes a Viernes';
  
  return activeDays.map(d => d.label).join(', ');
};

function Personal() {
  const business = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
  const businessRole = business.role || 'EMPLEADO';

  const [activeTab, setActiveTab] = useState('assignments'); // 'positions', 'cashRegisters', 'assignments', 'workShifts', 'attendance'
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [sortOrder, setSortOrder] = useState('NAME_ASC');
  
  // Data state
  const [positions, setPositions] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [workShifts, setWorkShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendances, setAttendances] = useState([]);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal states (Edit/Create)
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [isCashRegisterModalOpen, setIsCashRegisterModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isWorkShiftModalOpen, setIsWorkShiftModalOpen] = useState(false);
  const [isCashRegisterDetailsModalOpen, setIsCashRegisterDetailsModalOpen] = useState(false);
  const [detailsCashRegister, setDetailsCashRegister] = useState(null);
  const [isPositionDetailsModalOpen, setIsPositionDetailsModalOpen] = useState(false);
  const [detailsPosition, setDetailsPosition] = useState(null);
  const [isWorkShiftDetailsModalOpen, setIsWorkShiftDetailsModalOpen] = useState(false);
  const [detailsWorkShift, setDetailsWorkShift] = useState(null);
  const [isAssignmentDetailsModalOpen, setIsAssignmentDetailsModalOpen] = useState(false);
  const [detailsAssignment, setDetailsAssignment] = useState(null);

  // Delete Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { type, item }

  // Editing states
  const [editingPosition, setEditingPosition] = useState(null);
  const [editingCashRegister, setEditingCashRegister] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingWorkShift, setEditingWorkShift] = useState(null);

  // Forms
  const [positionForm, setPositionForm] = useState({ name: '', description: '' });
  const [cashRegisterForm, setCashRegisterForm] = useState({ name: '', description: '' });
  const [assignmentForm, setAssignmentForm] = useState({ 
    userId: '', 
    positionId: '', 
    cashRegisterId: '', 
    workShiftId: '',
    extraPayForShift: ''
  });
  
  const defaultWorkShiftForm = {
    name: '', description: '', observations: '', color: '#10B981',
    startTime: '', endTime: '', breakStartTime: '', breakEndTime: '', toleranceMinutes: 0,
    monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false
  };
  const [workShiftForm, setWorkShiftForm] = useState(defaultWorkShiftForm);



  // --- Fetches ---
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const apiCall = async (url, method = 'GET', body = null, signal = null) => {
    return await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: body ? JSON.stringify(body) : undefined,
      signal
    });
  };

  const fetchPositions = async (signal) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/positions`, 'GET', null, signal);
      if (res.ok) setPositions(await res.json());
    } catch (error) { 
      if (error.name !== 'AbortError') showMessage('Error al cargar puestos', 'error'); 
    }
  };

  const fetchCashRegisters = async (signal) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/cash-registers`, 'GET', null, signal);
      if (res.ok) setCashRegisters(await res.json());
    } catch (error) { 
      if (error.name !== 'AbortError') showMessage('Error al cargar cajas', 'error'); 
    }
  };

  const fetchAssignments = async (signal) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/assignments`, 'GET', null, signal);
      if (res.ok) setAssignments(await res.json());
    } catch (error) { 
      if (error.name !== 'AbortError') showMessage('Error al cargar asignaciones', 'error'); 
    }
  };

  const fetchWorkShifts = async (signal) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/work-shifts`, 'GET', null, signal);
      if (res.ok) setWorkShifts(await res.json());
    } catch (error) { 
      if (error.name !== 'AbortError') showMessage('Error al cargar jornadas', 'error'); 
    }
  };

  const fetchUsers = async (signal) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/users`, 'GET', null, signal);
      if (res.ok) setUsers(await res.json());
    } catch (error) { 
      if (error.name !== 'AbortError') showMessage('Error al cargar usuarios', 'error'); 
    }
  };

  const fetchAttendances = async (signal) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/attendances?date=${attendanceDate}`, 'GET', null, signal);
      if (res.ok) setAttendances(await res.json());
    } catch (error) {
      if (error.name !== 'AbortError') showMessage('Error al cargar asistencias', 'error');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    
    fetchPositions(signal);
    fetchCashRegisters(signal);
    fetchAssignments(signal);
    fetchWorkShifts(signal);
    fetchUsers(signal);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === 'attendance') {
      fetchAttendances(controller.signal);
    }
    return () => controller.abort();
  }, [attendanceDate, activeTab]);

  // --- Quick Actions ---
  const handleToggleState = async (type, id, fetcher) => {
    try {
      const endpoint = type === 'workShifts' ? `work-shifts/${id}` : `${type}/${id}/toggle`;
      const method = type === 'workShifts' ? 'PUT' : 'PATCH';
      
      let body = undefined;
      if (type === 'workShifts') {
        const item = workShifts.find(w => w.id === id);
        body = { ...item, isActive: !item.isActive };
      }

      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/${endpoint}`, method, body);
      if (res.ok) {
        showMessage('Estado actualizado');
        fetcher();
      } else { 
        const err = await res.json();
        showMessage(err.message || 'Error al actualizar estado', 'error'); 
      }
    } catch { showMessage('Error de conexión', 'error'); }
  };

  const handleCheckIn = async (attendanceId) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/attendances/${attendanceId}/check-in`, 'POST');
      if (res.ok) {
        showMessage('Asistencia marcada correctamente');
        fetchAttendances();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al marcar asistencia', 'error');
      }
    } catch {
      showMessage('Error de conexión', 'error');
    }
  };

  const handleApproveAttendance = async (attendanceId, status) => {
    try {
      const res = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/attendances/${attendanceId}/approve`, 'PUT', { status });
      if (res.ok) {
        showMessage(`Asistencia ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}`);
        fetchAttendances();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al actualizar', 'error');
      }
    } catch {
      showMessage('Error de conexión', 'error');
    }
  };

  // Finalizar assignment was removed, we use handleToggleState

  // --- Deletion Handlers ---
  const executeDelete = async () => {
    if (!deleteConfirmation) return;
    const { type, item } = deleteConfirmation;
    
    let url = '';
    let refreshFn = null;
    
    if (type === 'position') { url = `${import.meta.env.VITE_API_BASE_URL}/positions/${item.id}`; refreshFn = fetchPositions; }
    if (type === 'cashRegister') { url = `${import.meta.env.VITE_API_BASE_URL}/cash-registers/${item.id}`; refreshFn = fetchCashRegisters; }
    if (type === 'assignment') { url = `${import.meta.env.VITE_API_BASE_URL}/assignments/${item.id}`; refreshFn = fetchAssignments; }
    if (type === 'workShift') { url = `${import.meta.env.VITE_API_BASE_URL}/work-shifts/${item.id}`; refreshFn = fetchWorkShifts; }

    try {
      const res = await apiCall(url, 'DELETE');
      if (res.ok) {
        showMessage('Eliminado permanentemente correctamente');
        refreshFn();
      } else {
        const err = await res.json();
        showMessage(err.message || 'Error al eliminar', 'error');
      }
    } catch {
      showMessage('Error de conexión', 'error');
    }
    setDeleteConfirmation(null);
  };

  // --- Forms Handlers ---
  const handleOpenPositionModal = (item = null) => {
    setEditingPosition(item);
    setPositionForm({ name: item?.name || '', description: item?.description || '' });
    setIsPositionModalOpen(true);
  };

  const handlePositionSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingPosition;
    const url = isEditing ? `${import.meta.env.VITE_API_BASE_URL}/positions/${editingPosition.id}` : `${import.meta.env.VITE_API_BASE_URL}/positions`;
    
    try {
      const res = await apiCall(url, isEditing ? 'PUT' : 'POST', positionForm);
      if (res.ok) {
        showMessage(`Puesto ${isEditing ? 'actualizado' : 'creado'} correctamente`);
        setIsPositionModalOpen(false);
        fetchPositions();
      } else {
        const err = await res.json();
        showMessage(err.message, 'error');
      }
    } catch (error) { showMessage('Error de conexión', 'error'); }
  };

  const handleOpenCashRegisterModal = (item = null) => {
    setEditingCashRegister(item);
    setCashRegisterForm({ name: item?.name || '', description: item?.description || '' });
    setIsCashRegisterModalOpen(true);
  };

  const handleCashRegisterSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingCashRegister;
    const url = isEditing ? `${import.meta.env.VITE_API_BASE_URL}/cash-registers/${editingCashRegister.id}` : `${import.meta.env.VITE_API_BASE_URL}/cash-registers`;
    
    try {
      const res = await apiCall(url, isEditing ? 'PUT' : 'POST', cashRegisterForm);
      if (res.ok) {
        showMessage(`Caja ${isEditing ? 'actualizada' : 'creada'} correctamente`);
        setIsCashRegisterModalOpen(false);
        fetchCashRegisters();
      } else {
        const err = await res.json();
        showMessage(err.message, 'error');
      }
    } catch (error) { showMessage('Error de conexión', 'error'); }
  };

  const handleOpenWorkShiftModal = (item = null) => {
    setEditingWorkShift(item);
    if (item) {
      setWorkShiftForm({
        name: item.name,
        description: item.description || '',
        observations: item.observations || '',
        color: item.color || '#10B981',
        startTime: formatTime(item.startTime),
        endTime: formatTime(item.endTime),
        breakStartTime: formatTime(item.breakStartTime),
        breakEndTime: formatTime(item.breakEndTime),
        toleranceMinutes: item.toleranceMinutes,
        monday: item.monday, tuesday: item.tuesday, wednesday: item.wednesday,
        thursday: item.thursday, friday: item.friday, saturday: item.saturday, sunday: item.sunday
      });
    } else {
      setWorkShiftForm(defaultWorkShiftForm);
    }
    setIsWorkShiftModalOpen(true);
  };

  const handleWorkShiftSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingWorkShift;
    const url = isEditing ? `${import.meta.env.VITE_API_BASE_URL}/work-shifts/${editingWorkShift.id}` : `${import.meta.env.VITE_API_BASE_URL}/work-shifts`;
    
    if (isEditing) {
      try {
        const impactRes = await apiCall(`${import.meta.env.VITE_API_BASE_URL}/work-shifts/${editingWorkShift.id}/impact`);
        if (impactRes.ok) {
          const impact = await impactRes.json();
          if (impact.count > 0) {
            if (!window.confirm(`Este cambio afectará automáticamente a ${impact.count} empleado(s) que utilizan esta jornada. ¿Deseas continuar?`)) {
              return;
            }
          }
        }
      } catch (e) {
        console.error("Error verificando impacto:", e);
      }
    }

    const payload = {
      ...workShiftForm,
      startTime: formatTimeFromInput(workShiftForm.startTime),
      endTime: formatTimeFromInput(workShiftForm.endTime),
      breakStartTime: formatTimeFromInput(workShiftForm.breakStartTime),
      breakEndTime: formatTimeFromInput(workShiftForm.breakEndTime)
    };
    
    try {
      const res = await apiCall(url, isEditing ? 'PUT' : 'POST', payload);
      if (res.ok) {
        showMessage(`Jornada ${isEditing ? 'actualizada' : 'creada'} correctamente`);
        setIsWorkShiftModalOpen(false);
        fetchWorkShifts();
      } else {
        const err = await res.json();
        showMessage(err.message, 'error');
      }
    } catch (error) { showMessage('Error de conexión', 'error'); }
  };

  const handleOpenAssignmentModal = (item = null) => {
    setEditingAssignment(item);
    setAssignmentForm({ 
      userId: item?.user?.id || '', 
      positionId: item?.position?.id || '', 
      cashRegisterId: item?.cashRegister?.id || '',
      workShiftId: item?.workShift?.id || '',
      extraPayForShift: item?.extraPayForShift || ''
    });
    setIsAssignmentModalOpen(true);
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingAssignment;
    const url = isEditing ? `${import.meta.env.VITE_API_BASE_URL}/assignments/${editingAssignment.id}` : `${import.meta.env.VITE_API_BASE_URL}/assignments`;
    
    try {
      const res = await apiCall(url, isEditing ? 'PUT' : 'POST', assignmentForm);
      if (res.ok) {
        showMessage(`Asignación ${isEditing ? 'actualizada' : 'creada'} correctamente`);
        setIsAssignmentModalOpen(false);
        fetchAssignments();
      } else {
        const err = await res.json();
        showMessage(err.message, 'error');
      }
    } catch (error) { showMessage('Error de conexión', 'error'); }
  };

  // --- Filtering & Counting Helpers ---
  const getFilteredList = (list) => {
    let filtered = list.filter(item => {
      if (filterStatus === 'ACTIVOS') return item.isActive;
      if (filterStatus === 'INACTIVOS') return !item.isActive;
      return true; // 'TODOS'
    });
    
    // Sort logic
    filtered.sort((a, b) => {
      let nameA = (a.name || (a.user ? a.user.fullName : '')).toLowerCase();
      let nameB = (b.name || (b.user ? b.user.fullName : '')).toLowerCase();

      if (sortOrder === 'NAME_ASC') return nameA.localeCompare(nameB);
      if (sortOrder === 'NAME_DESC') return nameB.localeCompare(nameA);
      if (sortOrder === 'NEWEST') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortOrder === 'OLDEST') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return 0;
    });

    return filtered;
  };

  const countStatus = (list) => {
    const active = list.filter(l => l.isActive).length;
    const inactive = list.length - active;
    return { active, inactive, all: list.length };
  };

  // Apply search term
  const searchedPositions = positions.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const searchedCashRegisters = cashRegisters.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const searchedAssignments = assignments.filter(a => 
    a.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.position.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const searchedWorkShifts = workShifts.filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Apply status filters
  const displayedPositions = getFilteredList(searchedPositions);
  const displayedCashRegisters = getFilteredList(searchedCashRegisters);
  const displayedAssignments = getFilteredList(searchedAssignments);
  const displayedWorkShifts = getFilteredList(searchedWorkShifts);

  // Count active/inactive for currently active tab
  const getCounts = () => {
    if (activeTab === 'positions') return countStatus(searchedPositions);
    if (activeTab === 'cashRegisters') return countStatus(searchedCashRegisters);
    if (activeTab === 'assignments') return countStatus(searchedAssignments);
    if (activeTab === 'workShifts') return countStatus(searchedWorkShifts);
    return { active: 0, inactive: 0, all: 0 };
  };
  const counts = getCounts();

  const colors = [
    { value: '#10B981', label: '🟢 Verde' },
    { value: '#3B82F6', label: '🔵 Azul' },
    { value: '#F59E0B', label: '🟠 Naranja' },
    { value: '#8B5CF6', label: '🟣 Morado' },
    { value: '#EF4444', label: '🔴 Rojo' },
    { value: '#6B7280', label: '⚫ Gris' }
  ];
  // Pagination for attendances
  const itemsPerPage = 30;
  const totalAttendancePages = Math.ceil(attendances.length / itemsPerPage);
  const paginatedAttendances = attendances.slice((attendancePage - 1) * itemsPerPage, attendancePage * itemsPerPage);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Gestión de Personal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configura puestos, jornadas, cajas y asignaciones</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {activeTab === 'positions' && businessRole === 'CEO' && <button className="btn" onClick={() => handleOpenPositionModal()}>+ Agregar Puesto</button>}
          {activeTab === 'cashRegisters' && businessRole === 'CEO' && <button className="btn" onClick={() => handleOpenCashRegisterModal()}>+ Agregar Caja</button>}
          {activeTab === 'assignments' && businessRole !== 'EMPLEADO' && <button className="btn" onClick={() => handleOpenAssignmentModal()}>+ Asignar Personal</button>}
          {activeTab === 'workShifts' && businessRole === 'CEO' && <button className="btn" onClick={() => handleOpenWorkShiftModal()}>+ Nueva Jornada</button>}
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
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <button 
          onClick={() => { setActiveTab('assignments'); setSearchTerm(''); }}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'assignments' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'assignments' ? 'bold' : 'normal', color: activeTab === 'assignments' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >Asignaciones</button>
        
        {businessRole === 'CEO' && (
          <>
            <button 
              onClick={() => { setActiveTab('workShifts'); setSearchTerm(''); }}
              style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'workShifts' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'workShifts' ? 'bold' : 'normal', color: activeTab === 'workShifts' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >Jornadas (Turnos)</button>
            <button 
              onClick={() => { setActiveTab('positions'); setSearchTerm(''); }}
              style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'positions' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'positions' ? 'bold' : 'normal', color: activeTab === 'positions' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >Puestos</button>
            <button 
              onClick={() => { setActiveTab('cashRegisters'); setSearchTerm(''); }}
              style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'cashRegisters' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'cashRegisters' ? 'bold' : 'normal', color: activeTab === 'cashRegisters' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >Cajas</button>
          </>
        )}
        <button 
          onClick={() => { setActiveTab('attendance'); setSearchTerm(''); }}
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'attendance' ? '2px solid var(--primary)' : 'none', fontSize: '1.2rem', fontWeight: activeTab === 'attendance' ? 'bold' : 'normal', color: activeTab === 'attendance' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >Asistencia</button>
      </div>

      {activeTab === 'attendance' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Control de Asistencia</h2>
            <input 
              type="date" 
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
            />
          </div>
          
          <div className="table-responsive">
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empleado</th>
                  <th>Puesto</th>
                  <th>Turno (Horario)</th>
                  <th>Hora de Llegada</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAttendances.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No hay turnos asignados para esta fecha.</td></tr>
                ) : (
                  paginatedAttendances.map(a => {
                    const shift = a.assignment.workShift;
                    let statusLabel = '';
                    let statusColor = '';
                    switch(a.status) {
                      case 'PENDING_CHECK_IN': statusLabel = 'Por Marcar'; statusColor = '#9CA3AF'; break; // Gray
                      case 'PENDING_APPROVAL': statusLabel = 'Pendiente'; statusColor = '#F59E0B'; break; // Orange
                      case 'APPROVED': statusLabel = 'Aprobado'; statusColor = '#10B981'; break; // Green
                      case 'REJECTED': statusLabel = 'Rechazado'; statusColor = '#EF4444'; break; // Red
                      case 'ABSENT': statusLabel = 'Ausente'; statusColor = '#EF4444'; break; // Red
                      default: statusLabel = a.status; statusColor = '#9CA3AF'; break;
                    }

                    const isMyAttendance = a.user.username === localStorage.getItem('username');

                    return (
                      <tr key={a.id}>
                        <td>{new Date(a.date).toISOString().split('T')[0]}</td>
                        <td>{a.user.fullName}</td>
                        <td>{a.assignment.position.name}</td>
                        <td>{shift ? `${shift.name} (${formatTime(shift.startTime)} - ${formatTime(shift.endTime)})` : 'N/A'}</td>
                        <td>
                          {a.checkInTime ? formatTime(a.checkInTime) : '-'}
                          {a.notes && <div style={{ fontSize: '0.8rem', color: '#EF4444' }}>{a.notes}</div>}
                        </td>
                        <td>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
                            backgroundColor: `${statusColor}20`, color: statusColor
                          }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td>
                          {isMyAttendance && a.status === 'PENDING_CHECK_IN' && (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              onClick={() => handleCheckIn(a.id)}
                            >
                              Marcar mi Asistencia
                            </button>
                          )}
                          
                          {(businessRole === 'CEO') && a.status === 'PENDING_APPROVAL' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                onClick={() => handleApproveAttendance(a.id, 'APPROVED')}
                              >Aprobar</button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--error)', borderColor: 'var(--error)' }}
                                onClick={() => handleApproveAttendance(a.id, 'REJECTED')}
                              >Rechazar</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Controles de paginación */}
          {totalAttendancePages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', paddingBottom: '1rem' }}>
              <button 
                onClick={() => setAttendancePage(1)} 
                disabled={attendancePage === 1}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: attendancePage === 1 ? 'var(--bg-secondary)' : 'white', cursor: attendancePage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', minWidth: '36px' }}
              >
                &lt;&lt;
              </button>
              <button 
                onClick={() => setAttendancePage(p => Math.max(1, p - 1))} 
                disabled={attendancePage === 1}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: attendancePage === 1 ? 'var(--bg-secondary)' : 'white', cursor: attendancePage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', minWidth: '36px' }}
              >
                &lt;
              </button>
              
              {/* Páginas numeradas */}
              {Array.from({ length: totalAttendancePages }, (_, i) => i + 1).map(pageNum => {
                // Mostrar siempre la primera, la última, la actual, y las adyacentes a la actual
                if (
                  pageNum === 1 || 
                  pageNum === totalAttendancePages || 
                  (pageNum >= attendancePage - 1 && pageNum <= attendancePage + 1)
                ) {
                  return (
                    <button 
                      key={pageNum}
                      onClick={() => setAttendancePage(pageNum)}
                      style={{ 
                        padding: '0.5rem', 
                        borderRadius: '4px', 
                        border: '1px solid',
                        borderColor: attendancePage === pageNum ? 'var(--primary)' : 'var(--border-color)', 
                        backgroundColor: attendancePage === pageNum ? 'var(--primary)' : 'white', 
                        color: attendancePage === pageNum ? 'white' : 'var(--text-main)',
                        cursor: 'pointer',
                        fontWeight: attendancePage === pageNum ? 'bold' : 'normal',
                        minWidth: '36px'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === attendancePage - 2 || 
                  pageNum === attendancePage + 2
                ) {
                  return <span key={pageNum} style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>...</span>;
                }
                return null;
              })}

              <button 
                onClick={() => setAttendancePage(p => Math.min(totalAttendancePages, p + 1))} 
                disabled={attendancePage === totalAttendancePages}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: attendancePage === totalAttendancePages ? 'var(--bg-secondary)' : 'white', cursor: attendancePage === totalAttendancePages ? 'not-allowed' : 'pointer', fontWeight: 'bold', minWidth: '36px' }}
              >
                &gt;
              </button>
              <button 
                onClick={() => setAttendancePage(totalAttendancePages)} 
                disabled={attendancePage === totalAttendancePages}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: attendancePage === totalAttendancePages ? 'var(--bg-secondary)' : 'white', cursor: attendancePage === totalAttendancePages ? 'not-allowed' : 'pointer', fontWeight: 'bold', minWidth: '36px' }}
              >
                &gt;&gt;
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab !== 'attendance' && (
        <>
          {/* Dashboard Cards */}
          <div className="dashboard-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="dashboard-card">
              <h3>Total Creados</h3>
              <p className="number" style={{ color: 'var(--text-main)' }}>{counts.all}</p>
            </div>
            <div className="dashboard-card">
              <h3>Activos</h3>
              <p className="number" style={{ color: 'var(--success)' }}>{counts.active}</p>
            </div>
            <div className="dashboard-card">
              <h3>Inactivos</h3>
              <p className="number" style={{ color: 'var(--error)' }}>{counts.inactive}</p>
            </div>
          </div>

          {/* Filtering Options */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', flex: 1 }}>
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
                <option value="ACTIVOS">Disponibles / Activos</option>
                <option value="INACTIVOS">No disponibles / Inactivos</option>
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
              </select>
            </div>
          </div>

          {/* Tab Content: Positions */}
          {activeTab === 'positions' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
                </thead>
                <tbody>
                  {displayedPositions.map(item => (
                    <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>{item.isActive ? <span className="badge badge-success">Activo</span> : <span className="badge badge-error">Inactivo</span>}</td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={() => {
                            setDetailsPosition(item);
                            setIsPositionDetailsModalOpen(true);
                          }}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Detalles
                        </button>
                        <button 
                          onClick={() => handleOpenPositionModal(item)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleToggleState('positions', item.id, fetchPositions)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: item.isActive ? '#FFF7ED' : '#F0FDF4', color: item.isActive ? '#EA580C' : '#16A34A', border: `1px solid ${item.isActive ? '#FED7AA' : '#BBF7D0'}`, borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {item.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        {businessRole === 'CEO' && (
                          <button 
                            onClick={() => setDeleteConfirmation({ type: 'position', item })}
                            style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedPositions.length === 0 && <tr><td colSpan="4" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No hay puestos registrados en este estado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab Content: Cash Registers */}
          {activeTab === 'cashRegisters' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
                </thead>
                <tbody>
                  {displayedCashRegisters.map(item => (
                    <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>{item.isActive ? <span className="badge badge-success">Activa</span> : <span className="badge badge-error">Inactiva</span>}</td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={() => {
                            setDetailsCashRegister(item);
                            setIsCashRegisterDetailsModalOpen(true);
                          }}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Detalles
                        </button>
                        <button 
                          onClick={() => handleOpenCashRegisterModal(item)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleToggleState('cash-registers', item.id, fetchCashRegisters)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: item.isActive ? '#FFF7ED' : '#F0FDF4', color: item.isActive ? '#EA580C' : '#16A34A', border: `1px solid ${item.isActive ? '#FED7AA' : '#BBF7D0'}`, borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {item.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        {businessRole === 'CEO' && (
                          <button 
                            onClick={() => setDeleteConfirmation({ type: 'cashRegister', item })}
                            style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedCashRegisters.length === 0 && <tr><td colSpan="4" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No hay cajas registradas en este estado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab Content: Work Shifts */}
          {activeTab === 'workShifts' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Jornada</th><th>Días</th><th>Horario</th><th>Duración</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
                </thead>
                <tbody>
                  {displayedWorkShifts.map(item => (
                    <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.6 }}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: item.color || '#10B981', display: 'inline-block' }}></span>
                          {item.name}
                        </div>
                      </td>
                      <td>{getDaysString(item)}</td>
                      <td>{formatTime(item.startTime)} – {formatTime(item.endTime)}</td>
                      <td>{calculateDuration(item.startTime, item.endTime, item.breakStartTime, item.breakEndTime)}</td>
                      <td>{item.isActive ? <span className="badge badge-success">Activa</span> : <span className="badge badge-error">Inactiva</span>}</td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={() => {
                            setDetailsWorkShift(item);
                            setIsWorkShiftDetailsModalOpen(true);
                          }}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Detalles
                        </button>
                        <button 
                          onClick={() => handleOpenWorkShiftModal(item)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleToggleState('workShifts', item.id, fetchWorkShifts)}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: item.isActive ? '#FFF7ED' : '#F0FDF4', color: item.isActive ? '#EA580C' : '#16A34A', border: `1px solid ${item.isActive ? '#FED7AA' : '#BBF7D0'}`, borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {item.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmation({ type: 'workShift', item })}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {displayedWorkShifts.length === 0 && <tr><td colSpan="6" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No hay jornadas registradas en este estado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab Content: Assignments */}
          {activeTab === 'assignments' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Puesto</th>
                    <th>Jornada Asignada</th>
                    {businessRole !== 'EMPLEADO' && businessRole !== 'GERENTE' && <th>Pago Extra</th>}
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAssignments.map(item => (
                    <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.6 }}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.user.fullName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{item.user.username}</div>
                      </td>
                      <td>{item.position.name}</td>
                      <td>
                        {item.workShift ? (
                          <div>
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                              padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--background-color)', 
                              border: '1px solid var(--border-color)', fontSize: '0.9rem' 
                            }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.workShift.color || '#10B981' }}></span>
                              {item.workShift.name} ({formatTime(item.workShift.startTime)}-{formatTime(item.workShift.endTime)})
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Sin jornada fija</span>
                        )}
                      </td>
                      
                      {businessRole !== 'EMPLEADO' && businessRole !== 'GERENTE' && (
                        <td>
                          {item.extraPayForShift ? (
                            <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                              +Bs. {Number(item.extraPayForShift).toFixed(2)}
                            </div>
                          ) : '-'}
                        </td>
                      )}
                      
                      <td>
                        {item.isActive ? <span className="badge badge-success">Activo</span> : <span className="badge badge-error">Inactivo</span>}
                      </td>
                      
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button 
                          onClick={() => {
                            setDetailsAssignment(item);
                            setIsAssignmentDetailsModalOpen(true);
                          }}
                          style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Detalles
                        </button>
                        {businessRole !== 'EMPLEADO' && (
                          <>
                            <button 
                              onClick={() => handleOpenAssignmentModal(item)}
                              style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleToggleState('assignments', item.id, fetchAssignments)}
                              style={{ padding: '0.5rem 0.75rem', backgroundColor: item.isActive ? '#FFF7ED' : '#F0FDF4', color: item.isActive ? '#EA580C' : '#16A34A', border: `1px solid ${item.isActive ? '#FED7AA' : '#BBF7D0'}`, borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                              {item.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                            {businessRole === 'CEO' && (
                              <button 
                                onClick={() => setDeleteConfirmation({ type: 'assignment', item })}
                                style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                              >
                                Eliminar
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedAssignments.length === 0 && <tr><td colSpan="6" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No hay asignaciones en este estado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* --- MODALS --- */}
      
      {/* Position Form Modal */}
      {isPositionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingPosition ? 'Editar Puesto' : 'Nuevo Puesto'}</h2>
              <button onClick={() => setIsPositionModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handlePositionSubmit}>
              <div className="form-group">
                <label>Nombre del Puesto *</label>
                <input required value={positionForm.name} onChange={e => setPositionForm({...positionForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea 
                  value={positionForm.description} 
                  onChange={e => setPositionForm({...positionForm, description: e.target.value})} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPositionModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Register Form Modal */}
      {isCashRegisterModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingCashRegister ? 'Editar Caja' : 'Nueva Caja'}</h2>
              <button onClick={() => setIsCashRegisterModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleCashRegisterSubmit}>
              <div className="form-group">
                <label>Nombre de la Caja *</label>
                <input required value={cashRegisterForm.name} onChange={e => setCashRegisterForm({...cashRegisterForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea 
                  value={cashRegisterForm.description} 
                  onChange={e => setCashRegisterForm({...cashRegisterForm, description: e.target.value})} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCashRegisterModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WorkShift Form Modal */}
      {isWorkShiftModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingWorkShift ? 'Editar Jornada' : 'Nueva Jornada'}</h2>
              <button onClick={() => setIsWorkShiftModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleWorkShiftSubmit}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Nombre de la Jornada *</label>
                  <input required value={workShiftForm.name} onChange={e => setWorkShiftForm({...workShiftForm, name: e.target.value})} placeholder="Ej. Turno Mañana" />
                </div>
                <div className="form-group">
                  <label>Color (Badge)</label>
                  <select value={workShiftForm.color} onChange={e => setWorkShiftForm({...workShiftForm, color: e.target.value})}>
                    {colors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Días de la semana *</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {[
                    { key: 'monday', label: 'Lun' }, { key: 'tuesday', label: 'Mar' },
                    { key: 'wednesday', label: 'Mié' }, { key: 'thursday', label: 'Jue' },
                    { key: 'friday', label: 'Vie' }, { key: 'saturday', label: 'Sáb' },
                    { key: 'sunday', label: 'Dom' }
                  ].map(day => (
                    <label key={day.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={workShiftForm[day.key]} onChange={e => setWorkShiftForm({...workShiftForm, [day.key]: e.target.checked})} />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '6px', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Hora de Entrada *</label>
                  <input type="time" required value={workShiftForm.startTime} onChange={e => setWorkShiftForm({...workShiftForm, startTime: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Hora de Salida *</label>
                  <input type="time" required value={workShiftForm.endTime} onChange={e => setWorkShiftForm({...workShiftForm, endTime: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', backgroundColor: 'var(--background-color)', borderRadius: '6px', marginBottom: '1rem', border: '1px dashed var(--border-color)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Inicio Descanso (Opcional)</label>
                  <input type="time" value={workShiftForm.breakStartTime} onChange={e => setWorkShiftForm({...workShiftForm, breakStartTime: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Fin Descanso (Opcional)</label>
                  <input type="time" value={workShiftForm.breakEndTime} onChange={e => setWorkShiftForm({...workShiftForm, breakEndTime: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Tolerancia (Mins)</label>
                  <input type="number" min="0" max="60" value={workShiftForm.toleranceMinutes} onChange={e => setWorkShiftForm({...workShiftForm, toleranceMinutes: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '0.5rem' }}>
                  <div style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                    Duración calculada: {calculateDuration(`1970-01-01T${workShiftForm.startTime}:00Z`, `1970-01-01T${workShiftForm.endTime}:00Z`, workShiftForm.breakStartTime ? `1970-01-01T${workShiftForm.breakStartTime}:00Z` : null, workShiftForm.breakEndTime ? `1970-01-01T${workShiftForm.breakEndTime}:00Z` : null) || '0h'}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <input type="text" value={workShiftForm.description} onChange={e => setWorkShiftForm({...workShiftForm, description: e.target.value})} placeholder="Ej. Horario habitual de cocina" />
              </div>
              
              <div className="form-group">
                <label>Observaciones</label>
                <textarea 
                  value={workShiftForm.observations} 
                  onChange={e => setWorkShiftForm({...workShiftForm, observations: e.target.value})} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'inherit' }} 
                  placeholder="Ej. Debe llegar 15 minutos antes"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsWorkShiftModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Form Modal */}
      {isAssignmentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editingAssignment ? 'Editar Asignación' : 'Nueva Asignación'}</h2>
              <button onClick={() => setIsAssignmentModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleAssignmentSubmit}>
              <div className="form-group">
                <label>Usuario / Empleado *</label>
                <select required value={assignmentForm.userId} onChange={e => setAssignmentForm({...assignmentForm, userId: e.target.value})}>
                  <option value="" disabled>Seleccione un usuario</option>
                  {users.filter(u => u.isActive || u.id === editingAssignment?.user?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} (@{u.username}) - {u.role === 'CEO' ? 'Administrador' : u.role === 'GERENTE' ? 'Encargado' : u.role === 'EMPLEADO' ? 'Personal' : u.role}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Puesto *</label>
                <select required value={assignmentForm.positionId} onChange={e => setAssignmentForm({...assignmentForm, positionId: e.target.value})}>
                  <option value="" disabled>Seleccione un puesto</option>
                  {positions.filter(p => p.isActive || p.id === editingAssignment?.position?.id).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Jornada (Opcional)</label>
                <select value={assignmentForm.workShiftId || ""} onChange={e => setAssignmentForm({...assignmentForm, workShiftId: e.target.value || null})}>
                  <option value="">Sin jornada fija / Rotativo</option>
                  {workShifts.filter(w => w.isActive || w.id === editingAssignment?.workShift?.id).map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({formatTime(w.startTime)} - {formatTime(w.endTime)})</option>
                  ))}
                </select>
              </div>
              {businessRole !== 'GERENTE' && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Pago Extra por Turno/Reemplazo (Bs) (Opcional)</label>
                  <input type="number" step="0.01" min="0" value={assignmentForm.extraPayForShift} onChange={e => setAssignmentForm({...assignmentForm, extraPayForShift: e.target.value})} placeholder="Ej. 50.00" />
                  <small style={{ color: 'var(--text-muted)' }}>Monto adicional que se suma al salario base en cada cálculo.</small>
                </div>
              )}
              
              <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label>Caja Asignada (Opcional)</label>
                <select value={assignmentForm.cashRegisterId} onChange={e => setAssignmentForm({...assignmentForm, cashRegisterId: e.target.value})}>
                  <option value="">Ninguna</option>
                  {cashRegisters.filter(c => c.isActive || c.id === editingAssignment?.cashRegister?.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAssignmentModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash Register Details Modal */}
      {isCashRegisterDetailsModalOpen && detailsCashRegister && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Detalles de la Caja</h2>
              <button onClick={() => setIsCashRegisterDetailsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Nombre</h4>
                <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>{detailsCashRegister.name}</p>
              </div>
              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Descripción General</h4>
                <p>{detailsCashRegister.description || <span style={{ color: 'var(--text-muted)' }}>Sin descripción registrada.</span>}</p>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsCashRegisterDetailsModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Position Details Modal */}
      {isPositionDetailsModalOpen && detailsPosition && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Detalles del Puesto</h2>
              <button onClick={() => setIsPositionDetailsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Nombre</h4>
                <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>{detailsPosition.name}</p>
              </div>
              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Descripción General</h4>
                <p>{detailsPosition.description || <span style={{ color: 'var(--text-muted)' }}>Sin descripción registrada.</span>}</p>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsPositionDetailsModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* WorkShift Details Modal */}
      {isWorkShiftDetailsModalOpen && detailsWorkShift && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Detalles de Jornada</h2>
              <button onClick={() => setIsWorkShiftDetailsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ marginTop: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Nombre</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '1.1rem' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: detailsWorkShift.color || '#10B981', display: 'inline-block' }}></span>
                  {detailsWorkShift.name}
                </div>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Descripción</h4>
                <p style={{ margin: 0 }}>{detailsWorkShift.description || <span style={{ color: 'var(--text-muted)' }}>Sin descripción registrada.</span>}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Días Laborables</h4>
                  <p style={{ margin: 0, fontWeight: 500 }}>{getFullDaysString(detailsWorkShift)}</p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Horario</h4>
                  <p style={{ margin: 0, fontWeight: 500 }}>{formatTime(detailsWorkShift.startTime)} – {formatTime(detailsWorkShift.endTime)}</p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Tolerancia</h4>
                  <p style={{ margin: 0, fontWeight: 500 }}>{detailsWorkShift.toleranceMinutes != null ? detailsWorkShift.toleranceMinutes : 0} min</p>
                </div>
              </div>

              {detailsWorkShift.breakStartTime && detailsWorkShift.breakEndTime && (
                <div style={{ backgroundColor: '#F9FAFB', padding: '1rem', borderRadius: '6px', border: '1px dashed #D1D5DB' }}>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Horario de Descanso</h4>
                  <p style={{ margin: 0, fontWeight: 500 }}>{formatTime(detailsWorkShift.breakStartTime)} – {formatTime(detailsWorkShift.breakEndTime)}</p>
                </div>
              )}

              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Observaciones Especiales</h4>
                <div style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '1rem', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                  {detailsWorkShift.observations || <span style={{ opacity: 0.7 }}>Sin observaciones registradas.</span>}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsWorkShiftDetailsModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Details Modal */}
      {isAssignmentDetailsModalOpen && detailsAssignment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Ficha de Asignación Completa</h2>
              <button onClick={() => setIsAssignmentDetailsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ marginTop: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Empleado */}
              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Empleado</h4>
                <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{detailsAssignment.user.fullName} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'normal' }}>@{detailsAssignment.user.username}</span></div>
              </div>

              {/* Puesto */}
              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Rol / Puesto</h4>
                <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{detailsAssignment.position.name}</div>
                <div style={{ marginTop: '0.25rem' }}>{detailsAssignment.position.description || <span style={{ color: 'var(--text-muted)' }}>Sin descripción de puesto.</span>}</div>
              </div>

              {/* Caja Asignada */}
              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Caja Asignada</h4>
                {detailsAssignment.cashRegister ? (
                  <>
                    <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{detailsAssignment.cashRegister.name}</div>
                    <div style={{ marginTop: '0.25rem' }}>{detailsAssignment.cashRegister.description || <span style={{ color: 'var(--text-muted)' }}>Sin descripción de caja.</span>}</div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Sin caja asignada.</div>
                )}
              </div>

              {/* Jornada */}
              <div>
                <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Jornada Laboral</h4>
                {detailsAssignment.workShift ? (
                  <div style={{ backgroundColor: 'var(--background-color)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: detailsAssignment.workShift.color || '#10B981', display: 'inline-block' }}></span>
                      {detailsAssignment.workShift.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <div style={{ gridColumn: 'span 2' }}><strong>Días:</strong> {getFullDaysString(detailsAssignment.workShift)}</div>
                      <div><strong>Horario:</strong> {formatTime(detailsAssignment.workShift.startTime)} – {formatTime(detailsAssignment.workShift.endTime)}</div>
                      <div><strong>Tolerancia:</strong> {detailsAssignment.workShift.toleranceMinutes != null ? detailsAssignment.workShift.toleranceMinutes : 0} min</div>
                      {detailsAssignment.workShift.breakStartTime && <div><strong>Descanso:</strong> {formatTime(detailsAssignment.workShift.breakStartTime)} – {formatTime(detailsAssignment.workShift.breakEndTime)}</div>}
                    </div>
                    {detailsAssignment.workShift.observations && (
                      <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '4px', fontSize: '0.85rem' }}>
                        <strong>Obs:</strong> {detailsAssignment.workShift.observations}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Sin jornada fija asignada.</div>
                )}
              </div>
              
              {/* Extra Pay */}
              {businessRole !== 'EMPLEADO' && businessRole !== 'GERENTE' && (
                <div>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Compensación Extra por Jornada</h4>
                  {detailsAssignment.extraPayForShift ? (
                    <div style={{ fontWeight: 500, color: 'var(--success)', fontSize: '1.1rem' }}>+Bs. {Number(detailsAssignment.extraPayForShift).toFixed(2)}</div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>No aplica bono extra.</div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsAssignmentDetailsModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, color: 'var(--error)' }}>
                {deleteConfirmation.type === 'position' && 'Eliminar puesto'}
                {deleteConfirmation.type === 'cashRegister' && 'Eliminar caja'}
                {deleteConfirmation.type === 'workShift' && 'Eliminar jornada'}
                {deleteConfirmation.type === 'assignment' && 'Eliminar asignación'}
              </h2>
              <button onClick={() => setDeleteConfirmation(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-color)' }}>
                {deleteConfirmation.type === 'position' && `"${deleteConfirmation.item.name}"`}
                {deleteConfirmation.type === 'cashRegister' && `"${deleteConfirmation.item.name}"`}
                {deleteConfirmation.type === 'workShift' && `"${deleteConfirmation.item.name}"`}
                {deleteConfirmation.type === 'assignment' && `${deleteConfirmation.item.user.fullName} → ${deleteConfirmation.item.position.name}`}
              </div>
              
              {deleteConfirmation.type === 'position' && <p>Esta acción eliminará el puesto permanentemente.</p>}
              {deleteConfirmation.type === 'cashRegister' && <p>Nunca registró ventas. Puede eliminarse de forma segura.</p>}
              {deleteConfirmation.type === 'workShift' && <p>Esta acción eliminará la jornada permanentemente. No podrá recuperarse.</p>}
              {deleteConfirmation.type === 'assignment' && <p>Esta asignación nunca generó registros posteriores. Puede eliminarse.</p>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmation(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={executeDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Personal;
