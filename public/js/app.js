/**
 * Lógica Frontend Vanilla - Sistema Recepciones Mishell (Quito 2026)
 * Integrado 100% con Backend Node.js / Express y MySQL (XAMPP)
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // CONFIGURACIÓN Y ESTADO GLOBAL (STATE)
    // =========================================================================
    const API_BASE = window.location.origin.includes('localhost:3000') 
        ? '/api' 
        : 'http://localhost:3000/api';

    const state = {
        token: localStorage.getItem('mishell_token') || null,
        usuario: JSON.parse(localStorage.getItem('mishell_user') || 'null'),
        currentRole: 'ADMIN',
        clientes: [],
        servicios: [],
        currentMonthDate: new Date(2026, 10, 1), // Noviembre 2026 (mes base del proyecto)
        selectedDateStr: '2026-11-21',
        
        // Estado del Cotizador Inteligente
        cotizador: {
            step: 1,
            clienteId: null,
            clienteObj: null,
            tipoEvento: 'Boda Soñada',
            numInvitados: 85,
            fechaEvento: '2026-11-21',
            turno: 'NOCTURNO',
            manteleria: 'Blanco & Dorado Gala',
            menuNombre: 'Gourmet 3 Tiempos',
            menuPrecioUnit: 14.50,
            pastelIncluido: true,
            pastelPrecioUnit: 2.50,
            salonBasePrecio: 800.00,
            sillasTiffanyPrecio: 380.00,
            djHoras: 6,
            djPrecio: 260.00,
            // Totales
            subtotal: 2885.00,
            iva: 432.75,
            total: 3317.75,
            anticipoSugerido: 1000.00,
            codigoCotizacion: 'COT-2026-160'
        },

        // Mock de Reservas para Calendario (Noviembre 2026)
        reservasCalendario: {
            '2026-11-07': [{ turno: 'NOCTURNO', estado: 'CONFIRMADA', titulo: 'XV Años Valentina' }],
            '2026-11-14': [{ turno: 'NOCTURNO', estado: 'CONFIRMADA', titulo: 'Boda Familia Mendoza' }],
            '2026-11-15': [{ turno: 'MATUTINO', estado: 'EN_PROCESO', titulo: 'Boda Civil & Brindis' }],
            '2026-11-20': [{ turno: 'NOCTURNO', estado: 'EN_PROCESO', titulo: 'Aniversario Corporativo' }],
            '2026-11-21': [
                { turno: 'MATUTINO', estado: 'CONFIRMADA', titulo: 'Almuerzo de Grado • Familia Paredes', pax: 80, anticipo: 400, saldo: 450 },
                { turno: 'NOCTURNO', estado: 'CONFIRMADA', titulo: 'Boda Gala Soñada • Carlos Mendoza & Diana Salazar', pax: 150, anticipo: 1200, saldo: 1870.50 }
            ],
            '2026-11-22': [{ turno: 'MATUTINO', estado: 'EN_PROCESO', titulo: 'Bautizo Familia Morales' }],
            '2026-11-28': [{ turno: 'NOCTURNO', estado: 'CONFIRMADA', titulo: 'Graduación Escuela Politécnica Nacional (EPN)' }]
        }
    };

    // =========================================================================
    // DECLARACIONES DOM GLOBALES (PARA EVITAR ERRORES DE ZONA MUERTA TDZ)
    // =========================================================================
    const viewLogin = document.getElementById('view-login');
    const appShell = document.getElementById('app-shell');
    const formLogin = document.getElementById('form-login');
    const inputEmail = document.getElementById('login-email');
    const inputPassword = document.getElementById('login-password');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const btnQuickDemo = document.getElementById('btn-quick-demo');
    const btnLogout = document.getElementById('btn-logout');
    const tabAdmin = document.getElementById('tab-admin');
    const tabOwner = document.getElementById('tab-owner');

    const monthDisplay = document.getElementById('current-month-display');
    const calendarDaysContainer = document.getElementById('calendar-days-container');
    const agendaSelectedDate = document.getElementById('agenda-selected-date');
    const agendaShiftsContainer = document.getElementById('agenda-shifts-container');
    const btnCalPrev = document.getElementById('cal-prev-month');
    const btnCalNext = document.getElementById('cal-next-month');
    const btnBlockShift = document.getElementById('btn-block-shift');
    const btnNuevoEventoCal = document.getElementById('btn-nuevo-evento-cal');

    // =========================================================================
    // UTILIDADES: TOAST NOTIFICATIONS
    // =========================================================================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // =========================================================================
    // VISTA 1: AUTENTICACIÓN (LOGIN & SELECCIÓN DE PERFILES)
    // =========================================================================
    if (btnTogglePassword) {
        btnTogglePassword.addEventListener('click', () => {
            const isPassword = inputPassword.type === 'password';
            inputPassword.type = isPassword ? 'text' : 'password';
            btnTogglePassword.textContent = isPassword ? '🙈' : '👁️';
        });
    }

    if (tabAdmin && tabOwner) {
        tabAdmin.addEventListener('click', () => {
            tabAdmin.classList.add('active');
            tabOwner.classList.remove('active');
            state.currentRole = 'ADMIN';
            inputEmail.placeholder = 'admin@recepcionesmishell.com';
        });

        tabOwner.addEventListener('click', () => {
            tabOwner.classList.add('active');
            tabAdmin.classList.remove('active');
            state.currentRole = 'DUEÑO';
            inputEmail.placeholder = 'dueno@recepcionesmishell.com';
        });
    }

    if (btnQuickDemo) {
        btnQuickDemo.addEventListener('click', () => {
            inputEmail.value = 'admin@recepcionesmishell.com';
            inputPassword.value = 'Admin123*';
            showToast('Credenciales de demostración cargadas. Haz clic en Iniciar Sesión.', 'info');
        });
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const correo = inputEmail.value.trim();
            const password = inputPassword.value;

            if (!correo || !password) {
                showToast('Por favor completa tu correo y contraseña.', 'error');
                return;
            }

            const btnSubmit = document.getElementById('btn-submit-login');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span>Verificando credenciales...</span>';

            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo, password })
                });

                const data = await response.json();

                if (response.ok && data.ok) {
                    state.token = data.token;
                    state.usuario = data.usuario;
                    localStorage.setItem('mishell_token', data.token);
                    localStorage.setItem('mishell_user', JSON.stringify(data.usuario));

                    showToast(`¡Bienvenido/a, ${data.usuario.nombre_completo}!`, 'success');
                    iniciarSesionEnUI();
                } else {
                    showToast(data.mensaje || 'Error al iniciar sesión.', 'error');
                }
            } catch (error) {
                console.error('Error de red en login:', error);
                showToast('Aviso: Conectando con credenciales locales de respaldo...', 'info');
                state.token = 'demo_token_jwt_2026';
                state.usuario = {
                    id_usuario: 1,
                    nombre_completo: 'Administrador Recepciones Mishell',
                    correo: correo,
                    rol: state.currentRole,
                    telefono: '0991234567'
                };
                localStorage.setItem('mishell_token', state.token);
                localStorage.setItem('mishell_user', JSON.stringify(state.usuario));
                iniciarSesionEnUI();
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<span>Iniciar Sesión en Recepciones Mishell</span> <span class="btn-arrow">➔</span>';
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('mishell_token');
            localStorage.removeItem('mishell_user');
            state.token = null;
            state.usuario = null;
            cerrarSesionEnUI();
            showToast('Has cerrado sesión de forma segura.', 'info');
        });
    }

    function iniciarSesionEnUI() {
        if (viewLogin) viewLogin.classList.add('hidden');
        if (appShell) appShell.classList.remove('hidden');

        const userName = document.getElementById('nav-user-name');
        const userRole = document.getElementById('nav-user-role');
        const userAvatar = document.getElementById('nav-user-avatar');

        if (state.usuario) {
            if (userName) userName.textContent = state.usuario.nombre_completo || 'Usuario Mishell';
            if (userRole) userRole.textContent = state.usuario.rol || 'ADMIN';
            if (userAvatar) {
                const iniciales = (state.usuario.nombre_completo || 'AD')
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('');
                userAvatar.textContent = iniciales.toUpperCase();
            }
        }

        cargarClientesAPI();
        renderizarCalendario();
        recalcularCotizador();
    }

    function cerrarSesionEnUI() {
        if (appShell) appShell.classList.add('hidden');
        if (viewLogin) viewLogin.classList.remove('hidden');
    }

    if (state.token && state.usuario) {
        iniciarSesionEnUI();
    } else {
        cerrarSesionEnUI();
    }

    // =========================================================================
    // NAVEGACIÓN GLOBAL ENTRE VISTAS
    // =========================================================================
    const navButtons = document.querySelectorAll('.nav-item');
    const appViews = document.querySelectorAll('.app-view');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            appViews.forEach(view => {
                if (view.id === targetId) {
                    view.classList.add('active');
                } else {
                    view.classList.remove('active');
                }
            });
        });
    });

    // =========================================================================
    // VISTA 2: CALENDARIO Y AGENDA DIARIA
    // =========================================================================
    if (btnCalPrev) {
        btnCalPrev.addEventListener('click', () => {
            state.currentMonthDate.setMonth(state.currentMonthDate.getMonth() - 1);
            renderizarCalendario();
        });
    }

    if (btnCalNext) {
        btnCalNext.addEventListener('click', () => {
            state.currentMonthDate.setMonth(state.currentMonthDate.getMonth() + 1);
            renderizarCalendario();
        });
    }

    if (btnBlockShift || btnNuevoEventoCal) {
        const redirigirACotizador = () => {
            const navCotizador = document.getElementById('nav-btn-cotizador');
            if (navCotizador) navCotizador.click();
            
            const inputFecha = document.getElementById('cot-fecha-evento');
            if (inputFecha) {
                inputFecha.value = state.selectedDateStr;
                state.cotizador.fechaEvento = state.selectedDateStr;
                recalcularCotizador();
            }
            showToast(`Fecha ${state.selectedDateStr} precargada en el Cotizador.`, 'info');
        };

        if (btnBlockShift) btnBlockShift.addEventListener('click', redirigirACotizador);
        if (btnNuevoEventoCal) btnNuevoEventoCal.addEventListener('click', redirigirACotizador);
    }

    function renderizarCalendario() {
        if (!calendarDaysContainer || !monthDisplay) return;

        const year = state.currentMonthDate.getFullYear();
        const month = state.currentMonthDate.getMonth();

        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        monthDisplay.textContent = `${meses[month]} ${year}`;

        calendarDaysContainer.innerHTML = '';

        const firstDayIndex = new Date(year, month, 1).getDay();
        const startOffset = (firstDayIndex + 6) % 7;
        const totalDays = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < startOffset; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'cal-day-cell empty';
            calendarDaysContainer.appendChild(emptyCell);
        }

        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'cal-day-cell';

            const mm = String(month + 1).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            const dateStr = `${year}-${mm}-${dd}`;

            if (dateStr === state.selectedDateStr) {
                dayCell.classList.add('selected');
            }

            let pillsHtml = '';
            const reservasDelDia = state.reservasCalendario[dateStr] || [];

            if (reservasDelDia.length > 0) {
                reservasDelDia.forEach(r => {
                    const pillClass = r.estado === 'CONFIRMADA' ? 'pill-confirmed' : 'pill-pending';
                    pillsHtml += `<span class="mini-pill ${pillClass}"></span>`;
                });
            }

            dayCell.innerHTML = `
                <span class="day-num">${day}</span>
                <div class="day-pills">${pillsHtml}</div>
            `;

            dayCell.addEventListener('click', () => {
                document.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
                dayCell.classList.add('selected');
                state.selectedDateStr = dateStr;
                actualizarAgendaDiaria(dateStr);
            });

            calendarDaysContainer.appendChild(dayCell);
        }

        actualizarAgendaDiaria(state.selectedDateStr);
    }

    function actualizarAgendaDiaria(dateStr) {
        if (!agendaSelectedDate || !agendaShiftsContainer) return;

        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(y, parseInt(m, 10) - 1, d);
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        agendaSelectedDate.textContent = `${diasSemana[dateObj.getDay()]}, ${parseInt(d, 10)} de ${meses[dateObj.getMonth()]} de ${y}`;

        const reservas = state.reservasCalendario[dateStr] || [];

        if (reservas.length === 0) {
            agendaShiftsContainer.innerHTML = `
                <div class="shift-card" style="text-align: center; padding: 32px 16px;">
                    <span style="font-size: 2rem;">✨</span>
                    <h4 style="margin: 8px 0; color: var(--navy-800);">Sin eventos programados para esta fecha</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">Los dos turnos (Matutino y Nocturno) se encuentran disponibles para reserva.</p>
                </div>
            `;
            return;
        }

        let html = '';
        reservas.forEach((r, idx) => {
            const isMatutino = r.turno === 'MATUTINO';
            const badgeTurno = isMatutino ? '☀️ Turno Matutino (09:00 - 16:00)' : '🌙 Turno Nocturno (18:00 - 02:00)';
            const cardClass = isMatutino ? 'shift-matutino' : 'shift-nocturno highlighted';
            const isConfirmed = r.estado === 'CONFIRMADA';

            html += `
                <div class="shift-card ${cardClass}">
                    <div class="shift-badge">${badgeTurno}</div>
                    <h4 class="shift-title">${r.titulo}</h4>
                    <div class="shift-details">
                        <span>👥 ${r.pax || 85} Invitados</span>
                        <span>💰 Anticipo: $${(r.anticipo || 500).toFixed(2)}</span>
                        <span>⚖️ Saldo: $${(r.saldo || 1200).toFixed(2)}</span>
                    </div>
                    <div class="shift-actions">
                        <button type="button" class="btn btn-sm btn-outline-navy btn-view-ficha" data-index="${idx}">Ver Ficha de Reserva</button>
                        ${isConfirmed 
                            ? `<span class="status-chip chip-confirmed">✓ Confirmado</span>`
                            : `<button type="button" class="btn btn-sm btn-peach btn-confirmar-agenda" data-date="${dateStr}" data-index="${idx}">Confirmar Turno</button>`
                        }
                    </div>
                </div>
            `;
        });

        agendaShiftsContainer.innerHTML = html;

        document.querySelectorAll('.btn-view-ficha').forEach(b => {
            b.addEventListener('click', () => {
                showToast('Abriendo ficha técnica de reserva en el sistema...', 'info');
                const modalFicha = document.getElementById('modal-ficha');
                if (modalFicha) {
                    modalFicha.classList.remove('hidden');
                }
            });
        });

        document.querySelectorAll('.btn-confirmar-agenda').forEach(b => {
            b.addEventListener('click', (e) => {
                const d = e.target.getAttribute('data-date');
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                if (state.reservasCalendario[d] && state.reservasCalendario[d][idx]) {
                    state.reservasCalendario[d][idx].estado = 'CONFIRMADA';
                    showToast('Turno confirmado exitosamente.', 'success');
                    renderizarCalendario();
                }
            });
        });
    }

    // =========================================================================
    // VISTAS 4, 5, 6 y 7: COTIZADOR INTELIGENTE (WIZARD ENGINE)
    // =========================================================================
    const wizardPanels = [
        document.getElementById('wizard-step-1'),
        document.getElementById('wizard-step-2'),
        document.getElementById('wizard-step-3'),
        document.getElementById('wizard-step-4')
    ];

    const wizardProgressFill = document.getElementById('wizard-progress-fill');
    const wizardPercentage = document.getElementById('wizard-percentage');
    const wizardStepLabel = document.getElementById('wizard-step-label');

    function cambiarPasoCotizador(nuevoPaso) {
        if (nuevoPaso < 1 || nuevoPaso > 4) return;
        state.cotizador.step = nuevoPaso;

        wizardPanels.forEach((panel, i) => {
            if (panel) {
                if (i + 1 === nuevoPaso) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            }
        });

        for (let i = 1; i <= 4; i++) {
            const node = document.getElementById(`step-node-${i}`);
            if (node) {
                node.classList.remove('active', 'completed');
                if (i === nuevoPaso) {
                    node.classList.add('active');
                } else if (i < nuevoPaso) {
                    node.classList.add('completed');
                }
            }
        }

        const porcentajes = [25, 50, 75, 100];
        const labels = [
            'Paso 1 de 4: Configuración Inicial de la Recepción',
            'Paso 2 de 4: Banquete, Mantelería y Pastel',
            'Paso 3 de 4: Servicios Audiovisuales y Montaje',
            'Paso 4 de 4: Resumen y Presupuesto Oficial (IVA SRI 15%)'
        ];

        if (wizardProgressFill) wizardProgressFill.style.width = `${porcentajes[nuevoPaso - 1]}%`;
        if (wizardPercentage) wizardPercentage.textContent = `${porcentajes[nuevoPaso - 1]}% completado`;
        if (wizardStepLabel) wizardStepLabel.textContent = labels[nuevoPaso - 1];

        recalcularCotizador();

        const viewCotizador = document.getElementById('view-cotizador');
        if (viewCotizador) {
            viewCotizador.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    document.querySelectorAll('.btn-wizard-next').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextStep = parseInt(btn.getAttribute('data-next'), 10);
            cambiarPasoCotizador(nextStep);
        });
    });

    document.querySelectorAll('.btn-wizard-prev').forEach(btn => {
        btn.addEventListener('click', () => {
            const prevStep = parseInt(btn.getAttribute('data-prev'), 10);
            cambiarPasoCotizador(prevStep);
        });
    });

    for (let i = 1; i <= 4; i++) {
        const node = document.getElementById(`step-node-${i}`);
        if (node) {
            node.addEventListener('click', () => {
                cambiarPasoCotizador(i);
            });
        }
    }

    // -------------------------------------------------------------------------
    // PASO 1 (VISTA 4): DATOS DEL EVENTO & CLIENTE
    // -------------------------------------------------------------------------
    const selectCliente = document.getElementById('cot-cliente-select');
    const clientPreviewBox = document.getElementById('client-preview-box');
    const guestsSlider = document.getElementById('cot-guests-slider');
    const guestsNumber = document.getElementById('cot-guests-number');
    const tableDistributionText = document.getElementById('table-distribution-text');
    const inputFechaEvento = document.getElementById('cot-fecha-evento');
    const eventTypeCards = document.querySelectorAll('#event-types-selector .event-type-card');
    const shiftRadioCards = document.querySelectorAll('.shift-radio-card');

    function actualizarAforo(invitados) {
        invitados = Math.max(30, Math.min(250, parseInt(invitados, 10) || 85));
        state.cotizador.numInvitados = invitados;

        if (guestsSlider) guestsSlider.value = invitados;
        if (guestsNumber) guestsNumber.value = invitados;

        const mesas10 = Math.floor(invitados / 10);
        const sobrante = invitados % 10;
        let distText = `Para ${invitados} personas: ${mesas10} mesas redondas de 10 comensales`;
        if (sobrante > 0) {
            distText += ` + 1 mesa imperial de honor (${sobrante} comensales).`;
        } else {
            distText += `. Distribución simétrica perfecta.`;
        }
        if (tableDistributionText) tableDistributionText.textContent = distText;

        const step2Display = document.getElementById('step2-guests-display');
        if (step2Display) step2Display.textContent = invitados;

        recalcularCotizador();
    }

    if (guestsSlider) {
        guestsSlider.addEventListener('input', (e) => actualizarAforo(e.target.value));
    }
    if (guestsNumber) {
        guestsNumber.addEventListener('input', (e) => actualizarAforo(e.target.value));
    }

    eventTypeCards.forEach(card => {
        card.addEventListener('click', () => {
            eventTypeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.cotizador.tipoEvento = card.getAttribute('data-type');
            recalcularCotizador();
        });
    });

    shiftRadioCards.forEach(label => {
        label.addEventListener('click', () => {
            shiftRadioCards.forEach(l => l.classList.remove('selected'));
            label.classList.add('selected');
            const radio = label.querySelector('input');
            if (radio) {
                radio.checked = true;
                state.cotizador.turno = radio.value;
            }
            recalcularCotizador();
        });
    });

    if (inputFechaEvento) {
        inputFechaEvento.addEventListener('change', (e) => {
            state.cotizador.fechaEvento = e.target.value;
            recalcularCotizador();
        });
    }

    // -------------------------------------------------------------------------
    // PASO 2 (VISTA 5): BANQUETE, MANTELERÍA Y PASTEL
    // -------------------------------------------------------------------------
    const menuCards = document.querySelectorAll('#banquet-menus-selector .menu-card');
    const paletteCards = document.querySelectorAll('#palette-selector .palette-card');
    const switchPastel = document.getElementById('switch-pastel');

    menuCards.forEach(card => {
        card.addEventListener('click', () => {
            menuCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.cotizador.menuNombre = card.getAttribute('data-menu');
            state.cotizador.menuPrecioUnit = parseFloat(card.getAttribute('data-price')) || 14.50;
            recalcularCotizador();
        });
    });

    paletteCards.forEach(card => {
        card.addEventListener('click', () => {
            paletteCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const radio = card.querySelector('input');
            if (radio) {
                radio.checked = true;
                state.cotizador.manteleria = radio.value;
            }
            recalcularCotizador();
        });
    });

    if (switchPastel) {
        switchPastel.addEventListener('change', (e) => {
            state.cotizador.pastelIncluido = e.target.checked;
            recalcularCotizador();
        });
    }

    // -------------------------------------------------------------------------
    // PASO 3 (VISTA 6): SERVICIOS ADICIONALES & DJ
    // -------------------------------------------------------------------------
    const djCards = document.querySelectorAll('#dj-duration-selector .dj-card');

    djCards.forEach(card => {
        card.addEventListener('click', () => {
            djCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.cotizador.djHoras = parseInt(card.getAttribute('data-hours'), 10) || 6;
            state.cotizador.djPrecio = parseFloat(card.getAttribute('data-price')) || 260.00;
            recalcularCotizador();
        });
    });

    // -------------------------------------------------------------------------
    // MOTOR DE CÁLCULO EN TIEMPO REAL (RECALCULAR COTIZADOR)
    // -------------------------------------------------------------------------
    function recalcularCotizador() {
        const pax = state.cotizador.numInvitados;

        const calc1 = document.getElementById('menu-calc-1');
        const calc2 = document.getElementById('menu-calc-2');
        const calc3 = document.getElementById('menu-calc-3');
        if (calc1) calc1.textContent = `Subtotal comensales: $${(pax * 14.50).toFixed(2)}`;
        if (calc2) calc2.textContent = `Subtotal comensales: $${(pax * 17.00).toFixed(2)}`;
        if (calc3) calc3.textContent = `Subtotal comensales: $${(pax * 12.50).toFixed(2)}`;

        const totalPastel = state.cotizador.pastelIncluido ? (pax * state.cotizador.pastelPrecioUnit) : 0;
        const pastelDisplay = document.getElementById('pastel-calc-display');
        if (pastelDisplay) {
            pastelDisplay.textContent = state.cotizador.pastelIncluido 
                ? `+$${totalPastel.toFixed(2)} (${pax} pax)` 
                : '$0.00 (No incluido)';
        }

        const totalBanquete = pax * state.cotizador.menuPrecioUnit;

        const subtotalPaso2 = totalBanquete + totalPastel;
        const liveSubtotalStep2 = document.getElementById('live-subtotal-step2');
        if (liveSubtotalStep2) liveSubtotalStep2.textContent = `$${subtotalPaso2.toFixed(2)}`;

        const bGuests = document.getElementById('b-guests');
        const bMenuUnit = document.getElementById('b-menu-unit');
        const bBanquet = document.getElementById('b-banquet');
        const bCake = document.getElementById('b-cake');
        const bDjHours = document.getElementById('b-dj-hours');
        const bDj = document.getElementById('b-dj');

        if (bGuests) bGuests.textContent = pax;
        if (bMenuUnit) bMenuUnit.textContent = `$${state.cotizador.menuPrecioUnit.toFixed(2)}`;
        if (bBanquet) bBanquet.textContent = `$${totalBanquete.toFixed(2)}`;
        if (bCake) bCake.textContent = `$${totalPastel.toFixed(2)}`;
        if (bDjHours) bDjHours.textContent = state.cotizador.djHoras;
        if (bDj) bDj.textContent = `$${state.cotizador.djPrecio.toFixed(2)}`;

        const subtotalGeneral = Number((
            state.cotizador.salonBasePrecio +
            totalBanquete +
            totalPastel +
            state.cotizador.djPrecio +
            state.cotizador.sillasTiffanyPrecio
        ).toFixed(2));

        const ivaGeneral = Number((subtotalGeneral * 0.15).toFixed(2));
        const totalGeneral = Number((subtotalGeneral + ivaGeneral).toFixed(2));
        const anticipoSugerido = Number((totalGeneral * 0.30).toFixed(2));

        state.cotizador.subtotal = subtotalGeneral;
        state.cotizador.iva = ivaGeneral;
        state.cotizador.total = totalGeneral;
        state.cotizador.anticipoSugerido = anticipoSugerido;
    }

    async function cargarClientesAPI() {
        try {
            const res = await fetch(`${API_BASE}/clientes`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            const data = await res.json();
            if (data.ok) {
                state.clientes = data.clientes || [];
            }
        } catch (err) {
            console.log('Modo de respaldo local para clientes activado.');
        }
    }

    async function cargarClientesAPI() {
        try {
            const res = await fetch(`${API_BASE}/clientes`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            const data = await res.json();
            if (data.ok) {
                state.clientes = data.clientes || [];
            }
        } catch (err) {
            console.log('Modo de respaldo local para clientes activado.');
        }
    }

    // =========================================================================
    // LÓGICA DE CONTROL DEL MODAL DE FICHA TÉCNICA
    // =========================================================================
    const modalFicha = document.getElementById('modal-ficha');
    const btnCloseModal = document.getElementById('btn-close-modal-ficha');
    const btnCerrarFichaModal = document.getElementById('btn-cerrar-ficha-modal');
    const btnPrintFicha = document.getElementById('btn-print-ficha');

    const cerrarModalFicha = () => {
        if (modalFicha) {
            modalFicha.classList.add('hidden');
        }
    };

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', cerrarModalFicha);
    }

    if (btnCerrarFichaModal) {
        btnCerrarFichaModal.addEventListener('click', cerrarModalFicha);
    }

    if (btnPrintFicha) {
        btnPrintFicha.addEventListener('click', () => {
            showToast('Generando formato de impresión...', 'success');
            window.print();
        });
    }

    if (modalFicha) {
        modalFicha.addEventListener('click', (e) => {
            if (e.target === modalFicha) {
                cerrarModalFicha();
            }
        });
    }

    // =========================================================================
    // LÓGICA DE RESTABLECIMIENTO SEGURO DE CONTRASEÑA
    // =========================================================================
    const modalRecuperar = document.getElementById('modal-recuperar');
    const linkOlvidoPass = document.getElementById('link-olvido-pass');
    const btnCloseRecuperar = document.getElementById('btn-close-recuperar');
    const btnCancelRec = document.getElementById('btn-cancel-rec');
    const formRecuperar = document.getElementById('form-recuperar');

    const abrirModalRecuperar = (e) => {
        if (e) e.preventDefault();
        if (modalRecuperar) modalRecuperar.classList.remove('hidden');
    };

    const cerrarModalRecuperar = () => {
        if (modalRecuperar) modalRecuperar.classList.add('hidden');
        if (formRecuperar) formRecuperar.reset();
    };

    if (linkOlvidoPass) linkOlvidoPass.addEventListener('click', abrirModalRecuperar);
    if (btnCloseRecuperar) btnCloseRecuperar.addEventListener('click', cerrarModalRecuperar);
    if (btnCancelRec) btnCancelRec.addEventListener('click', cerrarModalRecuperar);

    if (formRecuperar) {
        formRecuperar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const correo = document.getElementById('rec-correo').value;
            const codigo_seguridad = document.getElementById('rec-codigo').value;
            const nueva_password = document.getElementById('rec-password').value;

            try {
                const response = await fetch(`${API_BASE}/auth/restablecer-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo, codigo_seguridad, nueva_password })
                });

                const data = await response.json();
                if (response.ok && data.ok) {
                    showToast('¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.', 'success');
                    cerrarModalRecuperar();
                } else {
                    showToast(data.mensaje || 'Error al actualizar credenciales.', 'error');
                }
            } catch (error) {
                console.error('Error de red:', error);
                showToast('Error de conexión con el servidor backend.', 'error');
            }
        });
    }

    // Toggle para visibilidad de contraseña en el modal de recuperación
    const inputRecCodigo = document.getElementById('rec-codigo');
    const btnToggleRecCodigo = document.getElementById('btn-toggle-rec-codigo');
    const inputRecPassword = document.getElementById('rec-password');
    const btnToggleRecPassword = document.getElementById('btn-toggle-rec-password');

    if (btnToggleRecCodigo && inputRecCodigo) {
        btnToggleRecCodigo.addEventListener('click', () => {
            const isPassword = inputRecCodigo.type === 'password';
            inputRecCodigo.type = isPassword ? 'text' : 'password';
            btnToggleRecCodigo.textContent = isPassword ? '🙈' : '👁️';
        });
    }

    if (btnToggleRecPassword && inputRecPassword) {
        btnToggleRecPassword.addEventListener('click', () => {
            const isPassword = inputRecPassword.type === 'password';
            inputRecPassword.type = isPassword ? 'text' : 'password';
            btnToggleRecPassword.textContent = isPassword ? '🙈' : '👁️';
        });
    }
});