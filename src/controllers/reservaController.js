/**
 * Controlador de Reservas
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * 
 * Requisito No Funcional RNF04: Seguridad contra Inyección SQL (SQL Injection).
 * Manejo de transacciones ACID (beginTransaction, commit, rollback) para la formalización de reservas.
 * Validación de cotizaciones aprobadas, verificación de anticipos y cálculo de saldo pendiente.
 * Generación de código correlativo diario: RES-YYYYMMDD-XXX
 */

const rawDb = require('../config/db');

// Soporte para pool directo de mysql2/promise o instancias con .promise()
const pool = rawDb.promise ? rawDb.promise() : rawDb;

// Estados permitidos en la base de datos con normalización flexible
const ESTADOS_VALIDOS = ['CONFIRMADA', 'PAGADA_TOTAL', 'EN_EJECUCION', 'FINALIZADA', 'CANCELADA'];

/**
 * Normaliza estados provenientes del cliente hacia el ENUM oficial de MySQL
 */
const normalizarEstado = (estado) => {
    if (!estado || typeof estado !== 'string') return null;
    const est = estado.trim().toUpperCase();
    if (est === 'EN_PROCESO') return 'EN_EJECUCION';
    if (est === 'COMPLETADA') return 'FINALIZADA';
    if (ESTADOS_VALIDOS.includes(est)) return est;
    return null;
};

/**
 * Función auxiliar para generar el código correlativo de reserva (RES-YYYYMMDD-XXX)
 * Usa bloqueo FOR UPDATE para asegurar unicidad ante concurrencia.
 */
const generarCodigoReserva = async (connection) => {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const dd = String(ahora.getDate()).padStart(2, '0');
    const fechaPrefijo = `${yyyy}${mm}${dd}`;
    const prefijoBusqueda = `RES-${fechaPrefijo}-%`;

    const [rows] = await connection.execute(
        `SELECT codigo_reserva 
         FROM reservas 
         WHERE codigo_reserva LIKE ? 
         ORDER BY id_reserva DESC 
         LIMIT 1 
         FOR UPDATE`,
        [prefijoBusqueda]
    );

    let siguienteSecuencia = 1;
    if (rows.length > 0) {
        const ultimoCodigo = rows[0].codigo_reserva;
        const partes = ultimoCodigo.split('-');
        if (partes.length === 3) {
            const numeroActual = parseInt(partes[2], 10);
            if (!isNaN(numeroActual)) {
                siguienteSecuencia = numeroActual + 1;
            }
        }
    }

    const secuenciaPadded = String(siguienteSecuencia).padStart(3, '0');
    return `RES-${fechaPrefijo}-${secuenciaPadded}`;
};

/**
 * 1. Obtener lista de reservas (asociando cotización y cliente)
 * GET /api/reservas
 */
