/**
 * Suite de Pruebas de Integración y API
 * Sistema: Recepciones Mishell (Quito, Ecuador)
 * Herramientas: Jest + Supertest
 * 
 * Fase 4: Aseguramiento de Calidad y Pruebas de Software (QA)
 */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../server');
const rawDb = require('../src/config/db');

// Obtener la instancia del pool para cierre seguro tras ejecución
const pool = rawDb.promise ? rawDb.promise() : rawDb;

describe('🧪 Suite de Pruebas Automatizadas - Recepciones Mishell API', () => {

    // Cierre limpio de conexiones de base de datos para prevenir handles abiertos
    afterAll(async () => {
        try {
            if (pool && pool.end) {
                await pool.end();
            }
        } catch (error) {
            // Ignorar error si el pool ya fue cerrado
        }
    });

    // ========================================================================
    // 1. Verificación del Módulo de Servicios
    // ========================================================================
    describe('GET /api/servicios', () => {
        it('debe responder con estado 200 y retornar una lista estructurada de servicios activos', async () => {
            const response = await request(app)
                .get('/api/servicios')
                .set('Accept', 'application/json');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('ok', true);
            expect(response.body).toHaveProperty('servicios');
            expect(Array.isArray(response.body.servicios)).toBe(true);

            // Si hay servicios en la base de datos, validar campos esperados del esquema
            if (response.body.servicios.length > 0) {
                const primerServicio = response.body.servicios[0];
                expect(primerServicio).toHaveProperty('id_servicio');
                expect(primerServicio).toHaveProperty('codigo');
                expect(primerServicio).toHaveProperty('nombre_servicio');
                expect(primerServicio).toHaveProperty('precio_unitario');
                expect(primerServicio).toHaveProperty('categoria');
            }
        });
    });

    // ========================================================================
    // 2. Verificación de Seguridad y Autenticación (Login)
    // ========================================================================
    describe('POST /api/auth/login', () => {
        it('debe rechazar solicitudes con cuerpo vacío retornando HTTP 400 (Bad Request)', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({})
                .set('Accept', 'application/json');

            // Valida rechazo por falta de credenciales (HTTP 400 o 401)
            expect([400, 401]).toContain(response.status);
            expect(response.body).toHaveProperty('ok', false);
            expect(response.body).toHaveProperty('mensaje');
        });

        it('debe rechazar solicitudes cuando se envía solo correo sin contraseña', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ correo: 'admin@recepcionesmishell.com' })
                .set('Accept', 'application/json');

            expect([400, 401]).toContain(response.status);
            expect(response.body).toHaveProperty('ok', false);
        });

        it('debe denegar el acceso ante credenciales incorrectas con HTTP 401 (Unauthorized)', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    correo: 'correo_inexistente@recepcionesmishell.com',
                    password: 'ClaveInvalida123*'
                })
                .set('Accept', 'application/json');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('ok', false);
            expect(response.body.mensaje).toMatch(/Credenciales inválidas/i);
        });
    });

    // ========================================================================
    // 3. Verificación de Rutas Inexistentes (Manejo de Errores 404)
    // ========================================================================
    describe('Control de Errores 404 (Not Found)', () => {
        it('debe retornar HTTP 404 y un mensaje controlado ante un endpoint no definido', async () => {
            const response = await request(app)
                .get('/api/ruta-inexistente-mishell')
                .set('Accept', 'application/json');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('ok', false);
            expect(response.body).toHaveProperty('mensaje');
            expect(response.body.mensaje).toMatch(/no encontrada/i);
        });
    });

    // ========================================================================
    // 4. Verificación de Health Check / Ruta Base
    // ========================================================================
    describe('GET / (Ruta Raíz / Health Check)', () => {
        it('debe responder con estado 200 indicando que el sistema está activo', async () => {
            const response = await request(app)
                .get('/')
                .set('Accept', 'application/json');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('ok', true);
            expect(response.body).toHaveProperty('sistema');
        });
    });
});

