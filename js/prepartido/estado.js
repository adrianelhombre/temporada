// ---------- Estado global pre-partido ----------

let partidoId = null;
let partido = null;
let analisis = null;
let tabActiva = "resumen";
let fichaSeleccionadaId = null;

const TABS = ["resumen", "ataque", "defensa", "corners_favor", "corners_contra"];
const COLOR_PROPIO = "#eab308";
const COLOR_RIVAL_DEFECTO = "#c0392b";
const COLOR_PORTERO = "#404040"; 

const NUM_ULTIMOS_PARTIDOS = 5;
const NUM_JUGADORES_DESTACADOS = 5;

// ---------- Estructuras vacías ----------

function clasificacionVacia() {
  return { pos: "", g: "", e: "", p: "", gf: "", gc: "", pts: "" };
}

function filaPartidoVacia() {
  return { estado: "", local: "", resultado: "", visitante: "" };
}

function filaDestacadoVacia() {
  return { num: "", nombre: "", posicion: "" };
}

function textosVacios() {
  return {
    resumen: {
      ultimos_partidos: Array.from({ length: NUM_ULTIMOS_PARTIDOS }, filaPartidoVacia),
      clasificacion: {
        propio: { nombre: "Balsas", ...clasificacionVacia() },
        rival:  { nombre: "",       ...clasificacionVacia() }
      },
      jugadores_destacados: Array.from({ length: NUM_JUGADORES_DESTACADOS }, filaDestacadoVacia)
    },
    ataque: {
      salida_balon: "",
      estilo_juego: "",
      transiciones: ""
    },
    defensa: {
      presion_salida: "",
      estilo_defensivo: "",
      transiciones: ""
    },
    corners_favor: {
      jugadores_referencia: "",
      jugadas_habituales: "",
      otros: ""
    },
    corners_contra: {
      tipo_marcaje: "",
      debilidades: "",
      atacantes_sin_defender: ""
    }
  };
}

function analisisVacio() {
  return {
    color_rival: COLOR_RIVAL_DEFECTO,
    textos: textosVacios(),
    pizarras: { resumen: [], ataque: [], defensa: [], corners_favor: [], corners_contra: [] },
    formaciones: {
      resumen: { rival: "4-3-3", propio: null },
      ataque: { rival: "4-3-3", propio: "4-3-3" },
      defensa: { rival: "4-3-3", propio: "4-3-3" },
      corners_favor: { rival: null, propio: null },
      corners_contra: { rival: null, propio: null }
    },
    generado: {
      resumen: false, ataque: false, defensa: false,
      corners_favor: false, corners_contra: false
    }
  };
}

// ---------- Normalización ----------

function mergeSimple(obj, campos) {
  const out = {};
  campos.forEach(k => {
    out[k] = (obj && typeof obj[k] === "string") ? obj[k] : "";
  });
  return out;
}

function mergeClasificacionFila(base, obj) {
  const out = {
    nombre: (obj && typeof obj.nombre === "string") ? obj.nombre : base.nombre
  };
  ["pos", "g", "e", "p", "gf", "gc", "pts"].forEach(k => {
    out[k] = (obj && typeof obj[k] === "string") ? obj[k] : "";
  });
  return out;
}

