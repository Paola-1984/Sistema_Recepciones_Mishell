/**
 * Controlador de Autenticación y Usuarios
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * 
 * Requisito No Funcional RNF04: Seguridad Criptográfica y contra Inyección SQL.
 * - Cifrado irreversible de contraseñas mediante Bcrypt (10 salt rounds).
 * - Consultas preparadas y parametrizadas (?) mediante MySQL2.
 * - Emisión de Tokens de Acceso JWT (JSON Web Tokens).
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rawDb = require('../config/db');

// Soporte para pool directo de mysql2/promise o instancias con .promise()
const pool = rawDb.promise ? rawDb.promise() : rawDb;

// Detección opcional de paquete jsonwebtoken externo o fallback a generador nativo RFC 7519
let jwtLib = null;
try {
    jwtLib = require('jsonwebtoken');
} catch (e) {
    jwtLib = null;
}

// Configuración de clave secreta para firma de tokens
const JWT_SECRET = process.env.JWT_SECRET || 'RecepcionesMishell_SecretKey_2026_Quito';
const JWT_EXPIRES_IN_SECONDS = 8 * 60 * 60; // 8 horas de validez

// Roles autorizados en el sistema según la base de datos
const ROLES_VALIDOS = ['ADMIN', 'ORGANIZADOR', 'RECEPCIONISTA'];

/**
 * Generador estándar de tokens JWT
 */
const generarJWT = (payload) => {
    if (jwtLib) {
        return jwtLib.sign(payload, JWT_SECRET, { expiresIn: `${JWT_EXPIRES_IN_SECONDS}s` });
    }

    const header = { alg: 'HS256', typ: 'JWT' };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + JWT_EXPIRES_IN_SECONDS;
    const body = { ...payload, iat, exp };

    const toBase64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsignedToken = `${toBase64Url(header)}.${toBase64Url(body)}`;
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(unsignedToken).digest('base64url');

    return `${unsignedToken}.${signature}`;
};

/**
 * Validador básico de formato de correo electrónico
 */
const esCorreoValido = (correo) => {
    if (!correo) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo.trim().toLowerCase());
};

/**
 * 1. Registro de Usuario Seguro
 */
