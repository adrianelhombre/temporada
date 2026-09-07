// ============================================
// PUNTO DE ENTRADA Y EVENTOS
// ============================================

import { DOM, ESTADO, initDOM } from './config.js';
import { 
    fetchJugadoresActivos, 
    fetchSemanas, 
    fetchSemanaConJugadores,
    crearNuevaSemanaConDatos,
    getSiguienteNumeroSemana,
    guardarSemana,
    actualizarSemana,
    eliminarSemana,
    mostrarNotificacion
} from './db.js';
import { 
    renderizarHistorial, 
    renderizarEditor, 
    mostrarCargando 
} from './render.js';
import { generarPdf } from './pdf.js';

// --- NAVEGACIÓN ---

function mostrarHistorial() {
    DOM.editorScreen.classList.remove('active');
    DOM.historialScreen.classList.add('active');
    ESTADO.semanaActual = null;
    DOM.headerTitulo.textContent = 'Trabajo semanal';
    actualizarBotonVolver();
}

async function abrirSemana(semanaId) {
    mostrarCargando(DOM.editorContainer);
    DOM.historialScreen.classList.remove('active');
    DOM.editorScreen.classList.add('active');

    const data = await fetchSemanaConJugadores(semanaId);
    if (!data) {
        DOM.editorScreen.classList.remove('active');
        DOM.historialScreen.classList.add('active');
        return;
    }

    ESTADO.semanaActual = data;
    renderizarEditor();
    actualizarBotonVolver();
}

// --- CONTROL DEL BOTÓN VOLVER ---

function actualizarBotonVolver() {
    const btnVolver = document.getElementById('btn-volver-principal');
    
    // Quitar cualquier evento anterior (clonando y reemplazando)
    const nuevoBtn = btnVolver.cloneNode(true);
    btnVolver.parentNode.replaceChild(nuevoBtn, btnVolver);
    
    // Obtener referencia actualizada
    const btn = document.getElementById('btn-volver-principal');
    const img = btn.querySelector('img');
    
    if (ESTADO.semanaActual) {
        // Estamos en el editor → volver al historial (misma página)
        btn.href = '#';
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            mostrarHistorial();
        });
    } else {
        // Estamos en el historial → ir a plantilla.html
        btn.href = 'plantilla.html';
        // Quitar cualquier evento click que pudiera quedar
        btn.removeEventListener('click', mostrarHistorial);
    }
}

// --- CREAR SEMANA CON MODAL ---

async function mostrarModalCrearSemana() {
    const siguienteNumero = await getSiguienteNumeroSemana();
    DOM.inputNumeroSemana.value = siguienteNumero;
    
    const hoy = new Date();
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 6);
    
    DOM.inputFechaInicio.value = hoy.toISOString().split('T')[0];
    DOM.inputFechaFin.value = fin.toISOString().split('T')[0];
    
    DOM.modalCrearSemana.classList.remove('oculto');
    DOM.inputNumeroSemana.focus();
    DOM.inputNumeroSemana.select();
}

async function confirmarCrearSemana() {
    const numeroSemana = parseInt(DOM.inputNumeroSemana.value, 10);
    const fechaInicio = DOM.inputFechaInicio.value;
    const fechaFin = DOM.inputFechaFin.value;
    
    if (!numeroSemana || numeroSemana < 1) {
        mostrarNotificacion('Introduce un número de semana válido.', 'error');
        return;
    }
    
    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
        mostrarNotificacion('La fecha de inicio no puede ser posterior a la fecha de fin.', 'error');
        return;
    }
    
    const semanaId = await crearNuevaSemanaConDatos(numeroSemana, fechaInicio, fechaFin);
    DOM.modalCrearSemana.classList.add('oculto');
    
    if (semanaId) {
        await cargarSemanas();
        await abrirSemana(semanaId);
    }
}

function cancelarCrearSemana() {
    DOM.modalCrearSemana.classList.add('oculto');
}

// --- EDITAR SEMANA ---

function mostrarModalEditarSemana() {
    if (!ESTADO.semanaActual) return;
    
    const semana = ESTADO.semanaActual.semana;
    DOM.inputEditarNumeroSemana.value = semana.numero_semana;
    DOM.inputEditarFechaInicio.value = semana.fecha_inicio || '';
    DOM.inputEditarFechaFin.value = semana.fecha_fin || '';
    
    DOM.modalEditarSemana.classList.remove('oculto');
    DOM.inputEditarNumeroSemana.focus();
    DOM.inputEditarNumeroSemana.select();
}

async function confirmarEditarSemana() {
    if (!ESTADO.semanaActual) return;
    
    const semanaId = ESTADO.semanaActual.semana.id;
    const numeroSemana = parseInt(DOM.inputEditarNumeroSemana.value, 10);
    const fechaInicio = DOM.inputEditarFechaInicio.value;
    const fechaFin = DOM.inputEditarFechaFin.value;
    
    if (!numeroSemana || numeroSemana < 1) {
        mostrarNotificacion('Introduce un número de semana válido.', 'error');
        return;
    }
    
    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
        mostrarNotificacion('La fecha de inicio no puede ser posterior a la fecha de fin.', 'error');
        return;
    }
    
    const success = await actualizarSemana(semanaId, numeroSemana, fechaInicio, fechaFin);
    DOM.modalEditarSemana.classList.add('oculto');
    
    if (success) {
        const data = await fetchSemanaConJugadores(semanaId);
        if (data) {
            ESTADO.semanaActual = data;
            renderizarEditor();
        }
        await cargarSemanas();
    }
}

