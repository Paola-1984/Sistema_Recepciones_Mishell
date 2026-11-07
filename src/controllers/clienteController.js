/**
 * Controlador de Clientes
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * 
 * Requisito No Funcional RNF04: Seguridad contra Inyección SQL (SQL Injection).
 * Todas las operaciones utilizan consultas parametrizadas con placeholders (?) mediante MySQL2.
 * Estructura de respuestas estándar: { ok: true/false, ... }
 */

const rawDb = require('../config/db');

// Soporte robusto tanto para pool directo de mysql2/promise como instancias con .promise()
const db = rawDb.promise ? rawDb.promise() : rawDb;

/**
 * Validador de formato para identificación en Ecuador (Cédula: 10 dígitos, RUC: 13 dígitos)
 */
const esIdentificacionValida = (identificacion) => {
    if (!identificacion) return false;
    const regex = /^[0-9]{10}$|^[0-9]{13}$/;
    return regex.test(identificacion.trim());
};

/**
 * Validador de formato de correo electrónico
 */
const esCorreoValido = (correo) => {
    if (!correo) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo.trim().toLowerCase());
};

/**
 * 1. Obtener lista de clientes activos (con opción de búsqueda parametrizada)
 * GET /api/clientes
 */
const obtenerClientes = async (req, res) => {
    try {
        const { buscar } = req.query;

        let sql = `
            SELECT 
                id_cliente,
                tipo_documento,
                identificacion,
                nombres,
                apellidos,
                correo,
                telefono,
                direccion,
                ciudad,
                estado,
                created_at,
                updated_at
            FROM clientes 
            WHERE estado = 1
        `;
        const params = [];

        // Filtro de búsqueda seguro contra inyección SQL
        if (buscar && buscar.trim() !== '') {
            const termino = `%${buscar.trim()}%`;
            sql += ` AND (identificacion LIKE ? OR nombres LIKE ? OR apellidos LIKE ? OR correo LIKE ?)`;
            params.push(termino, termino, termino, termino);
        }

        sql += ` ORDER BY id_cliente DESC`;

        const [clientes] = await db.execute(sql, params);

        return res.status(200).json({
            ok: true,
            total: clientes.length,
            clientes
        });
    } catch (error) {
        console.error('Error en obtenerClientes:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al obtener la lista de clientes',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 2. Obtener un cliente por su ID
 * GET /api/clientes/:id
 */
const obtenerClientePorId = async (req, res) => {
    try {
        const { id } = req.params;
        const idCliente = parseInt(id, 10);

        if (isNaN(idCliente) || idCliente <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El identificador del cliente proporcionado no es válido'
            });
        }

        const [rows] = await db.execute(
            `SELECT 
                id_cliente,
                tipo_documento,
                identificacion,
                nombres,
                apellidos,
                correo,
                telefono,
                direccion,
                ciudad,
                estado,
                created_at,
                updated_at
            FROM clientes 
            WHERE id_cliente = ? AND estado = 1 
            LIMIT 1`,
            [idCliente]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Cliente con ID ${idCliente} no encontrado o se encuentra inactivo`
            });
        }

        return res.status(200).json({
            ok: true,
            cliente: rows[0]
        });
    } catch (error) {
        console.error('Error en obtenerClientePorId:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al consultar el cliente',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 3. Registrar un nuevo cliente
 * POST /api/clientes
 */
const registrarCliente = async (req, res) => {
    try {
        const {
            tipo_documento = 'CEDULA',
            identificacion,
            nombres,
            apellidos,
            correo,
            telefono,
            direccion,
            ciudad = 'Quito'
        } = req.body;

        // Validación de campos obligatorios
        if (!identificacion || !nombres || !apellidos || !correo || !telefono) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Todos los campos obligatorios deben ser completados (identificación, nombres, apellidos, correo y teléfono)'
            });
        }

        const idLimpia = identificacion.trim();
        const correoLimpio = correo.trim().toLowerCase();
        const nombresLimpios = nombres.trim();
        const apellidosLimpios = apellidos.trim();
        const telefonoLimpio = telefono.trim();
        const direccionLimpia = direccion ? direccion.trim() : null;
        const ciudadLimpia = ciudad ? ciudad.trim() : 'Quito';
        const tipoDocLimpio = (tipo_documento || 'CEDULA').trim().toUpperCase();

        // Validación de formato de identificación para Ecuador
        if (['CEDULA', 'RUC'].includes(tipoDocLimpio) && !esIdentificacionValida(idLimpia)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La identificación ingresada no es válida. Debe tener 10 dígitos (Cédula) o 13 dígitos (RUC)'
            });
        }

        // Validación de formato de correo
        if (!esCorreoValido(correoLimpio)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El correo electrónico proporcionado no tiene un formato válido'
            });
        }

        // Verificación de duplicados con consulta parametrizada
        const [duplicados] = await db.execute(
            'SELECT identificacion, correo FROM clientes WHERE identificacion = ? OR correo = ? LIMIT 1',
            [idLimpia, correoLimpio]
        );

        if (duplicados.length > 0) {
            const repetido = duplicados[0];
            const campo = repetido.identificacion === idLimpia ? 'identificación' : 'correo electrónico';
            return res.status(409).json({
                ok: false,
                mensaje: `Ya existe un cliente registrado con esa ${campo}`
            });
        }

        // Inserción segura parametrizada (RNF04)
        const sql = `
            INSERT INTO clientes (
                tipo_documento,
                identificacion,
                nombres,
                apellidos,
                correo,
                telefono,
                direccion,
                ciudad,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `;

        const [resultado] = await db.execute(sql, [
            tipoDocLimpio,
            idLimpia,
            nombresLimpios,
            apellidosLimpios,
            correoLimpio,
            telefonoLimpio,
            direccionLimpia,
            ciudadLimpia
        ]);

        return res.status(201).json({
            ok: true,
            mensaje: 'Cliente registrado exitosamente en Recepciones Mishell',
            id_cliente: resultado.insertId,
            cliente: {
                id_cliente: resultado.insertId,
                tipo_documento: tipoDocLimpio,
                identificacion: idLimpia,
                nombres: nombresLimpios,
                apellidos: apellidosLimpios,
                correo: correoLimpio,
                telefono: telefonoLimpio,
                direccion: direccionLimpia,
                ciudad: ciudadLimpia,
                estado: 1
            }
        });
    } catch (error) {
        console.error('Error en registrarCliente:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al registrar el cliente',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 4. Actualizar datos de un cliente existente
 * PUT /api/clientes/:id
 */
const actualizarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const idCliente = parseInt(id, 10);

        if (isNaN(idCliente) || idCliente <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de cliente inválido'
            });
        }

        const {
            tipo_documento = 'CEDULA',
            identificacion,
            nombres,
            apellidos,
            correo,
            telefono,
            direccion,
            ciudad = 'Quito'
        } = req.body;

        // Validación de campos obligatorios
        if (!identificacion || !nombres || !apellidos || !correo || !telefono) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Todos los campos obligatorios deben ser completados (identificación, nombres, apellidos, correo y teléfono)'
            });
        }

        const idLimpia = identificacion.trim();
        const correoLimpio = correo.trim().toLowerCase();
        const nombresLimpios = nombres.trim();
        const apellidosLimpios = apellidos.trim();
        const telefonoLimpio = telefono.trim();
        const direccionLimpia = direccion ? direccion.trim() : null;
        const ciudadLimpia = ciudad ? ciudad.trim() : 'Quito';
        const tipoDocLimpio = (tipo_documento || 'CEDULA').trim().toUpperCase();

        // Validaciones de formato
        if (['CEDULA', 'RUC'].includes(tipoDocLimpio) && !esIdentificacionValida(idLimpia)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La identificación debe tener 10 dígitos (Cédula) o 13 dígitos (RUC)'
            });
        }

        if (!esCorreoValido(correoLimpio)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El correo electrónico ingresado no tiene un formato válido'
            });
        }

        // Verificar existencia previa del cliente
        const [existe] = await db.execute(
            'SELECT id_cliente FROM clientes WHERE id_cliente = ? AND estado = 1 LIMIT 1',
            [idCliente]
        );

        if (existe.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Cliente con ID ${idCliente} no encontrado o se encuentra inactivo`
            });
        }

        // Verificar que la nueva cédula o correo no pertenezcan a OTRO cliente
        const [colision] = await db.execute(
            'SELECT id_cliente, identificacion, correo FROM clientes WHERE (identificacion = ? OR correo = ?) AND id_cliente != ? LIMIT 1',
            [idLimpia, correoLimpio, idCliente]
        );

        if (colision.length > 0) {
            const repetido = colision[0];
            const campo = repetido.identificacion === idLimpia ? 'identificación' : 'correo electrónico';
            return res.status(409).json({
                ok: false,
                mensaje: `No se puede actualizar: El/La ${campo} ya está registrado por otro cliente`
            });
        }

        // Ejecutar actualización parametrizada (RNF04)
        const updateSql = `
            UPDATE clientes 
            SET 
                tipo_documento = ?,
                identificacion = ?,
                nombres = ?,
                apellidos = ?,
                correo = ?,
                telefono = ?,
                direccion = ?,
                ciudad = ?
            WHERE id_cliente = ? AND estado = 1
        `;

        const [resultado] = await db.execute(updateSql, [
            tipoDocLimpio,
            idLimpia,
            nombresLimpios,
            apellidosLimpios,
            correoLimpio,
            telefonoLimpio,
            direccionLimpia,
            ciudadLimpia,
            idCliente
        ]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: 'No fue posible actualizar el cliente (no encontrado o inactivo)'
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: 'Cliente actualizado correctamente',
            cliente: {
                id_cliente: idCliente,
                tipo_documento: tipoDocLimpio,
                identificacion: idLimpia,
                nombres: nombresLimpios,
                apellidos: apellidosLimpios,
                correo: correoLimpio,
                telefono: telefonoLimpio,
                direccion: direccionLimpia,
                ciudad: ciudadLimpia
            }
        });
    } catch (error) {
        console.error('Error en actualizarCliente:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al actualizar el cliente',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 5. Eliminar un cliente mediante Baja Lógica (estado = 0)
 * DELETE /api/clientes/:id
 * Preserva la integridad referencial de cotizaciones y reservas asociadas (RNF04).
 */
const eliminarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const idCliente = parseInt(id, 10);

        if (isNaN(idCliente) || idCliente <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de cliente inválido'
            });
        }

        // Consulta parametrizada para baja lógica
        const [resultado] = await db.execute(
            'UPDATE clientes SET estado = 0 WHERE id_cliente = ? AND estado = 1',
            [idCliente]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Cliente con ID ${idCliente} no encontrado o ya fue dado de baja previamente`
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: 'Cliente dado de baja correctamente (baja lógica)'
        });
    } catch (error) {
        console.error('Error en eliminarCliente:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al procesar la baja del cliente',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerClientes,
    obtenerClientePorId,
    registrarCliente,
    actualizarCliente,
    eliminarCliente
};