function mergeResumen(r) {
  const base = textosVacios().resumen;
  if (!r || typeof r !== "object") return base;

  // Últimos partidos: array de hasta N filas
  const up = Array.isArray(r.ultimos_partidos) ? r.ultimos_partidos : [];
  const ultimos = [];
  for (let i = 0; i < NUM_ULTIMOS_PARTIDOS; i++) {
    const f = up[i] || {};
    ultimos.push({
      estado:    typeof f.estado === "string" ? f.estado : "",
      local:     typeof f.local === "string" ? f.local : "",
      resultado: typeof f.resultado === "string" ? f.resultado : "",
      visitante: typeof f.visitante === "string" ? f.visitante : ""
    });
  }

  // Clasificación: dos filas con nombre + 7 campos
  const clasif = r.clasificacion || {};
  const propio = mergeClasificacionFila(base.clasificacion.propio, clasif.propio);
  const rival  = mergeClasificacionFila(base.clasificacion.rival,  clasif.rival);
  if (!propio.nombre) propio.nombre = "Balsas";

  // Jugadores destacados: array de hasta N filas
  const jd = Array.isArray(r.jugadores_destacados) ? r.jugadores_destacados : [];
  const destacados = [];
  for (let i = 0; i < NUM_JUGADORES_DESTACADOS; i++) {
    const f = jd[i] || {};
    destacados.push({
      num:      typeof f.num === "string" ? f.num : "",
      nombre:   typeof f.nombre === "string" ? f.nombre : "",
      posicion: typeof f.posicion === "string" ? f.posicion : ""
    });
  }

  return {
    ultimos_partidos: ultimos,
    clasificacion: { propio, rival },
    jugadores_destacados: destacados
  };
}

function normalizarAnalisis(a) {
  const base = analisisVacio();
  if (!a || typeof a !== "object") return base;

  const p = a.pizarras || {};
  const f = a.formaciones || {};
  const g = a.generado || {};
  const t = a.textos || {};

  return {
    color_rival: typeof a.color_rival === "string" ? a.color_rival : base.color_rival,
    textos: {
      resumen: mergeResumen(t.resumen),
      ataque: mergeSimple(t.ataque, ["salida_balon", "estilo_juego", "transiciones"]),
      defensa: mergeSimple(t.defensa, ["presion_salida", "estilo_defensivo", "transiciones"]),
      corners_favor: mergeSimple(t.corners_favor, ["jugadores_referencia", "jugadas_habituales", "otros"]),
      corners_contra: mergeSimple(t.corners_contra, ["tipo_marcaje", "debilidades", "atacantes_sin_defender"])
    },
    pizarras: {
      resumen: Array.isArray(p.resumen) ? p.resumen : [],
      ataque: Array.isArray(p.ataque) ? p.ataque : [],
      defensa: Array.isArray(p.defensa) ? p.defensa : [],
      corners_favor: Array.isArray(p.corners_favor) ? p.corners_favor : [],
      corners_contra: Array.isArray(p.corners_contra) ? p.corners_contra : []
    },
    formaciones: {
      resumen: { ...base.formaciones.resumen, ...(f.resumen || {}) },
      ataque: { ...base.formaciones.ataque, ...(f.ataque || {}) },
      defensa: { ...base.formaciones.defensa, ...(f.defensa || {}) },
      corners_favor: { rival: null, propio: null },
      corners_contra: { rival: null, propio: null }
    },
    generado: {
      resumen: g.resumen === true,
      ataque: g.ataque === true,
      defensa: g.defensa === true,
      corners_favor: g.corners_favor === true,
      corners_contra: g.corners_contra === true
    }
  };
}

// ---------- Helpers ----------

function fichasActuales() {
  return analisis.pizarras[tabActiva];
}

function colorDeFicha(ficha) {
  if (ficha.posicion === "por") return COLOR_PORTERO;
  return ficha.equipo === "rival" ? analisis.color_rival : COLOR_PROPIO;
}

// Devuelve '#000000' o '#ffffff' según luminancia del fondo
function colorTextoContraste(hex) {
  const c = (hex || "#000").replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#000000" : "#ffffff";
}

// ---------- Persistencia ----------

async function guardarAnalisis() {
  const { error } = await supabaseClient
    .from("partidos")
    .update({ analisis_previo: analisis })
    .eq("id", partidoId);

  if (error) {
    notificarError(error, "No se pudo guardar el análisis.");
    return false;
  }
  return true;
}

async function cargarPartido() {
  const { data, error } = await supabaseClient
    .from("partidos")
    .select("*")
    .eq("id", partidoId)
    .single();

  if (error || !data) throw error || new Error("Partido no encontrado.");
  partido = data;
  analisis = normalizarAnalisis(data.analisis_previo);
}