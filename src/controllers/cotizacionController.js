/**
 * Controlador de Cotizaciones y Detalle de Cotización
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * 
 * Requisito No Funcional RNF04: Seguridad contra Inyección SQL (SQL Injection).
 * Manejo de transacciones ACID (beginTransaction, commit, rollback) para la integridad de datos.
 * Cálculo automático de Subtotal, IVA (15% según SRI Ecuador) y Total.
 * Generación de código correlativo diario: COT-YYYYMMDD-XXX
 */

const rawDb = require('../config/db');

// Soporte para pool directo de mysql2/promise o instancias con .promise()
const pool = rawDb.promise ? rawDb.promise() : rawDb;

// Estados permitidos según el esquema de la base de datos
const ESTADOS_VALIDOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA'];

// Tasa de IVA vigente en Ecuador (15%)
const TASA_IVA = 0.15;

/**
 * Función auxiliar para generar el código correlativo de cotización (COT-YYYYMMDD-XXX)
 * Bloquea registros de hoy con FOR UPDATE para prevenir condiciones de carrera.
 */
const generarCodigoCotizacion = async (connection) => {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const dd = String(ahora.getDate()).padStart(2, '0');
    const fechaPrefijo = `${yyyy}${mm}${dd}`;
    const prefijoBusqueda = `COT-${fechaPrefijo}-%`;

    // Buscar el último código generado el día de hoy dentro de la transacción
    const [rows] = await connection.execute(
        `SELECT codigo_cotizacion 
         FROM cotizaciones 
         WHERE codigo_cotizacion LIKE ? 
         ORDER BY id_cotizacion DESC 
         LIMIT 1 
         FOR UPDATE`,
        [prefijoBusqueda]
    );

    let siguienteSecuencia = 1;
    if (rows.length > 0) {
        const ultimoCodigo = rows[0].codigo_cotizacion;
        const partes = ultimoCodigo.split('-');
        if (partes.length === 3) {
            const numeroActual = parseInt(partes[2], 10);
            if (!isNaN(numeroActual)) {
                siguienteSecuencia = numeroActual + 1;
            }
        }
    }

    const secuenciaPadded = String(siguienteSecuencia).padStart(3, '0');
    return `COT-${fechaPrefijo}-${secuenciaPadded}`;
};

/**
 * 1. Obtener lista de cotizaciones (con datos del cliente asociado)
 * GET /api/cotizaciones
 */
