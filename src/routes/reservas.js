/**
 * Rutas del Módulo de Reservas
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * Ruta base: /api/reservas
 * 
 * Arquitectura MVC: Define los endpoints y delega la lógica de negocio, validaciones transaccionales
 * y seguridad al controlador src/controllers/reservaController.js (RNF04 - Consultas parametrizadas).
 */

const express = require('express');
const router = express.Router();
const {
    obtenerReservas,
    obtenerReservaPorId,
    crearReserva,
    actualizarEstadoReserva
} = require('../controllers/reservaController');

// Definición de rutas RESTful para Reservas
router.get('/', obtenerReservas);
router.get('/:id', obtenerReservaPorId);
router.post('/', crearReserva);
router.patch('/:id/estado', actualizarEstadoReserva);
router.put('/:id/estado', actualizarEstadoReserva); // Alias para compatibilidad

module.exports = router;

