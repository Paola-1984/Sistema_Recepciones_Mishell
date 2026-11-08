# Sistema de Gestión Administrativa - Recepciones Mishell

Plataforma web desarrollada como proyecto de titulación para la gestión integral de clientes, servicios, cotizaciones y reservas del salón de eventos **Recepciones Mishell** (Quito, Ecuador).

---

## 📌 Estado Actual del Proyecto (Implementaciones Operativas)

El sistema cuenta con las siguientes capas y componentes implementados y 100% operativos:

1. **Infraestructura Base y Entorno:**
   - Dependencias de producción (`express`, `mysql2`, `bcryptjs`, `cors`, `dotenv`) y desarrollo (`nodemon`).
   - Configuración de variables de entorno mediante `.env` (`PORT`, credenciales de MySQL para XAMPP, `JWT_SECRET`).
   - Pool de conexiones asíncronas con soporte para Promises y manejo de desconexiones (`src/config/db.js`).

2. **Servidor Backend Express (`server.js`):**
   - Servidor HTTP configurado con middleware CORS para permitir consumo seguro de API.
   - Procesamiento de cargas JSON (`express.json()`) y codificación de formularios (`urlencoded`).
   - Enrutadores modulares montados en los prefijos `/api/auth`, `/api/clientes`, `/api/servicios`, `/api/cotizaciones` y `/api/reservas`.
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

4. **Módulo de Usuarios y Autenticación Segura (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/auth.js` y `src/controllers/authController.js`).
   - **Requisito No Funcional RNF04 (Seguridad):** Cifrado unidireccional de contraseñas mediante **Bcrypt** con factor de coste 10. Consultas SQL preparadas contra Inyección SQL.
   - **Emisión de Tokens JWT:** Autenticación stateless basada en JSON Web Tokens (algoritmo HMAC-SHA256) con expiración de 8 horas.
   - Prevención de duplicados por correo electrónico (`HTTP 409 Conflict`) y validación de usuario activo (`estado = 1`).
   - Endpoint de verificación de sesión/perfil (`/api/auth/perfil`) con cabecera `Authorization: Bearer <token>`.

5. **Módulo de Clientes (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/clientes.js` y `src/controllers/clienteController.js`).
   - Validaciones de negocio adaptadas a Ecuador: Cédula (10 dígitos), RUC (13 dígitos) y formato de correo electrónico.
   - Prevención de duplicados para evitar colisiones de cédula/RUC y correo (`HTTP 409 Conflict`).
   - **Baja lógica:** Estado inactivo (`estado = 0`) para proteger la integridad referencial histórica.

6. **Módulo de Servicios (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/servicios.js` y `src/controllers/servicioController.js`).
   - Control de unicidad estricta para el código del servicio (`codigo`) en inserción y actualización (`HTTP 409 Conflict`).
   - Soporte de filtrado por categoría (`CATERING`, `DECORACION`, `LOCAL_SALON`, `SONIDO_LUCES`, `FOTOGRAFIA_VIDEO`, `ANIMACION_DJ`, `OTROS`) y búsqueda por texto.
   - **Baja lógica:** Marcado de descontinuado (`estado = 0`).

7. **Módulo de Cotizaciones y Detalle (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/cotizaciones.js` y `src/controllers/cotizacionController.js`).
   - **Transaccionalidad ACID:** Inserción atómica de cabecera (`cotizaciones`) y desglose (`detalle_cotizacion`) mediante `connection.beginTransaction()`, `commit()` y `rollback()`.
   - **Cálculo Financiero Automatizado:** Subtotal acumulado de servicios, cálculo oficial de IVA al 15% (Ecuador SRI) y Total general.
   - **Código Correlativo Único Diario:** Formato formal `COT-YYYYMMDD-XXX` generado bajo bloqueo transaccional (`FOR UPDATE`).
   - **Gestión de Ciclo de Vida:** Actualización de estados (`PENDIENTE`, `APROBADA`, `RECHAZADA`, `VENCIDA`).

