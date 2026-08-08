# Mi SaaS Inventario

Una plataforma completa de nivel empresarial en modelo SaaS (Software as a Service) diseñada para centralizar la gestión de múltiples negocios. Combina funcionalidades de Inventario, Recursos Humanos, Punto de Venta y Analítica Financiera bajo una arquitectura Multi-Tenant que garantiza la privacidad y aislamiento de datos para cada CEO y sus sucursales.

## 🚀 Características Principales

### Arquitectura Multi-Tenant (SaaS)
- **SaaS Admin**: Panel central para administrar a los CEOs registrados y monitorear el estado global de la plataforma.
- **Entornos Aislados por CEO**: Cada CEO original gestiona de manera privada a su equipo, sucursales y datos. Los usuarios sub-creados se vinculan a la "burbuja" del CEO creador, imposibilitando el cruce accidental de información entre empresas distintas.

### Gestión de Finanzas y Analíticas
- **Panel de Actividad y Utilidades**: Visualización en tiempo real de ingresos, egresos, margen neto y cálculo de punto de equilibrio.
- **Filtros Temporales Inteligentes**: Generación de resúmenes (Hoy, Esta Semana, Este Mes, Histórico).
- **Exportaciones Offline**: Descarga instantánea del historial completo en **Excel (.xlsx)** y **PDF** estructurado, permitiendo cuadrar la caja sin depender siempre de la nube.
- **Módulo de Egresos**: Registro categorizado de gastos, pagos a proveedores y pagos operativos.

### Recursos Humanos y Control de Asistencia
- **Centro de Control Global**: Creación y edición de perfiles de empleados con permisos modulares.
- **Jornadas y Asignaciones**: Creación de turnos laborales complejos (incluyendo turnos que cruzan la medianoche).
- **Asistencia Precisa**: Motor de validación horaria que calcula atrasos e impide el marcado de asistencia en horas no correspondientes al turno. Funciona en estricta sincronía con la fecha base, previniendo alteraciones.

### Inventario y Producción
- **Insumos y Recetas**: Creación de recetas precisas que descuentan ingredientes del inventario base automáticamente al registrarse una venta.
- **Control de Movimientos**: Registro de entradas y salidas para ajustar el stock manual o automáticamente por ventas.
- **Rentabilidad de Productos**: Cálculo dinámico de márgenes de ganancia basado en el coste promedio de los insumos.

---

## 🛠️ Stack Tecnológico Actual

Este proyecto fue construido utilizando tecnologías modernas y escalables. *(Nota: Inicialmente se prototipó usando un enfoque más crudo, pero se migró hacia Prisma ORM con Neon Console para mayor escalabilidad, velocidad y seguridad)*.

### Frontend
- **React.js 19**: Biblioteca central para construir interfaces de usuario reactivas.
- **Vite**: Entorno de desarrollo súper rápido y empaquetador para producción.
- **SWR**: Herramienta de fetching de datos, proporcionando caché y revalidación en tiempo real.
- **React Router DOM**: Enrutamiento dinámico para Single Page Applications (SPA).
- **Axios**: Cliente HTTP para comunicarse con la API.
- **xlsx y jspdf**: Librerías dedicadas para la renderización y exportación de tablas en el lado del cliente.
- **CSS Vanilla (Variables)**: Arquitectura de estilos con temas adaptables (Modo Oscuro/Claro integrado con persistencia de usuario).

### Backend
- **Node.js con Express**: Servidor ligero para el diseño de la API RESTful.
- **Prisma ORM**: ORM moderno que actúa como capa de abstracción para la base de datos relacional, facilitando migraciones e integridad referencial.
- **Base de Datos (Neon)**: Base de datos Serverless PostgreSQL altamente escalable que maneja la persistencia de datos.
- **JWT (JSON Web Tokens)**: Autenticación segura y sin estado para la validación de sesiones en múltiples módulos.
- **Bcrypt**: Encriptado unidireccional y robusto para las contraseñas de los usuarios.
- **Cloudinary / Multer**: Manejo, almacenamiento temporal y subida de imágenes a la nube para los logotipos y fotos de productos.

---

## 🔒 Estructura de Permisos

1. **ADMIN (SaaS Admin)**: Dueño de la plataforma. Puede suspender o activar CEOs originales.
2. **CEO Original**: Usuario raíz de su entorno. Puede crear negocios, ver la facturación, y crear empleados que vivirán dentro de su entorno privado.
3. **Roles de Negocio**: (CEO de Negocio, Gerente, Empleado). Definen qué pueden ver y hacer dentro del sistema local de una sucursal específica (Punto de Venta, Inventario, Reportes, etc.).