const obtenerReservas = async (req, res) => {
    try {
        const { estado, fecha, buscar } = req.query;

        let sql = `
            SELECT 
                r.id_reserva,
                r.codigo_reserva,
                r.fecha_evento,
                r.hora_inicio,
                r.hora_fin,
                r.lugar_evento,
                r.total_evento,
                r.monto_anticipo,
                r.saldo_pendiente,
                r.estado,
                r.observaciones,
                r.created_at,
                r.updated_at,
                cl.id_cliente,
                cl.tipo_documento AS cliente_tipo_documento,
                cl.identificacion AS cliente_identificacion,
                CONCAT(cl.nombres, ' ', cl.apellidos) AS cliente_nombre,
                cl.telefono AS cliente_telefono,
                cl.correo AS cliente_correo,
                c.id_cotizacion,
                c.codigo_cotizacion,
                c.tipo_evento,
                c.num_invitados,
                u.id_usuario,
                u.nombre_completo AS usuario_nombre
            FROM reservas r
            INNER JOIN clientes cl ON r.id_cliente = cl.id_cliente
            INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
            LEFT JOIN cotizaciones c ON r.id_cotizacion = c.id_cotizacion
            WHERE 1=1
        `;
        const params = [];

        // Filtro por estado
        const estadoNorm = normalizarEstado(estado);
        if (estadoNorm) {
            sql += ` AND r.estado = ?`;
            params.push(estadoNorm);
        }

        // Filtro por fecha específica del evento (YYYY-MM-DD)
        if (fecha && fecha.trim() !== '') {
            sql += ` AND r.fecha_evento = ?`;
            params.push(fecha.trim());
        }

        // Búsqueda por código de reserva, código de cotización, nombre o cédula del cliente
        if (buscar && buscar.trim() !== '') {
            const termino = `%${buscar.trim()}%`;
            sql += ` AND (
                r.codigo_reserva LIKE ? OR 
                c.codigo_cotizacion LIKE ? OR 
                cl.identificacion LIKE ? OR 
                cl.nombres LIKE ? OR 
                cl.apellidos LIKE ? OR
                c.tipo_evento LIKE ?
            )`;
            params.push(termino, termino, termino, termino, termino, termino);
        }

        sql += ` ORDER BY r.fecha_evento ASC, r.hora_inicio ASC`;

        const [reservas] = await pool.execute(sql, params);

        return res.status(200).json({
            ok: true,
            total: reservas.length,
            reservas
        });
    } catch (error) {
        console.error('Error en obtenerReservas:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al obtener las reservas',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 2. Obtener detalles de una reserva por su ID
 * GET /api/reservas/:id
 */
const obtenerReservaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const idReserva = parseInt(id, 10);

        if (isNaN(idReserva) || idReserva <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de reserva inválido'
            });
        }

        // 1. Consultar datos de la reserva con cliente, usuario y cotización asociada
        const [cabecera] = await pool.execute(
            `SELECT 
                r.id_reserva,
                r.codigo_reserva,
                r.fecha_evento,
                r.hora_inicio,
                r.hora_fin,
                r.lugar_evento,
                r.total_evento,
                r.monto_anticipo,
                r.saldo_pendiente,
                r.estado,
                r.observaciones,
                r.created_at,
                r.updated_at,
                cl.id_cliente,
                cl.tipo_documento AS cliente_tipo_documento,
                cl.identificacion AS cliente_identificacion,
                CONCAT(cl.nombres, ' ', cl.apellidos) AS cliente_nombre,
                cl.correo AS cliente_correo,
                cl.telefono AS cliente_telefono,
                cl.direccion AS cliente_direccion,
                cl.ciudad AS cliente_ciudad,
                c.id_cotizacion,
                c.codigo_cotizacion,
                c.tipo_evento,
                c.num_invitados,
                c.subtotal AS cotizacion_subtotal,
                c.iva AS cotizacion_iva,
                u.id_usuario,
                u.nombre_completo AS usuario_nombre,
                u.correo AS usuario_correo
            FROM reservas r
            INNER JOIN clientes cl ON r.id_cliente = cl.id_cliente
            INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
            LEFT JOIN cotizaciones c ON r.id_cotizacion = c.id_cotizacion
            WHERE r.id_reserva = ? 
            LIMIT 1`,
            [idReserva]
        );

        if (cabecera.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Reserva con ID ${idReserva} no encontrada`
            });
        }

        const reserva = cabecera[0];

        // 2. Si tiene cotización asociada, obtener el detalle de servicios contratados
        let serviciosContratados = [];
        if (reserva.id_cotizacion) {
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
                [reserva.id_cotizacion]
            );
            serviciosContratados = detalle;
        }

        return res.status(200).json({
            ok: true,
            reserva: {
                ...reserva,
                servicios_contratados: serviciosContratados
            }
        });
    } catch (error) {
        console.error('Error en obtenerReservaPorId:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al consultar la reserva',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 3. Crear una nueva reserva a partir de una cotización aprobada
 * POST /api/reservas
 * 
 * Body esperado:
 * {
 *   "id_cotizacion": 1,
 *   "id_usuario": 1,
 *   "hora_inicio": "18:00:00",
 *   "hora_fin": "02:00:00",
 *   "monto_anticipo": 1000.00,
 *   "lugar_evento": "Salón de Eventos Mishell - Quito", // Opcional, toma el de la cotización por defecto
 *   "fecha_evento": "2026-12-15", // Opcional, toma el de la cotización por defecto
 *   "observaciones": "Reserva confirmada con anticipo bancario"
 * }
 */
const crearReserva = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            id_cotizacion,
            id_usuario = 1,
            hora_inicio,
            hora_fin,
            monto_anticipo,
            lugar_evento,
            fecha_evento,
            observaciones
        } = req.body;

        // 1. Validaciones básicas de campos obligatorios
        if (!id_cotizacion || !hora_inicio || !hora_fin || monto_anticipo === undefined || monto_anticipo === null) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Campos obligatorios requeridos: id_cotizacion, hora_inicio, hora_fin y monto_anticipo'
            });
        }

        const idCot = parseInt(id_cotizacion, 10);
        if (isNaN(idCot) || idCot <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El id_cotizacion no es válido'
            });
        }

        const anticipo = parseFloat(monto_anticipo);
        if (isNaN(anticipo) || anticipo <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El monto de anticipo debe ser un valor numérico mayor a cero para formalizar la reserva'
            });
        }

        // 2. Iniciar Transacción SQL ACID
        await connection.beginTransaction();

        // 3. Consultar cotización aprobada con bloqueo FOR UPDATE
        const [cotRows] = await connection.execute(
            `SELECT 
                id_cotizacion,
                codigo_cotizacion,
                id_cliente,
                tipo_evento,
                fecha_evento,
                lugar_evento,
                total,
                estado 
            FROM cotizaciones 
            WHERE id_cotizacion = ? 
            FOR UPDATE`,
            [idCot]
        );

        if (cotRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                ok: false,
                mensaje: `La cotización con ID ${idCot} no existe`
            });
        }

        const cotizacion = cotRows[0];

        // 4. Validar que la cotización esté APROBADA
        if (cotizacion.estado !== 'APROBADA') {
            await connection.rollback();
            return res.status(400).json({
                ok: false,
                mensaje: `La cotización ${cotizacion.codigo_cotizacion} debe estar en estado 'APROBADA' para formalizar una reserva (Estado actual: ${cotizacion.estado})`
            });
        }

        // 5. Validar que la cotización NO tenga ya una reserva vinculada (relación 1:1)
        const [reservaPrevia] = await connection.execute(
            'SELECT id_reserva, codigo_reserva FROM reservas WHERE id_cotizacion = ? LIMIT 1',
            [idCot]
        );

        if (reservaPrevia.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                ok: false,
                mensaje: `La cotización ${cotizacion.codigo_cotizacion} ya cuenta con la reserva registrada: ${reservaPrevia[0].codigo_reserva}`
            });
        }

        // 6. Validar usuario/organizador
        const idUser = parseInt(id_usuario, 10) || 1;
        const [userRows] = await connection.execute(
            'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1 LIMIT 1',
            [idUser]
        );

        if (userRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                ok: false,
                mensaje: `El usuario con ID ${idUser} no existe o se encuentra inactivo`
            });
        }

        // 7. Determinar fecha y lugar del evento
        const fechaFinal = fecha_evento ? fecha_evento.trim() : cotizacion.fecha_evento;
        const lugarFinal = lugar_evento && lugar_evento.trim() !== '' 
            ? lugar_evento.trim() 
            : (cotizacion.lugar_evento || 'Salón de Eventos Mishell - Quito');

        // Validar formato de fecha y que no sea anterior a hoy
        const hoy = new Date().toISOString().split('T')[0];
        const fechaComparar = typeof fechaFinal === 'string' 
            ? fechaFinal 
            : new Date(fechaFinal).toISOString().split('T')[0];

        if (fechaComparar < hoy) {
            await connection.rollback();
            return res.status(400).json({
                ok: false,
                mensaje: 'La fecha del evento no puede ser una fecha pasada'
            });
        }

        // 8. Cálculos financieros: Total, Anticipo y Saldo Pendiente
        const totalEvento = parseFloat(cotizacion.total);

        if (anticipo > totalEvento) {
            await connection.rollback();
            return res.status(400).json({
                ok: false,
                mensaje: `El monto de anticipo ($${anticipo.toFixed(2)}) no puede exceder el total del evento ($${totalEvento.toFixed(2)})`
            });
        }

        const saldoPendiente = Number((totalEvento - anticipo).toFixed(2));
        const estadoInicial = saldoPendiente === 0 ? 'PAGADA_TOTAL' : 'CONFIRMADA';

        // 9. Generar código correlativo de reserva (RES-YYYYMMDD-XXX)
        const codigoReserva = await generarCodigoReserva(connection);

        // 10. Insertar registro en reservas (RNF04 - Sentencia parametrizada)
        const insertSql = `
            INSERT INTO reservas (
                codigo_reserva,
                id_cotizacion,
                id_cliente,
                id_usuario,
                fecha_evento,
                hora_inicio,
                hora_fin,
                lugar_evento,
                total_evento,
                monto_anticipo,
                saldo_pendiente,
                estado,
                observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [resultado] = await connection.execute(insertSql, [
            codigoReserva,
            idCot,
            cotizacion.id_cliente,
            idUser,
            fechaComparar,
            hora_inicio,
            hora_fin,
            lugarFinal,
            totalEvento,
            anticipo,
            saldoPendiente,
            estadoInicial,
            observaciones ? observaciones.trim() : null
        ]);

        // 11. Confirmar la transacción (COMMIT)
        await connection.commit();

        return res.status(201).json({
            ok: true,
            mensaje: 'Reserva formalizada exitosamente a partir de la cotización aprobada',
            reserva: {
                id_reserva: resultado.insertId,
                codigo_reserva: codigoReserva,
                id_cotizacion: idCot,
                codigo_cotizacion: cotizacion.codigo_cotizacion,
                id_cliente: cotizacion.id_cliente,
                fecha_evento: fechaComparar,
                hora_inicio,
                hora_fin,
                lugar_evento: lugarFinal,
                total_evento: totalEvento,
                monto_anticipo: anticipo,
                saldo_pendiente: saldoPendiente,
                estado: estadoInicial
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error en crearReserva:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al procesar la reserva. La transacción fue revertida.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
};

/**
 * 4. Actualizar el estado de una reserva
 * PATCH o PUT /api/reservas/:id/estado
 * Body: { "estado": "CONFIRMADA" | "EN_PROCESO" | "COMPLETADA" | "FINALIZADA" | "CANCELADA" | "PAGADA_TOTAL" }
 */
const actualizarEstadoReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const idReserva = parseInt(id, 10);

        if (isNaN(idReserva) || idReserva <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de reserva inválido'
            });
        }

        const estadoNormalizado = normalizarEstado(estado);
        if (!estadoNormalizado) {
            return res.status(400).json({
                ok: false,
                mensaje: `Estado no válido. Los estados permitidos son: CONFIRMADA, EN_PROCESO (EN_EJECUCION), COMPLETADA (FINALIZADA), PAGADA_TOTAL o CANCELADA`
            });
        }

        // Verificar que la reserva exista
        const [existe] = await pool.execute(
            'SELECT id_reserva, codigo_reserva, estado FROM reservas WHERE id_reserva = ? LIMIT 1',
            [idReserva]
        );

        if (existe.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `Reserva con ID ${idReserva} no encontrada`
            });
        }

        // Actualización parametrizada (RNF04)
        await pool.execute(
            'UPDATE reservas SET estado = ? WHERE id_reserva = ?',
            [estadoNormalizado, idReserva]
        );

        return res.status(200).json({
            ok: true,
            mensaje: `El estado de la reserva ${existe[0].codigo_reserva} ha sido actualizado a ${estadoNormalizado}`,
            data: {
                id_reserva: idReserva,
                codigo_reserva: existe[0].codigo_reserva,
                estado_anterior: existe[0].estado,
                estado_nuevo: estadoNormalizado
            }
        });
    } catch (error) {
        console.error('Error en actualizarEstadoReserva:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al actualizar el estado de la reserva',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerReservas,
    obtenerReservaPorId,
    crearReserva,
    actualizarEstadoReserva
};

