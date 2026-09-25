// ---------- Pizarra táctil ----------

let arrastrandoFicha = null;      // { indice, el }
let arrastreInicio = null;         // { x, y }
let arrastreOffset = { x: 0, y: 0 };
let arrastreMovido = false;

// Modo pizarra: solo se puede marcar con doble clic (clase "seleccionada").
// El clic normal nunca aplica la clase "activa" en este modo, solo sirve para arrastrar.
let modoPizarraActivo = false;

// Índices de fichas marcadas con doble clic (solo en modo pizarra).
let fichasMarcadas = new Set();

// ---------- Pintado ----------

function pintarPizarra() {
  const cont = document.getElementById("pizarraCampo");
  cont.querySelectorAll(".ficha-pizarra").forEach(el => el.remove());

  const fichas = fichasActuales();

  fichas.forEach((ficha, idx) => {
    const el = document.createElement("div");
    el.className = "ficha-pizarra";
    el.style.left = (ficha.x * 100) + "%";
    el.style.top  = (ficha.y * 100) + "%";

    // Fichas rayadas: Balsas y no portero
    const esRayada = ficha.equipo !== "rival" && ficha.posicion !== "por";

    if (esRayada) {
      el.classList.add("ficha-rayada");
    } else {
      const color = colorDeFicha(ficha);
      el.style.background = color;
      el.style.color = colorTextoContraste(color);
    }

    el.textContent = ficha.label || "";
    el.dataset.indice = idx;

    // Marcada por doble clic (solo en modo pizarra)
    if (fichasMarcadas.has(idx)) {
      el.classList.add("seleccionada");
    }

    // Activa por clic normal (solo en modo normal)
    if (!modoPizarraActivo && fichaSeleccionadaId === idx) {
      el.classList.add("activa");
    }

    el.addEventListener("pointerdown", (e) => iniciarArrastre(e, idx, el));

    cont.appendChild(el);
  });

  if (fichaSeleccionadaId !== null) {
    if (fichaSeleccionadaId >= fichas.length) {
      fichaSeleccionadaId = null;
      ocultarMenuFicha();
    } else {
      const el = cont.querySelector(`.ficha-pizarra[data-indice="${fichaSeleccionadaId}"]`);
      if (el) mostrarMenuFicha(el);
    }
  }
}

// ---------- Menú flotante ----------

function mostrarMenuFicha(el) {
  if (modoPizarraActivo) {
    document.getElementById("menuAccionesFicha").classList.add("oculto");
    return;
  }
  const menu = document.getElementById("menuAccionesFicha");
  const rect = el.getBoundingClientRect();
  menu.style.left = (rect.left + rect.width / 2) + "px";
  menu.style.top  = rect.top + "px";
  menu.classList.remove("oculto");
}

function ocultarMenuFicha() {
  document.getElementById("menuAccionesFicha").classList.add("oculto");
}

// Deselecciona la ficha activa (clic normal, solo modo normal).
// NO toca las marcadas con doble clic.
function deseleccionarFicha() {
  fichaSeleccionadaId = null;
  document.querySelectorAll(".ficha-pizarra.activa").forEach(f => {
    f.classList.remove("activa");
  });
  ocultarMenuFicha();
}

// ---------- Modo pizarra ----------

function toggleModoPizarra() {
  modoPizarraActivo = !modoPizarraActivo;

  const btn = document.getElementById("btnModoPizarra");
  btn.classList.toggle("activo", modoPizarraActivo);

  // Al cambiar de modo, limpiamos la selección normal y las marcas
  deseleccionarFicha();
  fichasMarcadas.clear();

  pintarPizarra();
}

function limpiarFichasMarcadas() {
  fichasMarcadas.clear();
}

// ---------- Arrastre ----------

