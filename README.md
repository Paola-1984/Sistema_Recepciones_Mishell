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
   - Manejador de rutas no encontradas (404) y verificación de estado en ruta raíz `/`.
   - Exportación modular de la instancia `app` para pruebas con Supertest.

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

5. **Módulo de Clientes (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/clientes.js` y `src/controllers/clienteController.js`).
   - Validaciones de negocio adaptadas a Ecuador: Cédula (10 dígitos), RUC (13 dígitos) y formato de correo electrónico.
   - Prevención de duplicados para evitar colisiones de cédula/RUC y correo (`HTTP 409 Conflict`).
   - **Baja lógica:** Estado inactivo (`estado = 0`) para proteger la integridad referencial histórica.

6. **Módulo de Servicios (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/servicios.js` y `src/controllers/servicioController.js`).
   - Control de unicidad estricta para el código del servicio (`codigo`) en inserción y actualización (`HTTP 409 Conflict`).
   - Soporte de filtrado por categoría y búsqueda por texto.
   - **Baja lógica:** Marcado de descontinuado (`estado = 0`).

7. **Módulo de Cotizaciones y Detalle (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/cotizaciones.js` y `src/controllers/cotizacionController.js`).
   - **Transaccionalidad ACID:** Inserción atómica de cabecera (`cotizaciones`) y desglose (`detalle_cotizacion`) mediante transacciones SQL (`beginTransaction`, `commit`, `rollback`).
   - **Cálculo Financiero Automatizado:** Subtotal acumulado de servicios, cálculo oficial de IVA al 15% (Ecuador SRI) y Total general.
   - **Código Correlativo Único Diario:** Formato formal `COT-YYYYMMDD-XXX` generado bajo bloqueo transaccional (`FOR UPDATE`).

8. **Módulo de Reservas (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/reservas.js` y `src/controllers/reservaController.js`).
   - **Formalización Atómica:** Creación de reservas exclusivamente a partir de cotizaciones en estado `APROBADA`.
   - **Control Financiero:** Validación de anticipo entregado y cálculo automático del saldo pendiente.
   - **Código Correlativo Único Diario:** Formato formal `RES-YYYYMMDD-XXX` con bloqueo `FOR UPDATE`.

9. **Fase 4: Aseguramiento de Calidad y Pruebas Automatizadas (QA):**
   - Suite de pruebas de integración con **Jest** y **Supertest** (`tests/api.test.js`).
   - Verificación de respuestas 200 en catálogos, rechazo seguro de login con datos vacíos (400/401) y captura controlada de rutas 404.

---

## 🛠️ Tecnologías del Backend
* **Entorno de Ejecución:** Node.js (v18+)
* **Framework Web:** Express.js
* **Acceso a Datos:** MySQL2 (Soporte nativo de Promises, Transacciones ACID y Prepared Statements)
* **Base de Datos:** MySQL / MariaDB (vía XAMPP)
* **Seguridad:** Cifrado Bcrypt, Tokens JWT (RFC 7519) y consultas parametrizadas contra Inyección SQL (RNF04)
* **Testing & QA:** Jest y Supertest

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
├── tests/
│   └── api.test.js                # Suite de pruebas automatizadas con Jest y Supertest (Fase 4 QA)
│
├── .env                           # Variables de entorno locales
├── .env.example                   # Plantilla de configuración de variables de entorno
├── package.json                   # Dependencias y scripts de ejecución
├── README.md                      # Documentación completa del proyecto
└── server.js                      # Punto de entrada principal del servidor Express (exporta app para tests)
```

---

## 🧪 Pruebas Automatizadas (Fase 4 - QA)

Para ejecutar la suite de pruebas unitarias y de integración:

```bash
npm test
```

### Casos de Prueba Verificados (`tests/api.test.js`):
1. **GET `/api/servicios`**: Valida respuesta con código `HTTP 200`, estructura `{ ok: true, servicios: [...] }` y consistencia de atributos.
2. **POST `/api/auth/login`**: Valida rechazo de solicitudes con cuerpo vacío o credenciales faltantes (`HTTP 400` / `401`).
3. **Manejo de Rutas Inexistentes**: Valida captura de endpoints indefinidos retornando `HTTP 404` con mensaje controlado en JSON.
4. **Health Check (`GET /`)**: Valida que la raíz del servidor confirme operatividad activa (`HTTP 200`).

---

## ⚙️ Instalación y Puesta en Marcha Local

1. **Base de Datos (XAMPP):**
   - Inicia los módulos **Apache** y **MySQL** desde el panel de control de XAMPP.
   - Accede a `http://localhost/phpmyadmin/`.
   - Importa o ejecuta el script [`database/database.sql`](database/database.sql) para crear la base `recepciones_mishell` y las tablas relacionales.

2. **Configuración de Variables de Entorno (`.env`):**
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

4. **Ejecución del Servidor:**
   - Modo producción: `npm start`
   - Modo desarrollo: `npm run dev`
   - Modo pruebas: `npm test`
