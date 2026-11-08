/**
 * Servidor Principal de la Aplicación
 * Sistema: Recepciones Mishell (Quito)
 * Backend: Node.js + Express + MySQL2
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Verificación inicial de base de datos
require('./src/config/db');

// Ruta de bienvenida / Health check
app.get('/', (req, res) => {
    res.json({
        ok: true,
        sistema: 'Sistema de Gestión - Recepciones Mishell',
        ubicacion: 'Quito, Ecuador',
        estado: 'Activo'
    });
});

// Importar rutas de módulos
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/clientes', require('./src/routes/clientes'));
app.use('/api/servicios', require('./src/routes/servicios'));
app.use('/api/cotizaciones', require('./src/routes/cotizaciones'));
app.use('/api/reservas', require('./src/routes/reservas'));

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({
        ok: false,
        mensaje: 'Ruta no encontrada en la API de Recepciones Mishell.'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
    console.log(`📌 Módulo de Autenticación disponible en: http://localhost:${PORT}/api/auth`);
    console.log(`📌 Módulo de Clientes disponible en: http://localhost:${PORT}/api/clientes`);
    console.log(`📌 Módulo de Servicios disponible en: http://localhost:${PORT}/api/servicios`);
    console.log(`📌 Módulo de Cotizaciones disponible en: http://localhost:${PORT}/api/cotizaciones`);
    console.log(`📌 Módulo de Reservas disponible en: http://localhost:${PORT}/api/reservas`);
});
