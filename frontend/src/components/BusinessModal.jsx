import React, { useState, useEffect } from 'react';
import LogoDisplay from './LogoDisplay';
import ImageUploader from './ImageUploader';

function BusinessModal({ isOpen, onClose, onSave, initialData = null }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setImageFile(null); // Reset file
    } else {
      setName('');
      setDescription('');
      setImageFile(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    
    if (imageFile === 'REMOVE') {
      formData.append('removeImage', 'true');
    } else if (imageFile) {
      formData.append('image', imageFile);
    }

    // Call onSave which in BusinessSelection will call api.post or api.put with formData
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: 0 }}>{initialData ? 'Editar Negocio' : 'Crear Negocio'}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <ImageUploader 
            initialImage={initialData?.logo}
            onImageChange={setImageFile}
          />

          <div className="form-group">
            <label>Nombre del Negocio *</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Burger House" />
          </div>
          
          <div className="form-group">
            <label>Descripción</label>
            <textarea rows="2" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Hamburguesas artesanales" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BusinessModal;
