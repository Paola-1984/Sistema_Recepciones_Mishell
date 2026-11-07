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
   - Enrutadores modulares montados en los prefijos `/api/clientes`, `/api/servicios` y `/api/cotizaciones`.
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
     - `reservas`: Eventos confirmados y seguimiento financiero (anticipo y saldo).
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
│   │   └── cotizacionController.js# Lógica transaccional, cálculos IVA 15% y correlativos de Cotizaciones
│   └── routes/
│       ├── clientes.js            # Enrutador RESTful para Clientes
│       ├── servicios.js           # Enrutador RESTful para Servicios
│       └── cotizaciones.js        # Enrutador RESTful para Cotizaciones
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
| **POST** | `/api/cotizaciones` | Registra cotización y desglose en transacción | JSON Body (ver detalle abajo) | `201`, `400`, `404`, `500` |
| **PATCH / PUT**| `/api/cotizaciones/:id/estado` | Actualiza el estado de la cotización | Parámetro URL `id` + `{"estado": "APROBADA"}` | `200`, `400`, `404`, `500` |

#### Ejemplo de Body para Crear Cotización (POST `/api/cotizaciones`):
```json
{
  "id_cliente": 1,
  "id_usuario": 1,
  "tipo_evento": "Boda Elegance",
  "fecha_evento": "2026-12-15",
  "num_invitados": 120,
  "lugar_evento": "Salón Mishell - Quito",
  "observaciones": "Mantelería dorada y degustación previa",
  "servicios": [
    {
      "id_servicio": 1,
      "cantidad": 1,
      "precio_unitario": 550.00,
      "observaciones": "Salón climatizado 8 horas"
    },
    {
      "id_servicio": 2,
      "cantidad": 120,
      "precio_unitario": 14.50,
      "observaciones": "Plato fuerte: Lomo fino y pollo a la naranja"
    },
    {
      "id_servicio": 3,
      "cantidad": 1,
      "precio_unitario": 380.00
    }
  ]
}
```

#### Respuesta JSON al Crear Cotización (`HTTP 201 Created`):
```json
{
  "ok": true,
  "mensaje": "Cotización registrada exitosamente con su desglose de servicios",
  "cotizacion": {
    "id_cotizacion": 1,
    "codigo_cotizacion": "COT-20261106-001",
    "id_cliente": 1,
    "cliente": "Carlos Andrés Mendoza Pérez",
    "tipo_evento": "Boda Elegance",
    "fecha_evento": "2026-12-15",
    "num_invitados": 120,
    "lugar_evento": "Salón Mishell - Quito",
    "subtotal": 2670.00,
    "iva": 400.50,
    "total": 3070.50,
    "estado": "PENDIENTE",
    "items_registrados": 3,
    "detalle": [
      {
        "id_servicio": 1,
        "nombre_servicio": "Alquiler Salón Principal Mishell",
        "cantidad": 1,
        "precio_unitario": 550,
        "subtotal": 550,
        "observaciones": "Salón climatizado 8 horas"
      },
      {
        "id_servicio": 2,
        "nombre_servicio": "Banquete Clásico 3 Tiempos (por persona)",
        "cantidad": 120,
        "precio_unitario": 14.5,
        "subtotal": 1740,
        "observaciones": "Plato fuerte: Lomo fino y pollo a la naranja"
      },
      {
        "id_servicio": 3,
        "nombre_servicio": "Decoración Elegance Completa",
        "cantidad": 1,
        "precio_unitario": 380,
        "subtotal": 380,
        "observaciones": null
      }
    ]
  }
}
```

#### Ejemplo de Body para Cambiar Estado (PATCH `/api/cotizaciones/:id/estado`):
```json
{
  "estado": "APROBADA"
}
```

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
