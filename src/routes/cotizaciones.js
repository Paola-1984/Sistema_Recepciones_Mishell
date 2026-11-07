/**
 * Rutas del Módulo de Cotizaciones
 * Sistema: Recepciones Mishell (Quito)
 * Ruta base: /api/cotizaciones
 * 
 * Arquitectura MVC: Define los endpoints y delega la lógica de negocio, transacciones ACID
 * y seguridad al controlador src/controllers/cotizacionController.js (RNF04 - Consultas parametrizadas).
 */

const express = require('express');
const router = express.Router();
const {
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    crearCotizacion,
    cambiarEstado
} = require('../controllers/cotizacionController');

// Definición de rutas RESTful para Cotizaciones
router.get('/', obtenerCotizaciones);
router.get('/:id', obtenerCotizacionPorId);
router.post('/', crearCotizacion);
router.patch('/:id/estado', cambiarEstado);
router.put('/:id/estado', cambiarEstado); // Alias para soporte flexible de clientes HTTP

module.exports = router;