const register = async (req, res) => {
    try {
        const {
            nombre_completo,
            correo,
            password,
            rol = 'RECEPCIONISTA',
            telefono
        } = req.body;

        if (!nombre_completo || !correo || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Campos requeridos faltantes: nombre_completo, correo y password son obligatorios'
            });
        }

        const nombreLimpio = nombre_completo.trim();
        const correoLimpio = correo.trim().toLowerCase();
        const telefonoLimpio = telefono ? telefono.trim() : null;
        const rolLimpio = rol ? rol.trim().toUpperCase() : 'RECEPCIONISTA';

        if (!esCorreoValido(correoLimpio)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El correo electrónico ingresado no tiene un formato válido'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La contraseña debe tener una longitud mínima de 6 caracteres'
            });
        }

        if (!ROLES_VALIDOS.includes(rolLimpio)) {
            return res.status(400).json({
                ok: false,
                mensaje: `Rol no válido. Los roles disponibles son: ${ROLES_VALIDOS.join(', ')}`
            });
        }

        const [usuarioExistente] = await pool.execute(
            'SELECT id_usuario, correo FROM usuarios WHERE correo = ? LIMIT 1',
            [correoLimpio]
        );

        if (usuarioExistente.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: `El correo electrónico "${correoLimpio}" ya se encuentra registrado en el sistema`
            });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertSql = `
            INSERT INTO usuarios (
                nombre_completo,
                correo,
                password,
                rol,
                telefono,
                estado
            ) VALUES (?, ?, ?, ?, ?, 1)
        `;

        const [resultado] = await pool.execute(insertSql, [
            nombreLimpio,
            correoLimpio,
            passwordHash,
            rolLimpio,
            telefonoLimpio
        ]);

        return res.status(201).json({
            ok: true,
            mensaje: 'Usuario registrado exitosamente con credenciales seguras',
            usuario: {
                id_usuario: resultado.insertId,
                nombre_completo: nombreLimpio,
                correo: correoLimpio,
                rol: rolLimpio,
                telefono: telefonoLimpio,
                estado: 1
            }
        });
    } catch (error) {
        console.error('Error en register:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al procesar el registro del usuario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 2. Inicio de Sesión Seguro (Login)
 */
const login = async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe ingresar tanto el correo como la contraseña para iniciar sesión'
            });
        }

        const correoLimpio = correo.trim().toLowerCase();

        const [rows] = await pool.execute(
            `SELECT 
                id_usuario,
                nombre_completo,
                correo,
                password,
                rol,
                telefono,
                estado 
            FROM usuarios 
            WHERE correo = ? 
            LIMIT 1`,
            [correoLimpio]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Credenciales inválidas: correo o contraseña incorrectos'
            });
        }

        const usuario = rows[0];

        if (usuario.estado !== 1) {
            return res.status(403).json({
                ok: false,
                mensaje: 'Acceso denegado: este usuario ha sido desactivado. Contacte a la administración.'
            });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);

        if (!passwordValida) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Credenciales inválidas: correo o contraseña incorrectos'
            });
        }

        const payloadToken = {
            id_usuario: usuario.id_usuario,
            nombre_completo: usuario.nombre_completo,
            correo: usuario.correo,
            rol: usuario.rol
        };

        const token = generarJWT(payloadToken);

        return res.status(200).json({
            ok: true,
            mensaje: `Bienvenido/a al Sistema Recepciones Mishell, ${usuario.nombre_completo}`,
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre_completo: usuario.nombre_completo,
                correo: usuario.correo,
                rol: usuario.rol,
                telefono: usuario.telefono
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al procesar el inicio de sesión',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 3. Consultar Perfil / Verificar Sesión Actual
 */
const perfil = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Token de autorización ausente o con formato no válido (Bearer <token>)'
            });
        }

        const token = authHeader.split(' ')[1];

        let decoded = null;
        if (jwtLib) {
            try {
                decoded = jwtLib.verify(token, JWT_SECRET);
            } catch (err) {
                return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' });
            }
        } else {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return res.status(401).json({ ok: false, mensaje: 'Token con estructura no válida' });
            }
            const [headerB64, bodyB64, signatureB64] = parts;
            const unsigned = `${headerB64}.${bodyB64}`;
            const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url');

            if (signatureB64 !== expectedSig) {
                return res.status(401).json({ ok: false, mensaje: 'Firma de token inválida' });
            }

            const body = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
            const now = Math.floor(Date.now() / 1000);
            if (body.exp && body.exp < now) {
                return res.status(401).json({ ok: false, mensaje: 'Token expirado' });
            }
            decoded = body;
        }

        const [rows] = await pool.execute(
            'SELECT id_usuario, nombre_completo, correo, rol, telefono, estado, created_at FROM usuarios WHERE id_usuario = ? AND estado = 1 LIMIT 1',
            [decoded.id_usuario]
        );

        if (rows.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado o inactivo' });
        }

        return res.status(200).json({
            ok: true,
            usuario: rows[0]
        });
    } catch (error) {
        console.error('Error en perfil:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno al consultar el perfil',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 4. Restablecimiento Seguro de Contraseña con Clave Maestra (Sin SMTP)
 * POST /api/auth/restablecer-password
 */
const restablecerPassword = async (req, res) => {
    try {
        const { correo, codigo_seguridad, nueva_password } = req.body;

        if (!correo || !codigo_seguridad || !nueva_password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Todos los campos son obligatorios: correo, código de seguridad y nueva contraseña'
            });
        }

        const correoLimpio = correo.trim().toLowerCase();
        const CLAVE_MAESTRA_SISTEMA = process.env.MASTER_RECOVERY_KEY || 'Mishell2026*MasterKey';

        if (codigo_seguridad !== CLAVE_MAESTRA_SISTEMA) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Clave de autorización administrativa incorrecta'
            });
        }

        if (nueva_password.length < 8) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La nueva contraseña debe tener un mínimo de 8 caracteres'
            });
        }

        const [rows] = await pool.execute(
            'SELECT id_usuario, correo, estado FROM usuarios WHERE correo = ? LIMIT 1',
            [correoLimpio]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: `El correo "${correoLimpio}" no se encuentra registrado en el sistema`
            });
        }

        const usuario = rows[0];

        if (usuario.estado !== 1) {
            return res.status(403).json({
                ok: false,
                mensaje: 'No se puede restablecer la contraseña de un usuario inactivo'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nueva_password, salt);

        await pool.execute(
            'UPDATE usuarios SET password = ? WHERE id_usuario = ?',
            [passwordHash, usuario.id_usuario]
        );

        return res.status(200).json({
            ok: true,
            mensaje: '¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.'
        });

    } catch (error) {
        console.error('Error en restablecerPassword:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor al restablecer la contraseña',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    register,
    login,
    perfil,
    restablecerPassword
};