function iniciarArrastre(e, indice, el) {
  e.preventDefault();

  // --- Modo pizarra: doble clic marca/desmarca; clic simple solo arrastra ---
  if (modoPizarraActivo) {
    const ahora = Date.now();
    const ultimo = el.dataset.ultimoClic ? Number(el.dataset.ultimoClic) : 0;
    const esDobleClic = (ahora - ultimo) < 400;

    if (esDobleClic) {
      el.dataset.ultimoClic = 0;

      if (fichasMarcadas.has(indice)) {
        fichasMarcadas.delete(indice);
        el.classList.remove("seleccionada");
      } else {
        fichasMarcadas.add(indice);
        el.classList.add("seleccionada");
      }
      // El doble clic no inicia arrastre
      return;
    }

    el.dataset.ultimoClic = ahora;

    // Clic simple en modo pizarra: solo arrastre, sin clase "activa", sin menú
    arrastrandoFicha = { indice, el };
    arrastreInicio = { x: e.clientX, y: e.clientY };
    arrastreMovido = false;

    const rect = el.getBoundingClientRect();
    arrastreOffset.x = e.clientX - (rect.left + rect.width / 2);
    arrastreOffset.y = e.clientY - (rect.top + rect.height / 2);

    try { el.setPointerCapture(e.pointerId); } catch (_) {}

    el.addEventListener("pointermove", moverFicha);
    el.addEventListener("pointerup", soltarFicha);
    el.addEventListener("pointercancel", soltarFicha);
    return;
  }

  // --- Modo normal: clic simple selecciona con "activa" y muestra menú ---
  document.querySelectorAll(".ficha-pizarra.activa").forEach(f => {
    if (Number(f.dataset.indice) !== indice) f.classList.remove("activa");
  });

  el.classList.add("activa");
  fichaSeleccionadaId = indice;
  mostrarMenuFicha(el);

  arrastrandoFicha = { indice, el };
  arrastreInicio = { x: e.clientX, y: e.clientY };
  arrastreMovido = false;

  const rect = el.getBoundingClientRect();
  arrastreOffset.x = e.clientX - (rect.left + rect.width / 2);
  arrastreOffset.y = e.clientY - (rect.top + rect.height / 2);

  try { el.setPointerCapture(e.pointerId); } catch (_) {}

  el.addEventListener("pointermove", moverFicha);
  el.addEventListener("pointerup", soltarFicha);
  el.addEventListener("pointercancel", soltarFicha);
}

function moverFicha(e) {
  if (!arrastrandoFicha) return;

  const dx = e.clientX - arrastreInicio.x;
  const dy = e.clientY - arrastreInicio.y;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) arrastreMovido = true;
  if (!arrastreMovido) return;

  const campo = document.getElementById("pizarraCampo");
  const rect = campo.getBoundingClientRect();

  const x = e.clientX - rect.left - arrastreOffset.x;
  const y = e.clientY - rect.top  - arrastreOffset.y;

  const xp = Math.max(0, Math.min(100, (x / rect.width)  * 100));
  const yp = Math.max(0, Math.min(100, (y / rect.height) * 100));

  arrastrandoFicha.el.style.left = xp + "%";
  arrastrandoFicha.el.style.top  = yp + "%";

  const ficha = analisis.pizarras[tabActiva][arrastrandoFicha.indice];
  if (ficha) {
    ficha.x = xp / 100;
    ficha.y = yp / 100;
  }
}

async function soltarFicha(e) {
  if (!arrastrandoFicha) return;

  const { el, indice } = arrastrandoFicha;
  el.removeEventListener("pointermove", moverFicha);
  el.removeEventListener("pointerup", soltarFicha);
  el.removeEventListener("pointercancel", soltarFicha);
  try { el.releasePointerCapture(e.pointerId); } catch (_) {}

  const movido = arrastreMovido;
  arrastrandoFicha = null;
  arrastreMovido = false;

  if (movido) await guardarAnalisis();

  // En modo normal, si sigue activa tras soltar, reabrimos el menú
  if (!modoPizarraActivo && fichaSeleccionadaId === indice) {
    mostrarMenuFicha(el);
  }
}

// ---------- Añadir / borrar ----------

async function anadirFicha(equipo) {
  const fichas = fichasActuales();
  const offset = (fichas.length * 0.04) % 0.24;
  const ficha = {
    equipo,
    x: Math.max(0.08, Math.min(0.92, 0.42 + offset)),
    y: Math.max(0.08, Math.min(0.92, 0.42 + offset)),
    label: ""
  };
  fichas.push(ficha);
  deseleccionarFicha();
  pintarPizarra();
  await guardarAnalisis();
}

