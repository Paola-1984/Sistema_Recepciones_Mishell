/**
 * Rutas del Módulo de Autenticación y Usuarios
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * Ruta base: /api/auth
 */

const express = require('express');
const router = express.Router();
const {
    register,
    login,
    perfil,
    restablecerPassword // <-- 1. Importamos la función del controlador
} = require('../controllers/authController');

// Definición de rutas de autenticación
router.post('/register', register);
router.post('/login', login);
router.get('/perfil', perfil);
router.post('/restablecer-password', restablecerPassword); // <-- 2. Registramos la nueva ruta POST

module.exports = router;