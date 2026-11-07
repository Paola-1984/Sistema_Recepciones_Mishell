/**
 * Rutas del Módulo de Clientes
 * Sistema: Recepciones Mishell (Quito)
 * Ruta base: /api/clientes
 * 
 * Arquitectura MVC: Define los endpoints y delega la lógica de negocio y seguridad
 * al controlador src/controllers/clienteController.js (RNF04 - Consultas parametrizadas).
 */

const express = require('express');
const router = express.Router();
const {
    obtenerClientes,
    obtenerClientePorId,
    registrarCliente,
    actualizarCliente,
    eliminarCliente
} = require('../controllers/clienteController');

// Definición de rutas RESTful
router.get('/', obtenerClientes);
router.get('/:id', obtenerClientePorId);
router.post('/', registrarCliente);
router.put('/:id', actualizarCliente);
router.delete('/:id', eliminarCliente);

module.exports = router;
