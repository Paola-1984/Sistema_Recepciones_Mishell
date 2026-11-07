# Sistema de Gestión Administrativa - Recepciones Mishell

Plataforma web desarrollada como proyecto de titulación para la gestión integral de clientes, servicios, cotizaciones y reservas del salón de eventos **Recepciones Mishell** (Quito, Ecuador).

---

## 📌 Estado Actual del Proyecto (Implementaciones Operativas)

El sistema cuenta con las siguientes capas y componentes implementados y 100% operativos:

1. **Infraestructura Base y Entorno:**
   - Configuración de dependencias de producción (`express`, `mysql2`, `bcryptjs`, `cors`, `dotenv`) y desarrollo (`nodemon`).
   - Configuración de variables de entorno mediante `.env` (`PORT`, credenciales de MySQL para XAMPP).
   - Pool de conexiones asíncronas con soporte para Promises y manejo de desconexiones (`src/config/db.js`).

2. **Servidor Backend Express (`server.js`):**
   - Servidor HTTP configurado con middleware CORS para permitir consumo seguro de API.
   - Procesamiento de cargas JSON (`express.json()`) y codificación de formularios (`urlencoded`).
   - Enrutadores modulares montados en los prefijos `/api/clientes`, `/api/servicios`, `/api/cotizaciones` y `/api/reservas`.
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
   - Semilla inicial con usuario administrador y catálogo base de servicios para pruebas inmediatas.

4. **Módulo de Clientes (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/clientes.js` y `src/controllers/clienteController.js`).
   - **Requisito No Funcional RNF04 (Seguridad):** Consultas SQL preparadas y parametrizadas (`?`) contra Inyección SQL.
   - Validaciones de negocio adaptadas a Ecuador: Cédula (10 dígitos), RUC (13 dígitos) y formato de correo electrónico.
   - Prevención de duplicados para evitar colisiones de cédula/RUC y correo (`HTTP 409 Conflict`).
   - **Baja lógica:** Estado inactivo (`estado = 0`) para proteger la integridad referencial histórica.
   - Respuestas JSON estandarizadas `{ ok: true/false, ... }`.

5. **Módulo de Servicios (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/servicios.js` y `src/controllers/servicioController.js`).
   - **Requisito No Funcional RNF04 (Seguridad):** Consultas preparadas y parametrizadas (`?`) en todas las operaciones.
   - Control de unicidad estricta para el código del servicio (`codigo`) en inserción y actualización (`HTTP 409 Conflict`).
   - Soporte de filtrado por categoría (`CATERING`, `DECORACION`, `LOCAL_SALON`, `SONIDO_LUCES`, `FOTOGRAFIA_VIDEO`, `ANIMACION_DJ`, `OTROS`) y búsqueda por texto.
   - **Baja lógica:** Marcado de descontinuado (`estado = 0`).
   - Respuestas JSON estructuradas con formato unificado `{ ok: true/false, ... }`.

