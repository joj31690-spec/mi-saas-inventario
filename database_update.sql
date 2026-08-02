-- Sugerencia de nombre para la base de datos: restaurante_db
-- 1. (Base de datos ya creada)


-- (NOTA: Asegúrate de estar conectado a la base de datos 'restaurante_db' antes de ejecutar lo siguiente)
-- \c restaurante_db  -- Comando si usas psql

-- 1.5 Limpiar tablas antiguas (por si acaso quedaron con columnas incorrectas)
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 2. Crear tabla de Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crear tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Insertar roles iniciales obligatorios
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrador del sistema con acceso total'),
('trabajador', 'Trabajador del restaurante con acceso a operaciones diarias');

-- 5. Crear tabla de Productos (Inventario)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('Unidad', 'Kg', 'Gramos', 'Litros', 'Mililitros')),
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    minimum_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Insertar administrador de prueba (Usuario: admin, Contraseña: admin123)
-- (Si ya existe, esto podría dar error por la restricción UNIQUE, pero es útil para la creación inicial)
INSERT INTO users (username, password_hash, role_id) 
VALUES ('admin', '$2b$10$x493mjMpDmuxu3.vnj4LEe0n0N5N/raL8Ne7ZKNUBfn5SvVRXVEKW', 1);

-- 7. Actualización (Sprint 3): Agregar campos adicionales a la tabla users
ALTER TABLE users ADD COLUMN full_name VARCHAR(150);
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN email VARCHAR(100);

-- Actualizar el usuario 'admin' existente para que no tenga valores nulos en campos obligatorios
UPDATE users SET full_name = 'Administrador Principal' WHERE username = 'admin';

-- Hacer obligatorio el full_name después de la actualización
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- 8. Actualización (Sprint 4): Menú y Recetas
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_items (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(menu_item_id, product_id)
);

-- 9. Actualización: Módulo de Personal
CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cash_registers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
    cash_register_id INTEGER REFERENCES cash_registers(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Actualización: Módulo de Ventas
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    cash_register_id INTEGER NOT NULL REFERENCES cash_registers(id) ON DELETE RESTRICT,
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
