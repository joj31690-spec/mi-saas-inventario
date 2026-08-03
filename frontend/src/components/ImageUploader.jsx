import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';

const ImageUploader = ({ initialImage, onImageChange, disabled }) => {
  const [preview, setPreview] = useState(initialImage || null);
  const fileInputRef = useRef(null);

  // Cropper states
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [fileContext, setFileContext] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
    // reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processFile = (file) => {
    if (!file.type.match('image.*')) {
      alert('Por favor selecciona una imagen válida.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen excede el límite de 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setFileContext(file);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropCancel = (e) => {
    e.preventDefault();
    setImageSrc(null);
    setFileContext(null);
  };

  const handleCropConfirm = async (e) => {
    e.preventDefault();
    if (!imageSrc || !croppedAreaPixels) return;

    const image = new Image();
    image.src = imageSrc;
    await new Promise(resolve => image.onload = resolve);
    
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 600;
    const MAX_HEIGHT = 600;
    
    const { x, y, width, height } = croppedAreaPixels;
    
    let targetWidth = width;
    let targetHeight = height;
    
    if (targetWidth > MAX_WIDTH) {
       targetHeight *= MAX_WIDTH / targetWidth;
       targetWidth = MAX_WIDTH;
    }
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
      image,
      x, y, width, height,
      0, 0, targetWidth, targetHeight
    );
    
    canvas.toBlob((blob) => {
      if (blob) {
         const compressedFile = new File([blob], fileContext.name.replace(/\.[^/.]+$/, "") + ".webp", {
           type: 'image/webp',
           lastModified: Date.now(),
         });
         
         const previewUrl = URL.createObjectURL(compressedFile);
         setPreview(previewUrl);
         onImageChange(compressedFile);
         
         setImageSrc(null);
         setFileContext(null);
      }
    }, 'image/webp', 0.8);
  };

  const handleRemove = (e) => {
    e.preventDefault();
    setPreview(null);
    onImageChange('REMOVE');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (imageSrc) {
    return (
      <div style={{ marginBottom: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: '100%', height: '250px', backgroundColor: '#333' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        <div style={{ display: 'flex', padding: '1rem', gap: '1rem', backgroundColor: 'var(--bg-secondary)', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input 
              type="range" 
              value={zoom} 
              min={1} 
              max={3} 
              step={0.1} 
              onChange={(e) => setZoom(Number(e.target.value))} 
              style={{ width: '100%' }}
            />
          </div>
          <button onClick={handleCropCancel} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleCropConfirm} className="btn" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>Aceptar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Imagen del Producto</label>
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: `2px dashed ${preview ? 'transparent' : 'var(--border-color)'}`,
          borderRadius: '8px',
          padding: preview ? '0' : '2rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '150px',
          overflow: 'hidden',
          opacity: disabled ? 0.6 : 1
        }}
        onClick={() => { if (!disabled && !preview) fileInputRef.current.click() }}
      >
        <input 
          type="file" 
          accept="image/jpeg, image/png, image/webp" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
          disabled={disabled}
        />
        
        {preview ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img 
              src={preview.startsWith('blob:') || preview.startsWith('data:') || preview.startsWith('http') ? preview : `${import.meta.env.VITE_BACKEND_URL || ''}${preview}`} 
              alt="Preview" 
              style={{ width: '100%', height: '150px', objectFit: 'contain', backgroundColor: '#f0f0f0' }} 
            />
            {!disabled && (
              <button 
                onClick={handleRemove}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(220, 38, 38, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                title="Eliminar imagen"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
            {disabled ? (
              <p style={{ margin: 0, fontSize: '0.9rem' }}>La imagen se hereda del inventario</p>
            ) : (
              <>
                <p style={{ margin: 0, fontWeight: 500 }}>Haz clic o arrastra una imagen aquí</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem' }}>JPEG, PNG, WEBP (Max 10MB)</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
