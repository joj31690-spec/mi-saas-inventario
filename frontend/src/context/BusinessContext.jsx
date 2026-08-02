import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const BusinessContext = createContext();

export const useBusiness = () => {
  return useContext(BusinessContext);
};

export const BusinessProvider = ({ children }) => {
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Fase 5: Restaurar de localStorage y validar con backend
    const storedBusiness = localStorage.getItem('selectedBusiness');
    if (storedBusiness) {
      try {
        const parsed = JSON.parse(storedBusiness);
        
        // Verificamos vigencia contra el backend usando el token actual
        // El interceptor de Axios ya va a inyectar el X-Business-Id porque ya existe en el estado local temporalmente
        // pero necesitamos forzar un chequeo
        const validateSession = async () => {
          try {
            // Pasamos manualmente el header en caso de que el interceptor necesite que esté montado el estado
            const res = await api.get('/businesses/current', {
              headers: { 'X-Business-Id': parsed.id }
            });
            // Si funciona, actualizamos el estado completo por si cambió algo (nombre, rol, logo)
            setSelectedBusiness(res.data);
            localStorage.setItem('selectedBusiness', JSON.stringify(res.data));
          } catch (error) {
            console.error('Sesión de negocio inválida:', error);
            clearBusiness();
          } finally {
            setIsLoading(false);
          }
        };

        validateSession();
      } catch (e) {
        console.error('Error parseando localStorage:', e);
        clearBusiness();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const selectBusiness = (business) => {
    setSelectedBusiness(business);
    localStorage.setItem('selectedBusiness', JSON.stringify(business));
    navigate('/admin'); // Transición sin recarga de página (SPA)
  };

  const clearBusiness = () => {
    if (selectedBusiness) {
      localStorage.setItem('lastUsedBusinessId', selectedBusiness.id);
    }
    setSelectedBusiness(null);
    localStorage.removeItem('selectedBusiness');
    if (location.pathname.startsWith('/admin')) {
      navigate('/businesses');
    }
  };

  const reloadCurrentBusiness = async () => {
    if (!selectedBusiness) return;
    try {
      const res = await api.get('/businesses/current', {
        headers: { 'X-Business-Id': selectedBusiness.id }
      });
      setSelectedBusiness(res.data);
      localStorage.setItem('selectedBusiness', JSON.stringify(res.data));
    } catch (error) {
      console.error('Error re-cargando el negocio actual', error);
      if (error.response && (error.response.status === 401 || error.response.status === 403 || error.response.status === 404)) {
        clearBusiness();
      }
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        selectedBusiness,
        selectBusiness,
        clearBusiness,
        reloadCurrentBusiness,
        isLoading
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};