const obtenerCotizaciones = async (req, res) => {
    try {
        const { estado, buscar } = req.query;

        let sql = `
            SELECT 
                c.id_cotizacion,
                c.codigo_cotizacion,
                c.tipo_evento,
                c.fecha_evento,
                c.num_invitados,
                c.lugar_evento,
                c.subtotal,
                c.iva,
                c.total,
                c.estado,
                c.observaciones,
                c.created_at,
                c.updated_at,
                cl.id_cliente,
                cl.tipo_documento AS cliente_tipo_documento,
                cl.identificacion AS cliente_identificacion,
                CONCAT(cl.nombres, ' ', cl.apellidos) AS cliente_nombre,
                cl.correo AS cliente_correo,
                cl.telefono AS cliente_telefono,
                u.id_usuario,
                u.nombre_completo AS usuario_nombre
            FROM cotizaciones c
            INNER JOIN clientes cl ON c.id_cliente = cl.id_cliente
            INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
            WHERE 1=1
        `;
        const params = [];

        // Filtro por estado
        if (estado && ESTADOS_VALIDOS.includes(estado.trim().toUpperCase())) {
            sql += ` AND c.estado = ?`;
            params.push(estado.trim().toUpperCase());
        }

        // Búsqueda por código, identificación o nombre del cliente
        if (buscar && buscar.trim() !== '') {
            const termino = `%${buscar.trim()}%`;
            sql += ` AND (
                c.codigo_cotizacion LIKE ? OR 
                cl.identificacion LIKE ? OR 
                cl.nombres LIKE ? OR 
                cl.apellidos LIKE ? OR 
                c.tipo_evento LIKE ?
            )`;
            params.push(termino, termino, termino, termino, termino);
        }

        sql += ` ORDER BY c.id_cotizacion DESC`;

        const [cotizaciones] = await pool.execute(sql, params);

        return res.status(200).json({
            ok: true,
            total: cotizaciones.length,
            cotizaciones
        });
    } catch (error) {
        console.error('Error en obtenerCotizaciones:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al obtener las cotizaciones',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 2. Obtener cotización completa por ID (con cabecera y detalle de servicios)
 * GET /api/cotizaciones/:id
 */
const obtenerCotizacionPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const idCotizacion = parseInt(id, 10);

        if (isNaN(idCotizacion) || idCotizacion <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de cotización inválido'
            });
        }

        // 1. Consultar cabecera con cliente y usuario
        const [cabecera] = await pool.execute(
            `SELECT 
                c.id_cotizacion,
                c.codigo_cotizacion,
                c.tipo_evento,
                c.fecha_evento,
                c.num_invitados,
                c.lugar_evento,
                c.subtotal,
                c.iva,
                c.total,
                c.estado,
                c.observaciones,
                c.created_at,
                c.updated_at,
                cl.id_cliente,
                cl.tipo_documento AS cliente_tipo_documento,
                cl.identificacion AS cliente_identificacion,
                CONCAT(cl.nombres, ' ', cl.apellidos) AS cliente_nombre,
                cl.correo AS cliente_correo,
                cl.telefono AS cliente_telefono,
                cl.direccion AS cliente_direccion,
                cl.ciudad AS cliente_ciudad,
                u.id_usuario,
                u.nombre_completo AS usuario_nombre,
                u.correo AS usuario_correo
            FROM cotizaciones c
            INNER JOIN clientes cl ON c.id_cliente = cl.id_cliente
            INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
            WHERE c.id_cotizacion = ? 
            LIMIT 1`,
            [idCotizacion]
        );

        if (cabecera.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Cotización con ID ${idCotizacion} no encontrada`
            });
        }

        // 2. Consultar desglose de servicios asociados en detalle_cotizacion
        const [detalle] = await pool.execute(
            `SELECT 
                d.id_detalle,
                d.id_servicio,
                s.codigo AS servicio_codigo,
                s.nombre_servicio,
                s.categoria AS servicio_categoria,
                d.cantidad,
                d.precio_unitario,
                d.subtotal,
                d.observaciones
            FROM detalle_cotizacion d
            INNER JOIN servicios s ON d.id_servicio = s.id_servicio
            WHERE d.id_cotizacion = ?
            ORDER BY d.id_detalle ASC`,
            [idCotizacion]
        );

        return res.status(200).json({
            ok: true,
            cotizacion: {
                ...cabecera[0],
                detalle
            }
        });
    } catch (error) {
        console.error('Error en obtenerCotizacionPorId:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al consultar la cotización',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 3. Crear una nueva cotización (Cabecera y Detalle en una Transacción SQL)
 * POST /api/cotizaciones
 * 
 * Body esperado:
 * {
 *   "id_cliente": 1,
 *   "id_usuario": 1,
 *   "tipo_evento": "Boda Elegance",
 *   "fecha_evento": "2026-12-15",
 *   "num_invitados": 120,
 *   "lugar_evento": "Salón Mishell - Quito",
 *   "observaciones": "Decoración temática dorado y blanco",
 *   "servicios": [
 *     { "id_servicio": 1, "cantidad": 1, "observaciones": "Salón principal" },
 *     { "id_servicio": 2, "cantidad": 120, "precio_unitario": 14.50 }
 *   ]
 * }
 */
const crearCotizacion = async (req, res) => {
    // Obtenemos una conexión dedicada del pool para la transacción
    const connection = await pool.getConnection();

    try {
        const {
            id_cliente,
            id_usuario = 1, // Por defecto el administrador inicial si no se envía sesión
            tipo_evento,
            fecha_evento,
            num_invitados = 50,
            lugar_evento = 'Salón Mishell - Quito',
            observaciones,
            servicios
        } = req.body;

        // 1. Validaciones básicas de campos obligatorios
        if (!id_cliente || !tipo_evento || !fecha_evento) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Campos obligatorios requeridos: id_cliente, tipo_evento y fecha_evento'
            });
        }

        if (!Array.isArray(servicios) || servicios.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La cotización debe incluir al menos un servicio en el detalle (arreglo servicios)'
            });
        }

        // 2. Iniciar Transacción SQL ACID
        await connection.beginTransaction();

        // 3. Validar existencia y estado activo del cliente
        const [clienteRows] = await connection.execute(
            'SELECT id_cliente, nombres, apellidos FROM clientes WHERE id_cliente = ? AND estado = 1 LIMIT 1',
            [id_cliente]
        );

        if (clienteRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                ok: false,
                mensaje: `El cliente con ID ${id_cliente} no existe o se encuentra inactivo`
            });
        }

        // 4. Validar existencia del usuario/organizador
        const [usuarioRows] = await connection.execute(
            'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1 LIMIT 1',
            [id_usuario]
        );

        if (usuarioRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                ok: false,
                mensaje: `El usuario con ID ${id_usuario} no es válido o está inactivo`
            });
        }

        // 5. Procesar y verificar cada servicio del detalle
        let subtotalAcumulado = 0;
        const detalleProcesado = [];

        for (const item of servicios) {
            const idServicio = parseInt(item.id_servicio, 10);
            const cantidad = parseInt(item.cantidad, 10);

            if (isNaN(idServicio) || idServicio <= 0) {
                await connection.rollback();
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Cada ítem del detalle debe tener un id_servicio válido'
                });
            }

            if (isNaN(cantidad) || cantidad <= 0) {
                await connection.rollback();
                return res.status(400).json({
                    ok: false,
                    mensaje: `La cantidad para el servicio ID ${idServicio} debe ser un entero positivo`
                });
            }

            // Consultar datos reales del servicio en base de datos
            const [servicioDb] = await connection.execute(
                'SELECT id_servicio, nombre_servicio, precio_unitario FROM servicios WHERE id_servicio = ? AND estado = 1 LIMIT 1',
                [idServicio]
            );

            if (servicioDb.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    ok: false,
                    mensaje: `El servicio con ID ${idServicio} no existe o está descontinuado`
                });
            }

            // Si el cliente envía un precio personalizado válido se respeta, de lo contrario se toma el de la BD
            let precioUnitario = parseFloat(item.precio_unitario);
            if (isNaN(precioUnitario) || precioUnitario < 0) {
                precioUnitario = parseFloat(servicioDb[0].precio_unitario);
            }

            const subtotalItem = Number((cantidad * precioUnitario).toFixed(2));
            subtotalAcumulado += subtotalItem;

            detalleProcesado.push({
                id_servicio: idServicio,
                nombre_servicio: servicioDb[0].nombre_servicio,
                cantidad,
                precio_unitario: precioUnitario,
                subtotal: subtotalItem,
                observaciones: item.observaciones ? item.observaciones.trim() : null
            });
        }

        // 6. Cálculos financieros oficiales (Ecuador: Subtotal + 15% IVA = Total)
        const subtotalFinal = Number(subtotalAcumulado.toFixed(2));
        const ivaFinal = Number((subtotalFinal * TASA_IVA).toFixed(2));
        const totalFinal = Number((subtotalFinal + ivaFinal).toFixed(2));

        // 7. Generar código correlativo único con formato COT-YYYYMMDD-XXX
        const codigoCotizacion = await generarCodigoCotizacion(connection);

        // 8. Insertar cabecera de cotización
        const insertCabeceraSql = `
            INSERT INTO cotizaciones (
                codigo_cotizacion,
                id_cliente,
                id_usuario,
                tipo_evento,
                fecha_evento,
                num_invitados,
                lugar_evento,
                subtotal,
                iva,
                total,
                estado,
                observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?)
        `;

        const [resultadoCabecera] = await connection.execute(insertCabeceraSql, [
            codigoCotizacion,
            id_cliente,
            id_usuario,
            tipo_evento.trim(),
            fecha_evento,
            parseInt(num_invitados, 10) || 50,
            lugar_evento ? lugar_evento.trim() : 'Salón Mishell - Quito',
            subtotalFinal,
            ivaFinal,
            totalFinal,
            observaciones ? observaciones.trim() : null
        ]);

        const idCotizacionNueva = resultadoCabecera.insertId;

        // 9. Insertar cada fila del detalle en detalle_cotizacion
        const insertDetalleSql = `
            INSERT INTO detalle_cotizacion (
                id_cotizacion,
                id_servicio,
                cantidad,
                precio_unitario,
                subtotal,
                observaciones
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        for (const detalleItem of detalleProcesado) {
            await connection.execute(insertDetalleSql, [
                idCotizacionNueva,
                detalleItem.id_servicio,
                detalleItem.cantidad,
                detalleItem.precio_unitario,
                detalleItem.subtotal,
                detalleItem.observaciones
            ]);
        }

        // 10. Confirmar la transacción (COMMIT)
        await connection.commit();

        return res.status(201).json({
            ok: true,
            mensaje: 'Cotización registrada exitosamente con su desglose de servicios',
            cotizacion: {
                id_cotizacion: idCotizacionNueva,
                codigo_cotizacion: codigoCotizacion,
                id_cliente,
                cliente: `${clienteRows[0].nombres} ${clienteRows[0].apellidos}`,
                tipo_evento: tipo_evento.trim(),
                fecha_evento,
                num_invitados: parseInt(num_invitados, 10) || 50,
                lugar_evento: lugar_evento ? lugar_evento.trim() : 'Salón Mishell - Quito',
                subtotal: subtotalFinal,
                iva: ivaFinal,
                total: totalFinal,
                estado: 'PENDIENTE',
                items_registrados: detalleProcesado.length,
                detalle: detalleProcesado
            }
        });
    } catch (error) {
        // En caso de cualquier error se revierte la transacción para no dejar datos huérfanos
        await connection.rollback();
        console.error('Error en crearCotizacion:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al procesar la cotización. La transacción fue revertida.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        // Siempre liberar la conexión de vuelta al pool
        connection.release();
    }
};

/**
 * 4. Cambiar el estado de una cotización
 * PATCH o PUT /api/cotizaciones/:id/estado
 * Body: { "estado": "APROBADA" | "RECHAZADA" | "PENDIENTE" | "VENCIDA" }
 */
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const idCotizacion = parseInt(id, 10);

        if (isNaN(idCotizacion) || idCotizacion <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de cotización inválido'
            });
        }

        if (!estado || typeof estado !== 'string') {
            return res.status(400).json({
                ok: false,
                mensaje: 'El campo estado es requerido'
            });
        }

        const estadoNormalizado = estado.trim().toUpperCase();

        if (!ESTADOS_VALIDOS.includes(estadoNormalizado)) {
            return res.status(400).json({
                ok: false,
                mensaje: `Estado no válido. Los estados permitidos son: ${ESTADOS_VALIDOS.join(', ')}`
            });
        }

        // Verificar que la cotización exista
        const [existe] = await pool.execute(
            'SELECT id_cotizacion, codigo_cotizacion, estado FROM cotizaciones WHERE id_cotizacion = ? LIMIT 1',
            [idCotizacion]
        );

        if (existe.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Cotización con ID ${idCotizacion} no encontrada`
            });
        }

        // Actualización parametrizada (RNF04)
        await pool.execute(
            'UPDATE cotizaciones SET estado = ? WHERE id_cotizacion = ?',
            [estadoNormalizado, idCotizacion]
        );

        return res.status(200).json({
            ok: true,
            mensaje: `El estado de la cotización ${existe[0].codigo_cotizacion} ha sido actualizado a ${estadoNormalizado}`,
            data: {
                id_cotizacion: idCotizacion,
                codigo_cotizacion: existe[0].codigo_cotizacion,
                estado_anterior: existe[0].estado,
                estado_nuevo: estadoNormalizado
            }
        });
    } catch (error) {
        console.error('Error en cambiarEstado:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al actualizar el estado de la cotización',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    crearCotizacion,
    cambiarEstado
};

