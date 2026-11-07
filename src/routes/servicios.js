/**
 * Rutas del Módulo de Servicios
 * Sistema: Recepciones Mishell (Quito)
 * Ruta base: /api/servicios
 * 
 * Arquitectura MVC: Define los endpoints y delega la lógica de negocio y seguridad
 * al controlador src/controllers/servicioController.js (RNF04 - Consultas parametrizadas).
 */

const express = require('express');
const router = express.Router();
const {
    obtenerServicios,
    obtenerServicioPorId,
    registrarServicio,
    actualizarServicio,
    eliminarServicio
} = require('../controllers/servicioController');

// Definición de rutas RESTful para Servicios
router.get('/', obtenerServicios);
router.get('/:id', obtenerServicioPorId);
router.post('/', registrarServicio);
router.put('/:id', actualizarServicio);
router.delete('/:id', eliminarServicio);

module.exports = router;