async function borrarFichaSeleccionada() {
  if (fichaSeleccionadaId === null) return;
  const fichas = fichasActuales();
  fichas.splice(fichaSeleccionadaId, 1);

  const nuevasMarcadas = new Set();
  fichasMarcadas.forEach(i => {
    if (i < fichaSeleccionadaId) nuevasMarcadas.add(i);
    else if (i > fichaSeleccionadaId) nuevasMarcadas.add(i - 1);
  });
  fichasMarcadas = nuevasMarcadas;

  deseleccionarFicha();
  pintarPizarra();
  await guardarAnalisis();
}

async function borrarTodasFichas() {
  analisis.pizarras[tabActiva] = [];
  deseleccionarFicha();
  limpiarFichasMarcadas();
  pintarPizarra();
  await guardarAnalisis();
}

// ---------- Etiqueta ----------

function abrirModalEtiqueta() {
  if (fichaSeleccionadaId === null) return;
  const ficha = fichasActuales()[fichaSeleccionadaId];
  if (!ficha) return;

  document.getElementById("inputEtiquetaFicha").value = ficha.label || "";
  document.getElementById("modalEtiquetaFicha").classList.remove("oculto");
  ocultarMenuFicha();
  setTimeout(() => document.getElementById("inputEtiquetaFicha").focus(), 50);
}

async function guardarEtiqueta() {
  if (fichaSeleccionadaId === null) return;
  const ficha = fichasActuales()[fichaSeleccionadaId];
  if (!ficha) return;

  ficha.label = document.getElementById("inputEtiquetaFicha").value.trim().slice(0, 3);

  document.getElementById("modalEtiquetaFicha").classList.add("oculto");
  pintarPizarra();
  await guardarAnalisis();
}

function cancelarEtiqueta() {
  document.getElementById("modalEtiquetaFicha").classList.add("oculto");
  const el = document.querySelector(`.ficha-pizarra[data-indice="${fichaSeleccionadaId}"]`);
  if (el) mostrarMenuFicha(el);
}

// ---------- Color rival ----------

async function cambiarColorRival(nuevoColor) {
  analisis.color_rival = nuevoColor;
  pintarPizarra();
  await guardarAnalisis();
}

// ---------- Formaciones ----------

function generarFichasFormacion(tab, equipo, nombreFormacion) {
  const formacion = FORMACIONES_PREPARTIDO[tab]?.[equipo]?.[nombreFormacion];
  if (!formacion) return [];

  return formacion.map(([idPos, xPct, yPct]) => ({
    equipo,
    x: Math.max(0.02, Math.min(0.98, xPct / 100)),
    y: Math.max(0.02, Math.min(0.98, yPct / 100)),
    label: "",
    deFormacion: true,
    posicion: idPos
  }));
}

async function aplicarFormacion(equipo, nombreFormacion) {
  const tab = tabActiva;
  const pizarra = analisis.pizarras[tab];

  analisis.pizarras[tab] = pizarra.filter(f =>
    !(f.equipo === equipo && f.deFormacion === true)
  );

  if (nombreFormacion) {
    const nuevas = generarFichasFormacion(tab, equipo, nombreFormacion);
    analisis.pizarras[tab].push(...nuevas);
  }

  if (!analisis.formaciones[tab]) {
    analisis.formaciones[tab] = { rival: null, propio: null };
  }
  if (equipo === "rival") analisis.formaciones[tab].rival = nombreFormacion;
  else analisis.formaciones[tab].propio = nombreFormacion;

  analisis.generado[tab] = true;

  deseleccionarFicha();
  limpiarFichasMarcadas();
  pintarPizarra();
  await guardarAnalisis();
}

async function generarSiEsNecesario() {
  let cambios = false;

  for (const tab of ["resumen", "ataque", "defensa"]) {
    if (analisis.generado[tab]) continue;

    const pizarra = analisis.pizarras[tab];
    const form = analisis.formaciones[tab] || { rival: null, propio: null };

    const hayRival = pizarra.some(f => f.equipo === "rival");
    const hayPropio = pizarra.some(f => f.equipo === "propio");

    if (!hayRival && form.rival) {
      pizarra.push(...generarFichasFormacion(tab, "rival", form.rival));
      cambios = true;
    }
    if (!hayPropio && form.propio) {
      pizarra.push(...generarFichasFormacion(tab, "propio", form.propio));
      cambios = true;
    }

    analisis.generado[tab] = true;
    cambios = true;
  }

  if (cambios) await guardarAnalisis();
}