function cancelarEditarSemana() {
    DOM.modalEditarSemana.classList.add('oculto');
}

// --- GUARDAR ---

async function guardarSemanaActual() {
    if (!ESTADO.semanaActual) return;
    const success = await guardarSemana(
        ESTADO.semanaActual.semana.id, 
        ESTADO.semanaActual.jugadores
    );
    if (success) {
        await cargarSemanas();
    }
}

// --- ELIMINAR SEMANA ---

function confirmarEliminarSemana(semanaId) {
    ESTADO.semanaAEliminar = semanaId;
    DOM.modalEliminar.classList.remove('oculto');
}

async function eliminarSemanaConfirmada() {
    if (!ESTADO.semanaAEliminar) return;
    const success = await eliminarSemana(ESTADO.semanaAEliminar);
    DOM.modalEliminar.classList.add('oculto');
    if (success) {
        ESTADO.semanaAEliminar = null;
        await cargarSemanas();
    }
}

// --- AUTO-GUARDADO (blur) ---

function setupAutoguardado() {
    DOM.editorContainer.addEventListener('blur', (e) => {
        if (e.target.tagName === 'TEXTAREA') {
            const jugadorId = e.target.dataset.jugadorId;
            const campo = e.target.dataset.campo;
            const valor = e.target.value;

            if (ESTADO.semanaActual) {
                const jugador = ESTADO.semanaActual.jugadores.find(j => j.id === jugadorId);
                if (jugador) {
                    jugador[campo] = valor;
                    guardarSemana(
                        ESTADO.semanaActual.semana.id,
                        ESTADO.semanaActual.jugadores
                    );
                }
            }
        }
    }, true);
}

// --- EVENTOS CON DELEGACIÓN ---

function setupEventListeners() {
    // El botón volver se maneja en actualizarBotonVolver()

    // Nueva semana - abre modal
    DOM.btnNuevaSemana.addEventListener('click', mostrarModalCrearSemana);

    // Modal crear semana
    DOM.btnConfirmarCrearSemana.addEventListener('click', confirmarCrearSemana);
    DOM.btnCancelarCrearSemana.addEventListener('click', cancelarCrearSemana);
    DOM.inputNumeroSemana.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmarCrearSemana();
    });

    // Editar semana
    DOM.btnEditarSemana.addEventListener('click', mostrarModalEditarSemana);
    DOM.btnConfirmarEditarSemana.addEventListener('click', confirmarEditarSemana);
    DOM.btnCancelarEditarSemana.addEventListener('click', cancelarEditarSemana);
    DOM.inputEditarNumeroSemana.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmarEditarSemana();
    });

    // Cerrar modales con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            DOM.modalCrearSemana.classList.add('oculto');
            DOM.modalEliminar.classList.add('oculto');
            DOM.modalEditarSemana.classList.add('oculto');
        }
    });

    // Guardar cambios (manual)
    DOM.btnGuardarCambios.addEventListener('click', guardarSemanaActual);

    // PDF
    DOM.btnDescargarPdf.addEventListener('click', () => {
        if (ESTADO.semanaActual) {
            generarPdf(ESTADO.semanaActual.semana.id);
        }
    });

    // Pantalla completa
    DOM.btnPantallaCompleta.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });

    // Modal eliminar
    DOM.btnConfirmarEliminar.addEventListener('click', eliminarSemanaConfirmada);
    DOM.btnCancelarEliminar.addEventListener('click', () => {
        DOM.modalEliminar.classList.add('oculto');
        ESTADO.semanaAEliminar = null;
    });

    // Delegación de eventos en el historial (Abrir, PDF, Eliminar)
    DOM.listaSemanasContainer.addEventListener('click', (e) => {
        const btnAbrir = e.target.closest('.btn-abrir');
        const btnPdf = e.target.closest('.btn-pdf');
        const btnEliminar = e.target.closest('.btn-eliminar');

        if (btnAbrir) {
            abrirSemana(btnAbrir.dataset.semanaId);
        }
        if (btnPdf) {
            generarPdf(btnPdf.dataset.semanaId);
        }
        if (btnEliminar) {
            confirmarEliminarSemana(btnEliminar.dataset.semanaId);
        }
    });
}

// --- CARGA INICIAL ---

async function cargarSemanas() {
    ESTADO.semanas = await fetchSemanas();
    renderizarHistorial();
}

async function init() {
    initDOM();
    ESTADO.jugadoresActivos = await fetchJugadoresActivos();
    await cargarSemanas();
    setupEventListeners();
    setupAutoguardado();
    actualizarBotonVolver();
    console.log('Módulo Trabajo Semanal inicializado.');
}

document.addEventListener('DOMContentLoaded', init);