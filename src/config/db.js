/**
 * Configuración de Conexión a la Base de Datos MySQL (XAMPP)
 * Sistema: Recepciones Mishell
 * Motor: mysql2 con soporte nativo de Promises (Pool de Conexiones)
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones seguro y eficiente
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'recepciones_mishell',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
});

// Verificación opcional de conectividad al inicializar
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión exitosa a la base de datos MySQL (recepciones_mishell)');
        connection.release();
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos MySQL:', error.message);
        console.error('   Verifica que XAMPP MySQL esté iniciado y la base "recepciones_mishell" esté creada.');
    }
})();

module.exports = pool;