8. **Módulo de Reservas (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/reservas.js` y `src/controllers/reservaController.js`).
   - **Formalización Atómica:** Creación de reservas exclusivamente a partir de cotizaciones en estado `APROBADA`, evitando reservas duplicadas (relación 1:1).
   - **Control Financiero:** Validación de anticipo entregado (`monto_anticipo > 0` y `<= total_evento`) y cálculo automático del saldo pendiente. Si el saldo es 0, el estado pasa a `PAGADA_TOTAL`.
   - **Código Correlativo Único Diario:** Formato formal `RES-YYYYMMDD-XXX` con bloqueo `FOR UPDATE`.
   - **Ciclo de Vida del Evento:** Actualización de estados (`CONFIRMADA`, `EN_PROCESO`, `COMPLETADA`, `PAGADA_TOTAL`, `CANCELADA`).

---

## 🛠️ Tecnologías del Backend
* **Entorno de Ejecución:** Node.js (v18+)
* **Framework Web:** Express.js
* **Acceso a Datos:** MySQL2 (Soporte nativo de Promises, Transacciones ACID y Prepared Statements)
* **Base de Datos:** MySQL / MariaDB (vía XAMPP)
* **Seguridad:** Cifrado Bcrypt, Tokens JWT (RFC 7519) y consultas parametrizadas contra Inyección SQL (RNF04)

---

## 📂 Estructura de Archivos del Backend

```text
Sistema_Recepciones_Mishell/
│
├── database/
│   └── database.sql               # Script DDL/DML de creación de BD, tablas relacionales y admin inicial
│
├── src/
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
├── .env                           # Variables de entorno locales
├── .env.example                   # Plantilla de configuración de variables de entorno
├── package.json                   # Dependencias y scripts de ejecución
├── README.md                      # Documentación completa del proyecto
└── server.js                      # Punto de entrada principal del servidor Express
```

---

## 📡 Documentación de la API: Módulos REST

### 1. Módulo de Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Body / Headers | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Registra un nuevo usuario con clave hasheada (Bcrypt) | JSON Body (nombre, correo, password, rol, tel) | `201`, `400`, `409`, `500` |
| **POST** | `/api/auth/login` | Inicia sesión validando hash Bcrypt y emite JWT | JSON Body: `correo` y `password` | `200`, `400`, `401`, `403`, `500` |
| **GET** | `/api/auth/perfil` | Consulta los datos del usuario autenticado | Header: `Authorization: Bearer <token>` | `200`, `401`, `404`, `500` |

#### Ejemplo de Body para Registro (`POST /api/auth/register`):
```json
{
  "nombre_completo": "Mishell Andrade",
  "correo": "mishell.andrade@recepcionesmishell.com",
  "password": "PasswordSegura2026*",
  "rol": "ORGANIZADOR",
  "telefono": "0991122334"
}
```

#### Ejemplo de Body para Inicio de Sesión (`POST /api/auth/login`):
```json
{
  "correo": "admin@recepcionesmishell.com",
  "password": "Admin123*"
}
```

#### Respuesta Exitosa de Login:
```json
{
  "ok": true,
  "mensaje": "Bienvenido/a al Sistema Recepciones Mishell, Administrador Recepciones Mishell",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id_usuario": 1,
    "nombre_completo": "Administrador Recepciones Mishell",
    "correo": "admin@recepcionesmishell.com",
    "rol": "ADMIN",
    "telefono": "0991234567"
  }
}
```

---

### 2. Módulo de Clientes (`/api/clientes`)

| Método | Endpoint | Descripción | Parámetros / Body | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/clientes` | Lista todos los clientes activos | Query opcional: `?buscar=termino` | `200`, `500` |
| **GET** | `/api/clientes/:id` | Obtiene un cliente por su ID | Parámetro URL: `id` | `200`, `400`, `404`, `500` |
| **POST** | `/api/clientes` | Registra un nuevo cliente | JSON Body (identificación, nombres, etc.) | `201`, `400`, `409`, `500` |
| **PUT** | `/api/clientes/:id` | Actualiza datos de un cliente | Parámetro URL `id` + JSON Body | `200`, `400`, `404`, `409`, `500` |
| **DELETE** | `/api/clientes/:id` | Realiza baja lógica (`estado = 0`) | Parámetro URL: `id` | `200`, `400`, `404`, `500` |

