const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const userRoutes = require('./routes/userRoutes');
const globalUserRoutes = require('./routes/globalUserRoutes');
const productRoutes = require('./routes/productRoutes');
const roleRoutes = require('./routes/roleRoutes');
const menuRoutes = require('./routes/menuRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const positionRoutes = require('./routes/positionRoutes');
const cashRegisterRoutes = require('./routes/cashRegisterRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const salesRoutes = require('./routes/salesRoutes');
const workShiftRoutes = require('./routes/workShiftRoutes');
const inventoryMovementRoutes = require('./routes/inventoryMovementRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const saasAdminRoutes = require('./routes/saasAdminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const { verifyToken } = require('./middleware/authMiddleware');
const businessMiddleware = require('./middleware/businessMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, 'http://localhost:5173'] 
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 1. Rutas públicas (Auth)
app.use('/api/auth', authRoutes);

// Auth global para todas las siguientes rutas
app.use('/api', verifyToken);

// 2. Rutas globales protegidas (requieren auth)
app.use('/api/businesses', businessRoutes);
app.use('/api/global-users', globalUserRoutes);

// Rutas globales (requieren auth pero no businessId)
app.use('/api/roles', roleRoutes);
app.use('/api/saas', saasAdminRoutes);

// Middleware de negocio (aplica a todo lo operativo)
app.use('/api', businessMiddleware);

// Rutas operativas (requieren auth y businessId)
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/recipe', recipeRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/cash-registers', cashRegisterRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/work-shifts', workShiftRoutes);
app.use('/api/inventory-movements', inventoryMovementRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/attendances', attendanceRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido al API del Restaurante' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
