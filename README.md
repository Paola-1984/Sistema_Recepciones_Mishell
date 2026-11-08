# Sistema de Gestión Administrativa - Recepciones Mishell

Plataforma web desarrollada como proyecto de titulación para la gestión integral de clientes, servicios, cotizaciones y reservas del salón de eventos **Recepciones Mishell** (Quito, Ecuador).

---

## 📌 Estado Actual del Proyecto (Implementaciones Operativas)

El sistema cuenta con las siguientes capas y componentes implementados y 100% operativos:

1. **Infraestructura Base y Entorno:**
   - Dependencias de producción (`express`, `mysql2`, `bcryptjs`, `cors`, `dotenv`) y desarrollo (`nodemon`, `jest`, `supertest`).
   - Configuración de variables de entorno mediante `.env` (`PORT`, credenciales de MySQL para XAMPP, `JWT_SECRET`).
   - Pool de conexiones asíncronas con soporte para Promises y manejo de desconexiones (`src/config/db.js`).

2. **Servidor Backend Express (`server.js`):**
   - Servidor HTTP configurado con middleware CORS para permitir consumo seguro de API.
   - Procesamiento de cargas JSON (`express.json()`) y codificación de formularios (`urlencoded`).
   - Enrutadores modulares montados en los prefijos `/api/auth`, `/api/clientes`, `/api/servicios`, `/api/cotizaciones` y `/api/reservas`.
   - Servicio de archivos estáticos del frontend desde la carpeta `/public` con soporte dual para navegadores (HTML) y clientes REST / pruebas (JSON).
   - Manejador de rutas no encontradas (404) y verificación de estado en ruta raíz `/`.

3. **Base de Datos Relacional MySQL (`recepciones_mishell`):**
   - Script SQL completo disponible en `database/database.sql`.
   - Motor transaccional `InnoDB` con codificación `utf8mb4_unicode_ci`.
   - Tablas relacionales con claves primarias (`PK`), claves foráneas (`FK`) e índices de búsqueda:
     - `usuarios`: Gestión de personal y administradores (contraseñas hasheadas con bcrypt).
     - `clientes`: Datos de contacto y tributarios de clientes (soporte de Cédula/RUC Ecuador).
     - `servicios`: Catálogo parametrizable de servicios de eventos y catering con validación de código único.
     - `cotizaciones`: Presupuestos de eventos con cálculo de subtotal, IVA (15%) y total.
     - `detalle_cotizacion`: Desglose de servicios asignados a cada cotización (relación N:M).
     - `reservas`: Eventos formalizados a partir de cotizaciones aprobadas, seguimiento de anticipos y saldos.
   - Semilla inicial con usuario administrador (`admin@recepcionesmishell.com` / `Admin123*`) y catálogo base de servicios.

4. **Módulo de Usuarios y Autenticación Segura (REST API):**
   - Cifrado unidireccional de contraseñas mediante **Bcrypt** (cost factor 10).
   - Tokens de acceso stateless **JWT** (RFC 7519) con expiración de 8 horas.
   - Endpoint de inicio de sesión (`/api/auth/login`) y perfil autenticado (`/api/auth/perfil`).

5. **Módulo de Clientes (REST API):**
   - Gestión de expedientes de clientes con validación ecuatoriana (Cédula 10 dígitos / RUC 13 dígitos).
   - Control estricto de duplicidad (`HTTP 409`) y baja lógica (`estado = 0`).

6. **Módulo de Servicios (REST API):**
   - Catálogo clasificado por categorías (`CATERING`, `DECORACION`, `LOCAL_SALON`, `SONIDO_LUCES`, etc.).
   - Validación de código único y control de disponibilidad.

7. **Módulo de Cotizaciones y Detalle (REST API):**
   - Transaccionalidad ACID en inserción de cabecera y desglose de servicios.
   - Cálculo automático del 15% de IVA según normativa oficial del SRI (Ecuador).
   - Código correlativo único diario (`COT-YYYYMMDD-XXX`) bajo bloqueo transaccional.

8. **Módulo de Reservas (REST API):**
   - Formalización atómica a partir de cotizaciones aprobadas (relación 1:1).
   - Validación de anticipos, saldos pendientes y código correlativo (`RES-YYYYMMDD-XXX`).

