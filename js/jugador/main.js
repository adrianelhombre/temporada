// ============================================================
// JUGADOR - PUNTO DE ENTRADA
// ============================================================

let jugadorActual = null;
let temporadaActual = null;
let evaluaciones = [];
let objetivos = [];
let criteriosMap = {};

// ---------- INICIO ----------
(async () => {
  if (!await exigirSesion()) return;

  const jugadorId = parametroURL('id');
  if (!jugadorId) {
    document.getElementById('contenidoJugador').innerHTML = '<p style="color:var(--rojo);">No se especificó un jugador.</p>';
    return;
  }

  await cargarJugador(jugadorId);
  await cargarTemporadaActiva();
  await cargarCriterios();
  await cargarEvaluaciones();
  await cargarObjetivos();

  if (typeof window.__render !== 'undefined' && window.__render.renderizarFicha) {
    window.__render.renderizarFicha();
  } else {
    console.error('renderizarFicha no está disponible');
    document.getElementById('contenidoJugador').innerHTML = '<p style="color:var(--rojo);">Error al cargar la ficha.</p>';
  }
})();

// ---------- EXPORTAR VARIABLES GLOBALES ----------
window.__jugador = {
  getActual: () => jugadorActual,
  getTemporada: () => temporadaActual,
  getEvaluaciones: () => evaluaciones,
  getObjetivos: () => objetivos,
  getCriteriosMap: () => criteriosMap,
  setEvaluaciones: (data) => { evaluaciones = data; },
  setObjetivos: (data) => { objetivos = data; },
};

// ---------- CARGAR JUGADOR ----------
async function cargarJugador(id) {
  const { data, error } = await supabaseClient
    .from('jugadores')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    notificarError(error, 'No se pudo cargar el jugador.');
    return;
  }
  jugadorActual = data;
}

// ---------- CARGAR TEMPORADA ----------
async function cargarTemporadaActiva() {
  const { data, error } = await supabaseClient
    .from('temporadas')
    .select('*')
    .eq('activa', true)
    .maybeSingle();  // <-- CAMBIA .single() por .maybeSingle()

  if (error) {
    // Solo notificar si es un error real, no si es "no encontrado"
    if (error.code !== 'PGRST116') {
      notificarError(error, 'No se pudo cargar la temporada activa.');
    }
    temporadaActual = null;
    return;
  }
  
  temporadaActual = data; // data será null si no hay temporada activa
}

// ---------- CARGAR CRITERIOS ----------
async function cargarCriterios() {
  if (!jugadorActual || !jugadorActual.posicion) {
    criteriosMap = {};
    return;
  }
  criteriosMap = await obtenerCriteriosPorPosicion(jugadorActual.posicion);
}

// ---------- CARGAR EVALUACIONES ----------
async function cargarEvaluaciones() {
  if (!jugadorActual || !temporadaActual) {
    evaluaciones = [];
    window.__jugador.setEvaluaciones(evaluaciones);
    return;
  }
  const evaluacionesData = await obtenerEvaluaciones(jugadorActual.id, temporadaActual.id);
  evaluaciones = evaluacionesData;
  window.__jugador.setEvaluaciones(evaluaciones);
}

// ---------- CARGAR OBJETIVOS ----------
async function cargarObjetivos() {
  if (!jugadorActual || !temporadaActual) {
    objetivos = [];
    window.__jugador.setObjetivos(objetivos);
    return;
  }
  const objetivosData = await obtenerObjetivos(jugadorActual.id, temporadaActual.id);
  objetivos = objetivosData;
  window.__jugador.setObjetivos(objetivos);
}

// ---------- RECARGAR TODO ----------
async function recargarTodo() {
  // 1. Recargar datos desde la base de datos (ESPERAR a que terminen)
  await cargarEvaluaciones();
  await cargarObjetivos();
  
  // 2. Limpiar detalles abiertos
  document.querySelectorAll('.detalle-evaluacion.abierto').forEach(el => {
    el.classList.remove('abierto');
    el.innerHTML = '';
  });
  
  // 3. Re-renderizar la ficha (AHORA los datos ya están actualizados)
  if (typeof window.__render !== 'undefined' && window.__render.renderizarFicha) {
    window.__render.renderizarFicha();
  } else {
    // Fallback: si render no está disponible, recargar la página
    location.reload();
  }
}

window.__recargarTodo = recargarTodo;