// ---------- Estado global pre-partido ----------

let partidoId = null;
let partido = null;
let analisis = null;
let tabActiva = "resumen";
let fichaSeleccionadaId = null;

const TABS = ["resumen", "ataque", "defensa", "corners_favor", "corners_contra"];
const COLOR_PROPIO = "#eab308";
const COLOR_RIVAL_DEFECTO = "#c0392b";

function analisisVacio() {
  return {
    color_rival: COLOR_RIVAL_DEFECTO,
    textos: { resumen: "", ataque: "", defensa: "", corners_favor: "", corners_contra: "" },
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

function normalizarAnalisis(a) {
  const base = analisisVacio();
  if (!a || typeof a !== "object") return base;

  const p = a.pizarras || {};
  const f = a.formaciones || {};
  const g = a.generado || {};

  return {
    color_rival: typeof a.color_rival === "string" ? a.color_rival : base.color_rival,
    textos: { ...base.textos, ...(a.textos || {}) },
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

function fichasActuales() {
  return analisis.pizarras[tabActiva];
}

function colorDeFicha(ficha) {
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