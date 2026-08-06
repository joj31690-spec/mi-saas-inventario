import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../utils/fetcher';

function AdminDashboard() {
  const navigate = useNavigate();
  const business = JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
  const businessRole = business.role || 'EMPLEADO';

  const defaultStats = {
    pendingAttendancesCount: 0,
    hasActiveAssignment: false,
    myTodayAttendance: null,
    activeShiftSales: { total: 0, count: 0 },
    staffAssignedToday: 0,
    staffCheckedInToday: 0
  };

  const { data: stats = defaultStats } = useSWR(
    `${import.meta.env.VITE_API_BASE_URL}/analytics/dashboard`,
    fetcher,
    { refreshInterval: 5000, fallbackData: defaultStats }
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Inicio</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Centro de Comando Operativo</p>
      
      {/* 1. Alerta de Asistencias Pendientes (Solo CEO) */}
      {businessRole === 'CEO' && stats.pendingAttendancesCount > 0 && (
        <div style={{ 
          backgroundColor: '#FFFBEB', 
          borderLeft: '4px solid #F59E0B', 
          padding: '1.5rem', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#B45309' }}>Asistencias Pendientes</h3>
            <p style={{ margin: 0, color: '#92400E' }}>Hay {stats.pendingAttendancesCount} asistencia(s) pendiente(s) de aprobación.</p>
          </div>
          <button 
            className="btn btn-primary"
            style={{ backgroundColor: '#F59E0B', borderColor: '#F59E0B' }}
            onClick={() => navigate('/admin/personal')}
          >
            Revisar Asistencias
          </button>
        </div>
      )}

      {/* 2. Mi Asistencia Rápida (Para Empleados/Usuarios que deben marcar) */}
      {stats.hasActiveAssignment && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827' }}>Mi Asistencia de Hoy</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {stats.myTodayAttendance 
                ? `Estado actual: ${stats.myTodayAttendance.status === 'APPROVED' ? 'Aprobado' : stats.myTodayAttendance.status === 'PENDING_APPROVAL' ? 'Pendiente' : stats.myTodayAttendance.status === 'REJECTED' ? 'Rechazado' : 'Por Marcar'}`
                : 'No has marcado tu llegada hoy o no tienes turno asignado.'}
            </p>
          </div>
          {(() => {
            let canCheckIn = true;
            if (stats.myTodayAttendance?.status === 'PENDING_CHECK_IN' && stats.myTodayAttendance?.assignment?.workShift?.startTime && stats.myTodayAttendance?.date) {
              const now = new Date();
              const dateStr = stats.myTodayAttendance.date.split('T')[0];
              const [year, month, day] = dateStr.split('-');
              const shiftHours = new Date(stats.myTodayAttendance.assignment.workShift.startTime).getUTCHours();
              const shiftMinutes = new Date(stats.myTodayAttendance.assignment.workShift.startTime).getUTCMinutes();
              
              const targetDate = new Date(year, month - 1, day, shiftHours, shiftMinutes, 0, 0);
              const diffMinutes = (now.getTime() - targetDate.getTime()) / 60000;
              canCheckIn = diffMinutes >= -15;
            }

            if (stats.myTodayAttendance && stats.myTodayAttendance.status !== 'PENDING_CHECK_IN') {
              return (
                <button className="btn btn-primary" onClick={() => navigate('/admin/personal')}>
                  Ver mis Asistencias
                </button>
              );
            }

            if (canCheckIn) {
              return (
                <button className="btn btn-primary" onClick={() => navigate('/admin/personal')}>
                  Marcar mi Asistencia
                </button>
              );
            }

            return (
              <button className="btn btn-secondary" onClick={() => navigate('/admin/personal')}>
                Aún no es hora
              </button>
            );
          })()}
        </div>
      )}

      {/* 3. Tarjetas Resumen Útiles del Turno */}
      <h3 style={{ marginBottom: '1rem' }}>Métricas del Turno Activo</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Personal en Local Hoy */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#6B7280' }}>Personal en Local (Turno)</h4>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827' }}>{stats.staffCheckedInToday}</span>
            <span style={{ fontSize: '1.2rem', color: '#6B7280' }}>/ {stats.staffAssignedToday}</span>
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            empleados han marcado asistencia en el turno actual
          </p>
        </div>

        {/* Ventas del Turno Activo */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E5E7EB', borderLeft: '4px solid #10B981' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#6B7280' }}>Ventas del Turno Activo</h4>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827' }}>
              Bs. {Number(stats.activeShiftSales.total).toFixed(2)}
            </span>
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Acumulado de {stats.activeShiftSales.count} venta(s) desde el inicio del turno
          </p>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;