9. **Frontend UI/UX Completo (Vanilla HTML5 / CSS3 / JavaScript):**
   - Carpeta `public/` con arquitectura SPA modular y 7 vistas integradas:
     - **Vista 1:** Login institucional con selector de perfiles (Admin / Dueño), acceso rápido de demo y pie de seguridad SSL.
     - **Vista 2:** Calendario interactivo (Noviembre 2026) con estados visuales (azul, naranja, disponible), agenda de turnos y bloqueo de fechas.
     - **Vista 3:** Tablero de Gestión & KPIs con tarjetas de facturación acumulada ($14,850.00 / +18.4%), gráfica semestral Real vs Meta, distribución porcentual y tarjeta de Oportunidad Estratégica.
     - **Vista 4 (Paso 1 Cotizador):** Búsqueda de cliente (/api/clientes), tipo de recepción, control de aforo (ej. 85 pax) con sugerencia de distribución de mesas, fecha y turno.
     - **Vista 5 (Paso 2 Cotizador):** Selección de mantelería, menús gastronómicos (3 tiempos, buffet, tradicional), switch de pastel temático ($2.50/pax) y barra flotante de subtotal.
     - **Vista 6 (Paso 3 Cotizador):** Alquiler base del salón ($800 / 8h), duración de disco móvil (4h, 6h, 8h) con equipamiento incluido y desglose acumulado ($2,885.00).
     - **Vista 7 (Paso 4 Cotizador):** Resumen de contratación, desglose de ítems, bloque fiscal SRI con liquidación del 15% de IVA ($432.75) para un Total Definitivo de $3,317.75, y botones de confirmación y reserva vinculados con la API.

10. **Aseguramiento de Calidad (Fase 4 - QA):**
    - Suite de pruebas de integración con **Jest** y **Supertest** (`tests/api.test.js`).

---

## 🎨 Lineamientos Visuales y Estilísticos (Frontend)

* **Paleta Corporativa:**
  - **Azul Marino:** `#1B365D` (Encabezados, barra de navegación, botones secundarios).
  - **Durazno / Naranja Pastel:** `#FFA76E` (Botones de acción principal, destaques, llamadas a la acción).
  - **Fondo Neutro:** `#F8FAFC` (Superficie limpia, descansada para la vista).
* **Tipografía:** *Inter* (Google Fonts) para alta legibilidad en pantallas retina y móviles.
* **Bordes y Contenedores:** Curvaturas pronunciadas (`border-radius: 16px` a `24px`) para una estética moderna y amigable.
* **Maquetación:** 100% Flexbox y CSS Grid sin librerías pesadas externas.

---

## 📂 Estructura de Archivos del Proyecto

```text
Sistema_Recepciones_Mishell/
│
├── database/
│   └── database.sql               # Script DDL/DML de creación de BD, tablas relacionales y admin inicial
│
├── public/                        # Frontend UI/UX (Cliente Web)
│   ├── css/
│   │   └── styles.css             # Estilos corporativos, componentes visuales y diseño responsivo
│   ├── js/
│   │   └── app.js                 # Lógica SPA, consumo de API fetch, calendario y motor del cotizador
│   └── index.html                 # Estructura HTML5 de las 7 vistas y modales
│
├── src/                           # Backend API (Node.js + Express)
│   ├── config/
│   │   └── db.js                  # Pool de conexión a MySQL2 con soporte Promise
│   ├── controllers/
│   │   ├── authController.js      # Lógica de Registro, Login seguro (Bcrypt + JWT) y Perfil
│   │   ├── clienteController.js   # Lógica CRUD, validaciones y seguridad de Clientes
│   │   ├── servicioController.js  # Lógica CRUD, código único y seguridad de Servicios
│   │   ├── cotizacionController.js# Lógica transaccional, cálculos IVA 15% y correlativos de Cotizaciones
│   │   └── reservaController.js   # Lógica transaccional, validación de anticipos y estados de Reservas
│   └── routes/
│       ├── auth.js                # Enrutador RESTful para Autenticación (/api/auth)
│       ├── clientes.js            # Enrutador RESTful para Clientes (/api/clientes)
│       ├── servicios.js           # Enrutador RESTful para Servicios (/api/servicios)
│       ├── cotizaciones.js        # Enrutador RESTful para Cotizaciones (/api/cotizaciones)
│       └── reservas.js            # Enrutador RESTful para Reservas (/api/reservas)
│
├── tests/
│   └── api.test.js                # Suite de pruebas automatizadas con Jest y Supertest (Fase 4 QA)
│
├── .env                           # Variables de entorno locales
├── .env.example                   # Plantilla de configuración de variables de entorno
├── package.json                   # Dependencias y scripts de ejecución
├── README.md                      # Documentación completa del proyecto
└── server.js                      # Servidor Express, servicio estático y arranque
```

---

## 🚀 Puesta en Marcha y Visualización

1. **Asegurar Base de Datos:**
   - Inicia **Apache** y **MySQL** en el panel de control de **XAMPP**.
   - Importa [`database/database.sql`](database/database.sql) en phpMyAdmin (`http://localhost/phpmyadmin/`).

2. **Instalar Dependencias (si aún no lo has hecho):**
   ```bash
   npm install
   ```

3. **Iniciar el Servidor Completo:**
   ```bash
   npm run dev
   ```

4. **Abrir la Plataforma en el Navegador:**
   - Abre tu navegador web en: **`http://localhost:3000`**
   - Podrás interactuar con la pantalla de login, calendario, reportes KPIs y el cotizador inteligente en tiempo real.
