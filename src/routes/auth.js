/**
 * Rutas del Módulo de Autenticación y Usuarios
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * Ruta base: /api/auth
 * 
 * Endpoints públicos y seguros para registro y login con Bcrypt y JWT (RNF04).
 */

const express = require('express');
const router = express.Router();
const {
    register,
    login,
    perfil
} = require('../controllers/authController');

// Definición de rutas de autenticación
router.post('/register', register);
router.post('/login', login);
router.get('/perfil', perfil);

module.exports = router;