---

### 3. Módulo de Servicios (`/api/servicios`)

| Método | Endpoint | Descripción | Parámetros / Body | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/servicios` | Lista todos los servicios activos | Query opcional: `?buscar=texto&categoria=TIPO` | `200`, `500` |
| **GET** | `/api/servicios/:id` | Obtiene un servicio por su ID | Parámetro URL: `id` | `200`, `400`, `404`, `500` |
| **POST** | `/api/servicios` | Registra un nuevo servicio | JSON Body (validación de código único) | `201`, `400`, `409`, `500` |
| **PUT** | `/api/servicios/:id` | Actualiza datos del servicio | Parámetro URL `id` + JSON Body | `200`, `400`, `404`, `409`, `500` |
| **DELETE** | `/api/servicios/:id` | Realiza baja lógica (`estado = 0`) | Parámetro URL: `id` | `200`, `400`, `404`, `500` |

---

### 4. Módulo de Cotizaciones (`/api/cotizaciones`)

| Método | Endpoint | Descripción | Parámetros / Body | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/cotizaciones` | Lista cotizaciones con datos del cliente | Query opcional: `?estado=APROBADA&buscar=texto` | `200`, `500` |
| **GET** | `/api/cotizaciones/:id` | Consulta cotización completa con su detalle | Parámetro URL: `id` | `200`, `400`, `404`, `500` |
| **POST** | `/api/cotizaciones` | Registra cotización y desglose en transacción | JSON Body (cliente, evento, servicios) | `201`, `400`, `404`, `500` |
| **PATCH / PUT**| `/api/cotizaciones/:id/estado` | Actualiza el estado de la cotización | Parámetro URL `id` + `{"estado": "APROBADA"}` | `200`, `400`, `404`, `500` |

---

### 5. Módulo de Reservas (`/api/reservas`)

| Método | Endpoint | Descripción | Parámetros / Body | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/reservas` | Lista todas las reservas con cliente y cotización | Query opcional: `?estado=CONFIRMADA&fecha=YYYY-MM-DD` | `200`, `500` |
| **GET** | `/api/reservas/:id` | Consulta los detalles de una reserva específica | Parámetro URL: `id` (incluye servicios contratados) | `200`, `400`, `404`, `500` |
| **POST** | `/api/reservas` | Registra una reserva a partir de cotización aprobada | JSON Body (anticipo, fecha, horas) | `201`, `400`, `404`, `409`, `500` |
| **PATCH / PUT**| `/api/reservas/:id/estado` | Cambia el estado del evento | Parámetro URL `id` + `{"estado": "EN_PROCESO"}` | `200`, `400`, `404`, `500` |

---

## ⚙️ Instalación y Puesta en Marcha Local

1. **Base de Datos (XAMPP):**
   - Inicia los módulos **Apache** y **MySQL** desde el panel de control de XAMPP.
   - Accede a `http://localhost/phpmyadmin/`.
   - Importa o ejecuta el script [`database/database.sql`](database/database.sql) para crear la base `recepciones_mishell` y las tablas relacionales.

2. **Configuración de Variables de Entorno (`.env`):**
   - Asegúrate de contar con el archivo `.env` en la raíz (puedes basarte en `.env.example`):
     ```env
     PORT=3000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=
     DB_NAME=recepciones_mishell
     DB_PORT=3306
     NODE_ENV=development
     JWT_SECRET=RecepcionesMishell_SecretKey_2026_Quito
     ```

3. **Instalación de Dependencias:**
   ```bash
   npm install
   ```

4. **Ejecutar el Servidor:**
   - Modo producción:
     ```bash
     npm start
     ```
   - Modo desarrollo (con recarga automática):
     ```bash
     npm run dev
     ```

5. **Verificación de Endpoints Operativos:**
   - Raíz API: `http://localhost:3000/`
   - Autenticación: `http://localhost:3000/api/auth/login`
   - Clientes: `http://localhost:3000/api/clientes`
   - Servicios: `http://localhost:3000/api/servicios`
   - Cotizaciones: `http://localhost:3000/api/cotizaciones`
   - Reservas: `http://localhost:3000/api/reservas`
