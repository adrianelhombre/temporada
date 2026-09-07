// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

// Definir el orden de posiciones (categorías principales)
export const ORDEN_POSICIONES = ['Portero', 'Defensa', 'Medio', 'Extremo', 'Delantero'];

// Mapeo de todas las variantes de posiciones a categorías principales
export const MAPEO_POSICIONES = {
    // Porteros
    'portero': 'Portero',
    'porteros': 'Portero',
    'por': 'Portero',
    
    // Defensas
    'defensa': 'Defensa',
    'defensas': 'Defensa',
    'dfc': 'Defensa',
    'd.f.c.': 'Defensa',
    'ltd': 'Defensa',
    'l.t.d.': 'Defensa',
    'lti': 'Defensa',
    'l.t.i.': 'Defensa',
    'ld': 'Defensa',
    'li': 'Defensa',
    'central': 'Defensa',
    'laterales': 'Defensa',
    'lateral': 'Defensa',
    'cb': 'Defensa',
    'lb': 'Defensa',
    'rb': 'Defensa',
    
    // Medios
    'medio': 'Medio',
    'medios': 'Medio',
    'centrocampista': 'Medio',
    'centrocampistas': 'Medio',
    'mc': 'Medio',
    'm.c.': 'Medio',
    'mcd': 'Medio',
    'm.c.d.': 'Medio',
    'mco': 'Medio',
    'm.c.o.': 'Medio',
    'mcc': 'Medio',
    'm.c.c.': 'Medio',
    'cdm': 'Medio',
    'cm': 'Medio',
    'cam': 'Medio',
    
    // Extremos
    'extremo': 'Extremo',
    'extremos': 'Extremo',
    'ei': 'Extremo',
    'e.i.': 'Extremo',
    'ed': 'Extremo',
    'e.d.': 'Extremo',
    'mi': 'Extremo',
    'md': 'Extremo',
    'wing': 'Extremo',
    'lw': 'Extremo',
    'rw': 'Extremo',
    
    // Delanteros
    'delantero': 'Delantero',
    'delanteros': 'Delantero',
    'dc': 'Delantero',
    'd.c.': 'Delantero',
    'st': 'Delantero',
    'cf': 'Delantero',
    'sd': 'Delantero',
    'delantero centro': 'Delantero',
    'segundo delantero': 'Delantero'
};

export const ESTADO = {
    semanas: [],
    jugadoresActivos: [],
    semanaActual: null,
    temporadaActivaId: null,
    semanaAEliminar: null,
    siguienteNumeroSemana: 1
};

export const DOM = {};

export function initDOM() {
    DOM.historialScreen = document.getElementById('historial-screen');
    DOM.editorScreen = document.getElementById('editor-screen');
    DOM.listaSemanasContainer = document.getElementById('lista-semanas-container');
    DOM.editorContainer = document.getElementById('editor-container');
    DOM.headerTitulo = document.getElementById('header-titulo');
    DOM.btnNuevaSemana = document.getElementById('btn-nueva-semana');
    DOM.btnGuardarCambios = document.getElementById('btn-guardar-cambios');
    DOM.btnDescargarPdf = document.getElementById('btn-descargar-pdf');
    DOM.btnEditarSemana = document.getElementById('btn-editar-semana');
    DOM.btnPantallaCompleta = document.getElementById('btn-pantalla-completa');
    DOM.modalEliminar = document.getElementById('modal-eliminar-semana');
    DOM.btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
    DOM.btnCancelarEliminar = document.getElementById('btn-cancelar-eliminar');
    DOM.notificacion = document.getElementById('notificacion');
    DOM.notificacionMensaje = document.getElementById('notificacion-mensaje');
    
    // Modal de creación
    DOM.modalCrearSemana = document.getElementById('modal-crear-semana');
    DOM.inputNumeroSemana = document.getElementById('input-numero-semana');
    DOM.inputFechaInicio = document.getElementById('input-fecha-inicio');
    DOM.inputFechaFin = document.getElementById('input-fecha-fin');
    DOM.btnConfirmarCrearSemana = document.getElementById('btn-confirmar-crear-semana');
    DOM.btnCancelarCrearSemana = document.getElementById('btn-cancelar-crear-semana');
    
    // Modal de edición
    DOM.modalEditarSemana = document.getElementById('modal-editar-semana');
    DOM.inputEditarNumeroSemana = document.getElementById('input-editar-numero-semana');
    DOM.inputEditarFechaInicio = document.getElementById('input-editar-fecha-inicio');
    DOM.inputEditarFechaFin = document.getElementById('input-editar-fecha-fin');
    DOM.btnConfirmarEditarSemana = document.getElementById('btn-confirmar-editar-semana');
    DOM.btnCancelarEditarSemana = document.getElementById('btn-cancelar-editar-semana');
}