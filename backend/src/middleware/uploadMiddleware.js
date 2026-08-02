const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Asegurar que el directorio de uploads existe
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar Cloudinary si existen las variables
const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Configuración de almacenamiento
const storage = useCloudinary 
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'mi-saas-inventario',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
    })
  : multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });

// Filtro de archivos (Solo imágenes JPEG, PNG, WEBP)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no soportado. Solo se permite JPEG, PNG y WEBP.'), false);
  }
};

// Configuración final de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB límite
  },
  fileFilter: fileFilter
});

module.exports = upload;