6. **Módulo de Cotizaciones y Detalle (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/cotizaciones.js` y `src/controllers/cotizacionController.js`).
   - **Transaccionalidad ACID:** Inserción atómica de cabecera (`cotizaciones`) y desglose (`detalle_cotizacion`) mediante `connection.beginTransaction()`, `commit()` y `rollback()`.
   - **Cálculo Financiero Automatizado:** Subtotal acumulado de servicios, cálculo oficial de IVA al 15% (Ecuador SRI) y Total general.
   - **Código Correlativo Único Diario:** Formato formal `COT-YYYYMMDD-XXX` generado bajo bloqueo transaccional (`FOR UPDATE`) para evitar colisiones concurrentes.
   - **Gestión de Ciclo de Vida:** Endpoint dedicado para actualización de estados (`PENDIENTE`, `APROBADA`, `RECHAZADA`, `VENCIDA`).
   - Consulta completa de presupuesto incluyendo los datos de cliente, organizador y desglose de servicios.

7. **Módulo de Reservas (REST API Operativo):**
   - Arquitectura desacoplada **MVC** (`src/routes/reservas.js` y `src/controllers/reservaController.js`).
   - **Formalización Atómica (Transacción SQL):** Creación de reservas exclusivamente a partir de cotizaciones en estado `APROBADA`, evitando reservas duplicadas para la misma cotización (relación 1:1).
   - **Control Financiero:** Validación de anticipo entregado (`monto_anticipo > 0` y `<= total_evento`) y cálculo automático del saldo pendiente (`saldo_pendiente = total_evento - monto_anticipo`). Si el saldo es 0, el estado pasa a `PAGADA_TOTAL`.
   - **Código Correlativo Único Diario:** Formato formal `RES-YYYYMMDD-XXX` con bloqueo `FOR UPDATE`.
   - **Ciclo de Vida del Evento:** Endpoint para actualización de estados (`CONFIRMADA`, `EN_PROCESO` / `EN_EJECUCION`, `COMPLETADA` / `FINALIZADA`, `PAGADA_TOTAL`, `CANCELADA`).
   - Consulta detallada con cliente, cotización vinculada y lista de servicios contratados.

---

## 🛠️ Tecnologías del Backend
* **Entorno de Ejecución:** Node.js (v18+)
* **Framework Web:** Express.js
* **Acceso a Datos:** MySQL2 (Soporte nativo de Promises, Transacciones ACID y Prepared Statements)
* **Base de Datos:** MySQL / MariaDB (vía XAMPP)
* **Seguridad:** Cifrado Bcrypt para credenciales y consultas parametrizadas contra Inyección SQL (RNF04)

---

## 📂 Estructura de Archivos del Backend

```text
Sistema_Recepciones_Mishell/
│
├── database/
│   └── database.sql               # Script DDL/DML de creación de BD y tablas relacionales
│
├── src/
│   ├── config/
│   │   └── db.js                  # Pool de conexión a MySQL2 con soporte Promise
│   ├── controllers/
│   │   ├── clienteController.js   # Lógica CRUD, validaciones y seguridad de Clientes
│   │   ├── servicioController.js  # Lógica CRUD, código único y seguridad de Servicios
│   │   ├── cotizacionController.js# Lógica transaccional, cálculos IVA 15% y correlativos de Cotizaciones
│   │   └── reservaController.js   # Lógica transaccional, validación de anticipos y estados de Reservas
│   └── routes/
│       ├── clientes.js            # Enrutador RESTful para Clientes
│       └── servicios.js           # Enrutador RESTful para Servicios
│       ├── cotizaciones.js        # Enrutador RESTful para Cotizaciones
│       └── reservas.js            # Enrutador RESTful para Reservas
│
├── .env                           # Variables de entorno locales
├── .env.example                   # Plantilla de configuración de variables de entorno
├── package.json                   # Dependencias y scripts de ejecución
├── README.md                      # Documentación del proyecto
└── server.js                      # Punto de entrada principal del servidor Express
```

---

## 📡 Documentación de la API: Módulos REST

### 1. Módulo de Clientes (`/api/clientes`)

| Método | Endpoint | Descripción | Parámetros / Body | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/clientes` | Lista todos los clientes activos | Query opcional: `?buscar=termino` | `200`, `500` |
| **GET** | `/api/clientes/:id` | Obtiene un cliente por su ID | Parámetro URL: `id` | `200`, `400`, `404`, `500` |
| **POST** | `/api/clientes` | Registra un nuevo cliente | JSON Body (identificación, nombres, etc.) | `201`, `400`, `409`, `500` |
| **PUT** | `/api/clientes/:id` | Actualiza datos de un cliente | Parámetro URL `id` + JSON Body | `200`, `400`, `404`, `409`, `500` |
| **DELETE** | `/api/clientes/:id` | Realiza baja lógica (`estado = 0`) | Parámetro URL: `id` | `200`, `400`, `404`, `500` |

---

### 2. Módulo de Servicios (`/api/servicios`)

| Método | Endpoint | Descripción | Parámetros / Body | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/servicios` | Lista todos los servicios activos | Query opcional: `?buscar=texto&categoria=TIPO` | `200`, `500` |
| **GET** | `/api/servicios/:id` | Obtiene un servicio por su ID | Parámetro URL: `id` | `200`, `400`, `404`, `500` |
| **POST** | `/api/servicios` | Registra un nuevo servicio | JSON Body (validación de código único) | `201`, `400`, `409`, `500` |
| **PUT** | `/api/servicios/:id` | Actualiza datos del servicio | Parámetro URL `id` + JSON Body | `200`, `400`, `404`, `409`, `500` |
| **DELETE** | `/api/servicios/:id` | Realiza baja lógica (`estado = 0`) | Parámetro URL: `id` | `200`, `400`, `404`, `500` |

---

### 3. Módulo de Cotizaciones (`/api/cotizaciones`)

| Método | Endpoint | Descripción | Parámetros / Body | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/cotizaciones` | Lista cotizaciones con datos del cliente | Query opcional: `?estado=APROBADA&buscar=texto` | `200`, `500` |
| **GET** | `/api/cotizaciones/:id` | Consulta cotización completa con su detalle | Parámetro URL: `id` | `200`, `400`, `404`, `500` |
| **POST** | `/api/cotizaciones` | Registra cotización y desglose en transacción | JSON Body (cliente, evento, servicios) | `201`, `400`, `404`, `500` |
| **PATCH / PUT**| `/api/cotizaciones/:id/estado` | Actualiza el estado de la cotización | Parámetro URL `id` + `{"estado": "APROBADA"}` | `200`, `400`, `404`, `500` |

---

### 4. Módulo de Reservas (`/api/reservas`)

| Método | Endpoint | Descripción | Parámetros / Body | Códigos HTTP |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/reservas` | Lista todas las reservas con cliente y cotización | Query opcional: `?estado=CONFIRMADA&fecha=YYYY-MM-DD&buscar=texto` | `200`, `500` |
| **GET** | `/api/reservas/:id` | Consulta los detalles de una reserva específica | Parámetro URL: `id` (incluye servicios contratados) | `200`, `400`, `404`, `500` |
| **POST** | `/api/reservas` | Registra una reserva a partir de cotización aprobada | JSON Body (ver detalle abajo) | `201`, `400`, `404`, `409`, `500` |
| **PATCH / PUT**| `/api/reservas/:id/estado` | Cambia el estado del evento | Parámetro URL `id` + `{"estado": "EN_PROCESO"}` | `200`, `400`, `404`, `500` |

#### Ejemplo de Body para Crear Reserva (POST `/api/reservas`):
```json
{
  "id_cotizacion": 1,
  "id_usuario": 1,
  "hora_inicio": "17:00:00",
  "hora_fin": "02:00:00",
  "monto_anticipo": 1000.00,
  "lugar_evento": "Salón de Eventos Mishell - Quito",
  "fecha_evento": "2026-12-15",
  "observaciones": "Anticipo cancelado mediante transferencia Banco Pichincha"
}
```

#### Respuesta JSON al Crear Reserva (`HTTP 201 Created`):
```json
{
  "ok": true,
  "mensaje": "Reserva formalizada exitosamente a partir de la cotización aprobada",
  "reserva": {
    "id_reserva": 1,
    "codigo_reserva": "RES-20261106-001",
    "id_cotizacion": 1,
    "codigo_cotizacion": "COT-20261106-001",
    "id_cliente": 1,
    "fecha_evento": "2026-12-15",
    "hora_inicio": "17:00:00",
    "hora_fin": "02:00:00",
    "lugar_evento": "Salón de Eventos Mishell - Quito",
    "total_evento": 3070.50,
    "monto_anticipo": 1000.00,
    "saldo_pendiente": 2070.50,
    "estado": "CONFIRMADA"
  }
}
```

#### Ejemplo de Body para Cambiar Estado de Reserva (PATCH `/api/reservas/:id/estado`):
```json
{
  "estado": "EN_PROCESO"
}
```
*(Valores aceptados: `CONFIRMADA`, `EN_PROCESO` o `EN_EJECUCION`, `COMPLETADA` o `FINALIZADA`, `PAGADA_TOTAL`, `CANCELADA`)*

---

## ⚙️ Instalación y Puesta en Marcha Local

1. **Base de Datos (XAMPP):**
   - Inicia los módulos **Apache** y **MySQL** desde el panel de control de XAMPP.
   - Accede a `http://localhost/phpmyadmin/`.
   - Importa o ejecuta el script [`database/database.sql`](database/database.sql) para crear la base `recepciones_mishell` y las tablas relacionales.

2. **Configuración de Variables de Entorno:**
   - Asegúrate de contar con el archivo `.env` en la raíz (puedes basarte en `.env.example`):
     ```env
     PORT=3000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=
     DB_NAME=recepciones_mishell
     DB_PORT=3306
     NODE_ENV=development
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

5. **Prueba de Conectividad:**
   - Raíz API: `http://localhost:3000/`
   - Clientes: `http://localhost:3000/api/clientes`
   - Servicios: `http://localhost:3000/api/servicios`
   - Cotizaciones: `http://localhost:3000/api/cotizaciones`
   - Reservas: `http://localhost:3000/api/reservas`
