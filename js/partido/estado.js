// ---------- Estado global ----------

let partidoId = null;
let partido = null;
let jugadores = [];
let eventosPartido = [];
let eventosRival = [];
let sustituciones = [];
let estadoDirecto = null;
let modoCambio = false;
let seleccion = null;
let cambiosPendientes = [];
let contadorTick = 0;
let slotHuecoActual = null;
let operacionEnCurso = false;

// --- NUEVO: Timestamp global de inicio del partido (NUNCA cambia) ---
let inicioPartidoTimestamp = null;

// ---------- Helpers ----------

function jugadorPorId(id) {
  return jugadores.find((j) => j.id === id);
}

function jugadorActivo(jugador) {
  return jugador && jugador.activo !== false;
}

function estaExpulsado(jugadorId) {
  return (estadoDirecto.expulsados || []).includes(jugadorId);
}

function amarillasJugador(jugadorId) {
  return eventosPartido.filter((evento) => evento.jugador_id === jugadorId && evento.tipo === "amarilla").length;
}

function estadoVacio(formacion) {
  const huecos = {};
  FORMACIONES[formacion].forEach((slot) => (huecos[slot.id] = null));
  return {
    estado: "no_iniciado",
    parte: 1,
    segundosAcumulados: 0,
    huecos,
    minutos: {},
    expulsados: [],
    titulares: [],
    tramos: [],
  };
}

// ---------- Cálculo de tiempo ----------

function segundosParteActual() {
  return estadoDirecto.segundosAcumulados || 0;
}

// --- NUEVO: Obtener segundos desde el inicio del partido ---
function segundosDesdeInicio(momentoISO) {
  if (!inicioPartidoTimestamp) return 0;
  const momento = new Date(momentoISO).getTime();
  const inicio = new Date(inicioPartidoTimestamp).getTime();
  return Math.max(0, (momento - inicio) / 1000);
}

// --- NUEVO: Obtener timestamp a partir de segundos desde inicio ---
function timestampDesdeSegundos(segundos) {
  if (!inicioPartidoTimestamp) return new Date().toISOString();
  const inicio = new Date(inicioPartidoTimestamp).getTime();
  return new Date(inicio + segundos * 1000).toISOString();
}

// ---------- Carga ----------

async function cargarPartido() {
  const { data, error } = await supabaseClient.from("partidos").select("*").eq("id", partidoId).single();
  if (error || !data) throw error || new Error("Partido no encontrado.");
  partido = data;
  if (!FORMACIONES[partido.formacion]) throw new Error("El partido tiene una formación no válida.");
  
  if (!estadoDirecto_valido(partido.estado_directo)) {
    estadoDirecto = estadoVacio(partido.formacion);
  } else {
    const base = estadoVacio(partido.formacion);
    estadoDirecto = {
      ...base,
      ...partido.estado_directo,
      huecos: { ...base.huecos, ...partido.estado_directo.huecos },
      minutos: partido.estado_directo.minutos || {},
      expulsados: Array.isArray(partido.estado_directo.expulsados) ? partido.estado_directo.expulsados : [],
      titulares: Array.isArray(partido.estado_directo.titulares) ? partido.estado_directo.titulares : [],
      tramos: Array.isArray(partido.estado_directo.tramos) ? partido.estado_directo.tramos : [],
    };
  }
  
  // Recuperar inicioPartidoTimestamp si existe
  if (partido.inicio_timestamp) {
    inicioPartidoTimestamp = partido.inicio_timestamp;
  }
  
  document.getElementById("notasPartido").value = partido.notas || "";
  document.getElementById("selectFormacion").value = partido.formacion;
  
  if (typeof sincronizarTick === 'function') {
    sincronizarTick();
  }
}

function estadoDirecto_valido(ed) {
  return ed && ed.huecos && Object.keys(ed.huecos).length > 0;
}

async function cargarJugadores() {
  const { data, error } = await supabaseClient.from("jugadores").select("*").order("dorsal");
  if (error) throw error;
  jugadores = data || [];
}

async function cargarEventos() {
  const [
    { data: ep, error: errorPropios },
    { data: er, error: errorRivales },
    { data: su, error: errorSustituciones }
  ] = await Promise.all([
    supabaseClient
      .from("eventos_partido")
      .select("*")
      .eq("partido_id", partidoId)
      .order("momento"),
    supabaseClient
      .from("eventos_rival")
      .select("*")
      .eq("partido_id", partidoId)
      .order("momento"),
    supabaseClient
      .from("sustituciones")
      .select("*")
      .eq("partido_id", partidoId)
      .order("segundo")
      .order("bloque_orden")
  ]);

  if (errorPropios || errorRivales || errorSustituciones) {
    throw errorPropios || errorRivales || errorSustituciones;
  }

  eventosPartido = ep || [];
  eventosRival = er || [];
  sustituciones = su || [];

  const expulsadosActuales = eventosPartido
    .filter(e => e.tipo === "roja")
    .map(e => e.jugador_id);
  estadoDirecto.expulsados = [...new Set(expulsadosActuales)];
}

// ---------- Persistencia ----------

async function persistirEstadoDirecto() {
  const { error } = await supabaseClient.from("partidos").update({ estado_directo: estadoDirecto }).eq("id", partidoId);
  if (error) {
    notificarError(error, "No se pudo guardar el estado del partido.");
    return false;
  }
  return true;
}

async function persistirPartido(campos) {
  const { error } = await supabaseClient.from("partidos").update(campos).eq("id", partidoId);
  if (error) {
    notificarError(error, "No se pudo guardar el partido.");
    return false;
  }
  Object.assign(partido, campos);
  return true;
}

async function guardarPartidoSeguro(campos) {
  const { error } = await supabaseClient.from("partidos").update(campos).eq("id", partidoId);
  if (error) {
    notificarError(error, "No se pudo guardar el partido.");
    return false;
  }
  Object.assign(partido, campos);
  if (campos.estado_directo) {
    estadoDirecto = campos.estado_directo;
  }
  return true;
}

// ---------- Confirmación genérica ----------

let callbackConfirmacion = null;

function mostrarConfirmacion(mensaje, alConfirmar) {
  document.getElementById("textoConfirmacion").textContent = mensaje;
  callbackConfirmacion = alConfirmar;
  document.getElementById("modalConfirmacion").classList.remove("oculto");
}

function cerrarConfirmacion() {
  document.getElementById("modalConfirmacion").classList.add("oculto");
  callbackConfirmacion = null;
}

// ---------- Wrapper anti-colisión ----------

async function ejecutarAccion(accion) {
  if (operacionEnCurso) return;
  operacionEnCurso = true;
  try {
    await accion();
  } catch (error) {
    notificarError(error, "No se pudo completar la operación.");
  } finally {
    operacionEnCurso = false;
  }
}