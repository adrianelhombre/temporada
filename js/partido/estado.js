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
let slotHuecoActual = null;
let operacionEnCurso = false;

// Timestamp global de inicio del partido (NUNCA cambia)
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
    // ---- Reloj del partido (patrón acumulado + inicio) ----
    // segundosAcumulados: tiempo ya cerrado/consolidado de la parte actual (no corre).
    // inicioTramoTimestamp: cuándo empezó a correr el tramo actual (null si está parado).
    segundosAcumulados: 0,
    inicioTramoTimestamp: null,
    inicioSegundaParteTimestamp: null,
    huecos,
    // ---- Reloj por jugador (mismo patrón, uno por jugador) ----
    // minutos: segundos ya consolidados de ese jugador (no corre).
    // inicioJugador: desde cuándo está corriendo ese jugador en el campo (null si no corre).
    minutos: {},
    inicioJugador: {},
    expulsados: [],
    titulares: []
  };
}

// ---------- Cálculo de tiempo (patrón acumulado + delta desde inicio) ----------

// Segundos jugados en el tramo actual, en este instante exacto.
function segundosParteActual() {
  if (estadoDirecto.estado === "descanso") {
    return 0;
  }
  const base = estadoDirecto.segundosAcumulados || 0;
  if (estadoDirecto.estado === "en_curso" && estadoDirecto.inicioTramoTimestamp) {
    const transcurrido = (Date.now() - new Date(estadoDirecto.inicioTramoTimestamp).getTime()) / 1000;
    return base + Math.max(0, transcurrido);
  }
  return base;
}

// Segundos jugados por un jugador concreto, en este instante exacto.
function segundosJugador(jugadorId) {
  const base = (estadoDirecto.minutos && estadoDirecto.minutos[jugadorId]) || 0;
  const inicio = estadoDirecto.inicioJugador && estadoDirecto.inicioJugador[jugadorId];
  if (estadoDirecto.estado === "en_curso" && inicio && !estaExpulsado(jugadorId)) {
    const transcurrido = (Date.now() - new Date(inicio).getTime()) / 1000;
    return base + Math.max(0, transcurrido);
  }
  return base;
}

// Consolida (cierra) el tiempo corrido del tramo actual dentro de segundosAcumulados,
// y detiene el reloj (inicioTramoTimestamp = null). Idempotente y segura de llamar varias veces.
function consolidarTramo() {
  if (estadoDirecto.inicioTramoTimestamp) {
    estadoDirecto.segundosAcumulados = segundosParteActual();
    estadoDirecto.inicioTramoTimestamp = null;
  }
}

// Arranca (o reanuda) el reloj del tramo actual desde ahora mismo.
function arrancarTramo() {
  estadoDirecto.inicioTramoTimestamp = new Date().toISOString();
}

// Consolida el tiempo corrido de un jugador dentro de minutos[], y para su reloj.
function consolidarJugador(jugadorId) {
  const inicio = estadoDirecto.inicioJugador && estadoDirecto.inicioJugador[jugadorId];
  if (inicio) {
    estadoDirecto.minutos[jugadorId] = segundosJugador(jugadorId);
    estadoDirecto.inicioJugador[jugadorId] = null;
  }
}

// Arranca el reloj de un jugador desde ahora mismo (si no estaba ya corriendo).
function arrancarJugador(jugadorId) {
  if (!estadoDirecto.inicioJugador) estadoDirecto.inicioJugador = {};
  if (estadoDirecto.minutos[jugadorId] === undefined) estadoDirecto.minutos[jugadorId] = 0;
  estadoDirecto.inicioJugador[jugadorId] = new Date().toISOString();
}

// Consolida a TODOS los jugadores actualmente en el campo (usado al pausar, ir a descanso, finalizar...).
function consolidarTodosLosJugadoresEnCampo() {
  Object.values(estadoDirecto.huecos).filter(Boolean).forEach((jugadorId) => {
    consolidarJugador(jugadorId);
  });
}

// Arranca a todos los jugadores actualmente en el campo que no estén expulsados.
function arrancarTodosLosJugadoresEnCampo() {
  Object.values(estadoDirecto.huecos).filter(Boolean).forEach((jugadorId) => {
    if (!estaExpulsado(jugadorId)) arrancarJugador(jugadorId);
  });
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
      inicioJugador: partido.estado_directo.inicioJugador || {},
      expulsados: Array.isArray(partido.estado_directo.expulsados) ? partido.estado_directo.expulsados : [],
      titulares: Array.isArray(partido.estado_directo.titulares) ? partido.estado_directo.titulares : [],
    };
  }

  if (partido.inicio_timestamp) {
    inicioPartidoTimestamp = partido.inicio_timestamp;
  }

  document.getElementById("notasPartido").value = partido.notas || "";
  document.getElementById("selectFormacion").value = partido.formacion;
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

  // Calcular expulsados (rojas directas + segunda amarilla)
  const rojasDirectas = eventosPartido
    .filter(e => e.tipo === "roja")
    .map(e => e.jugador_id);

  // Jugadores con 2 o más amarillas (segunda amarilla)
  const conteoAmarillas = {};
  eventosPartido
    .filter(e => e.tipo === "amarilla")
    .forEach(e => {
      conteoAmarillas[e.jugador_id] = (conteoAmarillas[e.jugador_id] || 0) + 1;
    });

  const segundasAmarillas = Object.entries(conteoAmarillas)
    .filter(([_, count]) => count >= 2)
    .map(([id, _]) => id);

  // Unión de ambos grupos
  const expulsadosActuales = [...new Set([...rojasDirectas, ...segundasAmarillas])];
  estadoDirecto.expulsados = expulsadosActuales;
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