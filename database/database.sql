-- ============================================================================
-- PROYECTO DE TITULACIÓN: Sistema de Gestión de Recepciones Mishell (Quito)
-- TECNOLOGÍA: Node.js + Express + MySQL (XAMPP)
-- SCRIPT: Creación de Base de Datos y Tablas Relacionales
-- ============================================================================

-- 1. CREACIÓN Y SELECCIÓN DE BASE DE DATOS
CREATE DATABASE IF NOT EXISTS `recepciones_mishell`
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `recepciones_mishell`;

-- ============================================================================
-- 2. ELIMINACIÓN DE TABLAS SI YA EXISTEN (En orden inverso a las llaves foráneas)
-- ============================================================================
DROP TABLE IF EXISTS `reservas`;
DROP TABLE IF EXISTS `detalle_cotizacion`;
DROP TABLE IF EXISTS `cotizaciones`;
DROP TABLE IF EXISTS `servicios`;
DROP TABLE IF EXISTS `clientes`;
DROP TABLE IF EXISTS `usuarios`;

-- ============================================================================
-- 3. TABLA: usuarios
-- Almacena administradores y personal con acceso al sistema web.
-- Contraseñas protegidas mediante algoritmo criptográfico bcrypt (RNF04).
-- ============================================================================
CREATE TABLE `usuarios` (
    `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre_completo` VARCHAR(120) NOT NULL,
    `correo` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL COMMENT 'Hash seguro generado con bcrypt',
    `rol` ENUM('ADMIN', 'ORGANIZADOR', 'RECEPCIONISTA') NOT NULL DEFAULT 'ADMIN',
    `telefono` VARCHAR(20) NULL,
    `estado` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_usuarios_correo` (`correo`),
    INDEX `idx_usuarios_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. TABLA: clientes
-- Clientes que solicitan cotizaciones y contratan eventos en Recepciones Mishell.
-- Identificación (Cédula o RUC) adaptada a la normativa ecuatoriana (Quito).
-- ============================================================================
CREATE TABLE `clientes` (
    `id_cliente` INT AUTO_INCREMENT PRIMARY KEY,
    `tipo_documento` ENUM('CEDULA', 'RUC', 'PASAPORTE') NOT NULL DEFAULT 'CEDULA',
    `identificacion` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Cédula (10 dígitos) o RUC (13 dígitos)',
    `nombres` VARCHAR(80) NOT NULL,
    `apellidos` VARCHAR(80) NOT NULL,
    `correo` VARCHAR(100) NOT NULL UNIQUE,
    `telefono` VARCHAR(20) NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `ciudad` VARCHAR(60) NOT NULL DEFAULT 'Quito',
    `estado` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: Activo, 0: Inactivo (Baja lógica)',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_clientes_identificacion` (`identificacion`),
    INDEX `idx_clientes_correo` (`correo`),
    INDEX `idx_clientes_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. TABLA: servicios
-- Catálogo de servicios disponibles: Catering, salones, decoración, audio, etc.
-- ============================================================================
CREATE TABLE `servicios` (
    `id_servicio` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(30) NOT NULL UNIQUE COMMENT 'Código único del servicio (ej. CAT-001)',
    `nombre_servicio` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `categoria` ENUM('CATERING', 'DECORACION', 'LOCAL_SALON', 'SONIDO_LUCES', 'FOTOGRAFIA_VIDEO', 'ANIMACION_DJ', 'OTROS') NOT NULL,
    `precio_unitario` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `capacidad_max` INT NULL COMMENT 'Capacidad referencial de asistentes si aplica',
    `estado` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: Disponible, 0: Descontinuado',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_servicios_codigo` (`codigo`),
    INDEX `idx_servicios_categoria` (`categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. TABLA: cotizaciones
-- Presupuestos solicitados por clientes para eventos sociales o corporativos.
-- ============================================================================
CREATE TABLE `cotizaciones` (
    `id_cotizacion` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo_cotizacion` VARCHAR(30) NOT NULL UNIQUE COMMENT 'Formato correlativo (ej. COT-2026-0001)',
    `id_cliente` INT NOT NULL,
    `id_usuario` INT NOT NULL COMMENT 'Usuario del sistema que elaboró la cotización',
    `tipo_evento` VARCHAR(80) NOT NULL COMMENT 'Boda, XV Años, Grado, Corporativo, etc.',
    `fecha_evento` DATE NOT NULL,
    `num_invitados` INT NOT NULL DEFAULT 50,
    `lugar_evento` VARCHAR(255) NULL DEFAULT 'Salón Mishell - Quito',
    `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `iva` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'IVA aplicable según legislación SRI',
    `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `estado` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA') NOT NULL DEFAULT 'PENDIENTE',
    `observaciones` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cotizaciones_cliente` FOREIGN KEY (`id_cliente`)
        REFERENCES `clientes` (`id_cliente`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_cotizaciones_usuario` FOREIGN KEY (`id_usuario`)
        REFERENCES `usuarios` (`id_usuario`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_cotizaciones_codigo` (`codigo_cotizacion`),
    INDEX `idx_cotizaciones_fecha` (`fecha_evento`),
    INDEX `idx_cotizaciones_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. TABLA: detalle_cotizacion
-- Relación N:M que desglosa los servicios incluidos en una cotización.
-- ============================================================================
CREATE TABLE `detalle_cotizacion` (
    `id_detalle` INT AUTO_INCREMENT PRIMARY KEY,
    `id_cotizacion` INT NOT NULL,
    `id_servicio` INT NOT NULL,
    `cantidad` INT NOT NULL DEFAULT 1,
    `precio_unitario` DECIMAL(10,2) NOT NULL,
    `subtotal` DECIMAL(10,2) NOT NULL,
    `observaciones` VARCHAR(255) NULL,
    CONSTRAINT `fk_detalle_cotizacion` FOREIGN KEY (`id_cotizacion`)
        REFERENCES `cotizaciones` (`id_cotizacion`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_detalle_servicio` FOREIGN KEY (`id_servicio`)
        REFERENCES `servicios` (`id_servicio`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_detalle_cotizacion` (`id_cotizacion`),
    INDEX `idx_detalle_servicio` (`id_servicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. TABLA: reservas
-- Eventos formalizados mediante abono/contrato a partir de una cotización o cliente.
-- ============================================================================
CREATE TABLE `reservas` (
    `id_reserva` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo_reserva` VARCHAR(30) NOT NULL UNIQUE COMMENT 'Formato correlativo (ej. RES-2026-0001)',
    `id_cotizacion` INT NULL UNIQUE COMMENT 'Cotización aprobada vinculada (opcional)',
    `id_cliente` INT NOT NULL,
    `id_usuario` INT NOT NULL COMMENT 'Usuario que procesó la reserva',
    `fecha_evento` DATE NOT NULL,
    `hora_inicio` TIME NOT NULL,
    `hora_fin` TIME NOT NULL,
    `lugar_evento` VARCHAR(255) NOT NULL DEFAULT 'Salón de Eventos Mishell - Quito',
    `total_evento` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `monto_anticipo` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `saldo_pendiente` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `estado` ENUM('CONFIRMADA', 'PAGADA_TOTAL', 'EN_EJECUCION', 'FINALIZADA', 'CANCELADA') NOT NULL DEFAULT 'CONFIRMADA',
    `observaciones` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_reservas_cotizacion` FOREIGN KEY (`id_cotizacion`)
        REFERENCES `cotizaciones` (`id_cotizacion`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_reservas_cliente` FOREIGN KEY (`id_cliente`)
        REFERENCES `clientes` (`id_cliente`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_reservas_usuario` FOREIGN KEY (`id_usuario`)
        REFERENCES `usuarios` (`id_usuario`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_reservas_codigo` (`codigo_reserva`),
    INDEX `idx_reservas_fecha` (`fecha_evento`),
    INDEX `idx_reservas_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. DATOS SEMILLA (SEEDS)
-- ============================================================================

-- Usuario Administrador Inicial
-- Correo: admin@recepcionesmishell.com
-- Contraseña por defecto: Admin123* (hash bcrypt seguro con 10 rounds)
-- Hash: $2a$10$i0O5trRbY4aH/05N9iMNyOPzW9vfm35.7ZqlasfTY0eFA2I8gyfki
INSERT INTO `usuarios` (`nombre_completo`, `correo`, `password`, `rol`, `telefono`, `estado`) 
VALUES (
    'Administrador Recepciones Mishell',
    'admin@recepcionesmishell.com',
    '$2a$10$i0O5trRbY4aH/05N9iMNyOPzW9vfm35.7ZqlasfTY0eFA2I8gyfki',
    'ADMIN',
    '0991234567',
    1
);

-- Servicios Base para pruebas inmediatas en Recepciones Mishell (Quito)
INSERT INTO `servicios` (`codigo`, `nombre_servicio`, `descripcion`, `categoria`, `precio_unitario`, `capacidad_max`, `estado`) VALUES
('SAL-001', 'Alquiler Salón Principal Mishell', 'Uso de salón de recepciones por 8 horas con climatización y baños VIP.', 'LOCAL_SALON', 550.00, 200, 1),
('CAT-001', 'Banquete Clásico 3 Tiempos (por persona)', 'Entrada gourmet, plato fuerte (carne/pollo) con guarniciones y postre fino.', 'CATERING', 14.50, NULL, 1),
('DEC-001', 'Decoración Elegance Completa', 'Centros de mesa florales naturales, backing fotográfico iluminado y mantelería fina.', 'DECORACION', 380.00, NULL, 1),
('DJ-001', 'Paquete Sonido Pro & Iluminación Robótica', 'DJ profesional, luces led inteligentes, máquina de humo y micrófonos inalámbricos.', 'SONIDO_LUCES', 260.00, NULL, 1);

-- Cliente inicial de prueba
INSERT INTO `clientes` (`tipo_documento`, `identificacion`, `nombres`, `apellidos`, `correo`, `telefono`, `direccion`, `ciudad`, `estado`) VALUES
('CEDULA', '1712345678', 'Carlos Andrés', 'Mendoza Pérez', 'carlos.mendoza@email.com', '0987654321', 'Av. Amazonas y Gaspar de Villarroel', 'Quito', 1);

