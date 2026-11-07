/**
 * Controlador de Servicios
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * 
 * Requisito No Funcional RNF04: Seguridad contra Inyección SQL (SQL Injection).
 * Todas las operaciones utilizan consultas parametrizadas con placeholders (?) mediante MySQL2.
 * Estructura de respuestas estándar: { ok: true/false, ... }
 */

const rawDb = require('../config/db');

// Soporte para pool directo de mysql2/promise o instancias con .promise()
const db = rawDb.promise ? rawDb.promise() : rawDb;

// Categorías válidas de acuerdo al esquema de la base de datos
const CATEGORIAS_VALIDAS = [
    'CATERING',
    'DECORACION',
    'LOCAL_SALON',
    'SONIDO_LUCES',
    'FOTOGRAFIA_VIDEO',
    'ANIMACION_DJ',
    'OTROS'
];

/**
 * 1. Obtener lista de servicios activos (con filtro opcional de búsqueda y categoría)
 * GET /api/servicios
 */
const obtenerServicios = async (req, res) => {
    try {
        const { buscar, categoria } = req.query;

        let sql = `
            SELECT 
                id_servicio,
                codigo,
                nombre_servicio,
                descripcion,
                categoria,
                precio_unitario,
                capacidad_max,
                estado,
                created_at,
                updated_at
            FROM servicios 
            WHERE estado = 1
        `;
        const params = [];

        // Filtro por categoría (si se envía)
        if (categoria && categoria.trim() !== '') {
            sql += ` AND categoria = ?`;
            params.push(categoria.trim().toUpperCase());
        }

        // Filtro de búsqueda segura por código, nombre o descripción
        if (buscar && buscar.trim() !== '') {
            const termino = `%${buscar.trim()}%`;
            sql += ` AND (codigo LIKE ? OR nombre_servicio LIKE ? OR descripcion LIKE ?)`;
            params.push(termino, termino, termino);
        }

        sql += ` ORDER BY id_servicio DESC`;

        const [servicios] = await db.execute(sql, params);

        return res.status(200).json({
            ok: true,
            total: servicios.length,
            servicios
        });
    } catch (error) {
        console.error('Error en obtenerServicios:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al obtener la lista de servicios',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 2. Obtener un servicio por su ID
 * GET /api/servicios/:id
 */
const obtenerServicioPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const idServicio = parseInt(id, 10);

        if (isNaN(idServicio) || idServicio <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El identificador del servicio no es válido'
            });
        }

        const [rows] = await db.execute(
            `SELECT 
                id_servicio,
                codigo,
                nombre_servicio,
                descripcion,
                categoria,
                precio_unitario,
                capacidad_max,
                estado,
                created_at,
                updated_at
            FROM servicios 
            WHERE id_servicio = ? AND estado = 1 
            LIMIT 1`,
            [idServicio]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Servicio con ID ${idServicio} no encontrado o se encuentra descontinuado`
            });
        }

        return res.status(200).json({
            ok: true,
            servicio: rows[0]
        });
    } catch (error) {
        console.error('Error en obtenerServicioPorId:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al consultar el servicio',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 3. Registrar un nuevo servicio (validando código único)
 * POST /api/servicios
 */
const registrarServicio = async (req, res) => {
    try {
        const {
            codigo,
            nombre_servicio,
            descripcion,
            categoria,
            precio_unitario,
            capacidad_max
        } = req.body;

        // Validación de campos obligatorios
        if (!codigo || !nombre_servicio || !categoria || precio_unitario === undefined || precio_unitario === null) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Campos obligatorios requeridos: código, nombre del servicio, categoría y precio unitario'
            });
        }

        const codigoLimpio = codigo.trim().toUpperCase();
        const nombreLimpio = nombre_servicio.trim();
        const categoriaLimpia = categoria.trim().toUpperCase();
        const descripcionLimpia = descripcion ? descripcion.trim() : null;
        const precio = parseFloat(precio_unitario);
        const capacidad = capacidad_max !== undefined && capacidad_max !== null && capacidad_max !== '' 
            ? parseInt(capacidad_max, 10) 
            : null;

        // Validar formato de precio
        if (isNaN(precio) || precio < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El precio unitario debe ser un valor numérico mayor o igual a cero'
            });
        }

        // Validar categoría válida según ENUM
        if (!CATEGORIAS_VALIDAS.includes(categoriaLimpia)) {
            return res.status(400).json({
                ok: false,
                mensaje: `Categoría inválida. Debe ser una de las siguientes: ${CATEGORIAS_VALIDAS.join(', ')}`
            });
        }

        // Validar capacidad si se envía
        if (capacidad !== null && (isNaN(capacidad) || capacidad < 0)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La capacidad máxima debe ser un número entero positivo'
            });
        }

        // Validación de unicidad del código del servicio con consulta parametrizada (RNF04)
        const [codigoExiste] = await db.execute(
            'SELECT id_servicio, codigo FROM servicios WHERE codigo = ? LIMIT 1',
            [codigoLimpio]
        );

        if (codigoExiste.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: `Ya existe un servicio registrado con el código "${codigoLimpio}". Por favor, elija otro código único.`
            });
        }

        // Inserción segura parametrizada
        const insertSql = `
            INSERT INTO servicios (
                codigo,
                nombre_servicio,
                descripcion,
                categoria,
                precio_unitario,
                capacidad_max,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `;

        const [resultado] = await db.execute(insertSql, [
            codigoLimpio,
            nombreLimpio,
            descripcionLimpia,
            categoriaLimpia,
            precio,
            capacidad
        ]);

        return res.status(201).json({
            ok: true,
            mensaje: 'Servicio registrado exitosamente en el catálogo de Recepciones Mishell',
            id_servicio: resultado.insertId,
            servicio: {
                id_servicio: resultado.insertId,
                codigo: codigoLimpio,
                nombre_servicio: nombreLimpio,
                descripcion: descripcionLimpia,
                categoria: categoriaLimpia,
                precio_unitario: precio,
                capacidad_max: capacidad,
                estado: 1
            }
        });
    } catch (error) {
        console.error('Error en registrarServicio:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al registrar el servicio',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 4. Actualizar un servicio existente
 * PUT /api/servicios/:id
 */
const actualizarServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const idServicio = parseInt(id, 10);

        if (isNaN(idServicio) || idServicio <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de servicio inválido'
            });
        }

        const {
            codigo,
            nombre_servicio,
            descripcion,
            categoria,
            precio_unitario,
            capacidad_max
        } = req.body;

        // Validar campos obligatorios
        if (!codigo || !nombre_servicio || !categoria || precio_unitario === undefined || precio_unitario === null) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Campos requeridos: código, nombre del servicio, categoría y precio unitario'
            });
        }

        const codigoLimpio = codigo.trim().toUpperCase();
        const nombreLimpio = nombre_servicio.trim();
        const categoriaLimpia = categoria.trim().toUpperCase();
        const descripcionLimpia = descripcion ? descripcion.trim() : null;
        const precio = parseFloat(precio_unitario);
        const capacidad = capacidad_max !== undefined && capacidad_max !== null && capacidad_max !== '' 
            ? parseInt(capacidad_max, 10) 
            : null;

        if (isNaN(precio) || precio < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El precio unitario debe ser un valor numérico mayor o igual a cero'
            });
        }

        if (!CATEGORIAS_VALIDAS.includes(categoriaLimpia)) {
            return res.status(400).json({
                ok: false,
                mensaje: `Categoría inválida. Debe ser una de las siguientes: ${CATEGORIAS_VALIDAS.join(', ')}`
            });
        }

        if (capacidad !== null && (isNaN(capacidad) || capacidad < 0)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La capacidad máxima debe ser un número entero positivo'
            });
        }

        // Verificar que el servicio exista y esté activo
        const [servicioExiste] = await db.execute(
            'SELECT id_servicio FROM servicios WHERE id_servicio = ? AND estado = 1 LIMIT 1',
            [idServicio]
        );

        if (servicioExiste.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Servicio con ID ${idServicio} no encontrado o se encuentra inactivo`
            });
        }

        // Verificar que el código no colisione con OTRO servicio diferente
        const [colision] = await db.execute(
            'SELECT id_servicio, codigo FROM servicios WHERE codigo = ? AND id_servicio != ? LIMIT 1',
            [codigoLimpio, idServicio]
        );

        if (colision.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: `No se puede actualizar: El código "${codigoLimpio}" ya pertenece a otro servicio`
            });
        }

        // Actualización segura parametrizada (RNF04)
        const updateSql = `
            UPDATE servicios 
            SET 
                codigo = ?,
                nombre_servicio = ?,
                descripcion = ?,
                categoria = ?,
                precio_unitario = ?,
                capacidad_max = ?
            WHERE id_servicio = ? AND estado = 1
        `;

        const [resultado] = await db.execute(updateSql, [
            codigoLimpio,
            nombreLimpio,
            descripcionLimpia,
            categoriaLimpia,
            precio,
            capacidad,
            idServicio
        ]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: 'No fue posible actualizar el servicio (no encontrado o inactivo)'
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: 'Servicio actualizado correctamente',
            servicio: {
                id_servicio: idServicio,
                codigo: codigoLimpio,
                nombre_servicio: nombreLimpio,
                descripcion: descripcionLimpia,
                categoria: categoriaLimpia,
                precio_unitario: precio,
                capacidad_max: capacidad
            }
        });
    } catch (error) {
        console.error('Error en actualizarServicio:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al actualizar el servicio',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 5. Eliminar un servicio mediante Baja Lógica (estado = 0)
 * DELETE /api/servicios/:id
 * Conserva el historial de servicios asociados en cotizaciones pasadas.
 */
const eliminarServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const idServicio = parseInt(id, 10);

        if (isNaN(idServicio) || idServicio <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de servicio inválido'
            });
        }

        // Baja lógica parametrizada
        const [resultado] = await db.execute(
            'UPDATE servicios SET estado = 0 WHERE id_servicio = ? AND estado = 1',
            [idServicio]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Servicio con ID ${idServicio} no encontrado o ya fue dado de baja previamente`
            });
        }

        return res.status(200).json({
            ok: true,
            mensaje: 'Servicio descontinuado correctamente (baja lógica)'
        });
    } catch (error) {
        console.error('Error en eliminarServicio:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al procesar la baja del servicio',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerServicios,
    obtenerServicioPorId,
    registrarServicio,
    actualizarServicio,
    eliminarServicio
};

