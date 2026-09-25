// ---------- Textos por pestaña ----------

// ---------- Pintado de secciones ----------

function pintarTexto() {
  document.querySelectorAll(".seccion-texto").forEach(sec => {
    sec.classList.toggle("oculto", sec.dataset.seccion !== tabActiva);
  });
}

// ---------- Construcción dinámica de las grids del resumen ----------

function construirGridUltimosPartidos() {
  const cont = document.querySelector(".grid-ultimos");
  cont.innerHTML = "";

  for (let i = 0; i < NUM_ULTIMOS_PARTIDOS; i++) {
    // Círculo de estado
    const estado = document.createElement("button");
    estado.type = "button";
    estado.className = "circulo-estado";
    estado.dataset.idx = i;
    estado.dataset.estado = "";
    estado.title = "Click para cambiar: victoria / empate / derrota";
    cont.appendChild(estado);

    // Local
    const inpLocal = document.createElement("input");
    inpLocal.type = "text";
    inpLocal.className = "local";
    inpLocal.maxLength = 30;
    inpLocal.dataset.tab = "resumen";
    inpLocal.dataset.key = "ultimos_partidos";
    inpLocal.dataset.idx = i;
    inpLocal.dataset.col = "local";

    // Resultado
    const inpRes = document.createElement("input");
    inpRes.type = "text";
    inpRes.className = "resultado";
    inpRes.maxLength = 5;
    inpRes.dataset.tab = "resumen";
    inpRes.dataset.key = "ultimos_partidos";
    inpRes.dataset.idx = i;
    inpRes.dataset.col = "resultado";

    // Visitante
    const inpVis = document.createElement("input");
    inpVis.type = "text";
    inpVis.className = "visitante";
    inpVis.maxLength = 30;
    inpVis.dataset.tab = "resumen";
    inpVis.dataset.key = "ultimos_partidos";
    inpVis.dataset.idx = i;
    inpVis.dataset.col = "visitante";

    cont.appendChild(inpLocal);
    cont.appendChild(inpRes);
    cont.appendChild(inpVis);
  }
}

function construirGridDestacados() {
  const cont = document.querySelector(".grid-destacados");
  cont.innerHTML = "";

  // Encabezados (3 columnas, sin celda fantasma)
  ["NUM", "NOMBRE", "POSICIÓN"].forEach(txt => {
    const h = document.createElement("div");
    h.className = "celda-head";
    h.textContent = txt;
    cont.appendChild(h);
  });

  for (let i = 0; i < NUM_JUGADORES_DESTACADOS; i++) {
    // NUM
    const inpNum = document.createElement("input");
    inpNum.type = "text";
    inpNum.className = "num";
    inpNum.maxLength = 2;
    inpNum.dataset.tab = "resumen";
    inpNum.dataset.key = "jugadores_destacados";
    inpNum.dataset.idx = i;
    inpNum.dataset.col = "num";

    // Nombre
    const inpNom = document.createElement("input");
    inpNom.type = "text";
    inpNom.className = "nombre";
    inpNom.maxLength = 40;
    inpNom.dataset.tab = "resumen";
    inpNom.dataset.key = "jugadores_destacados";
    inpNom.dataset.idx = i;
    inpNom.dataset.col = "nombre";

    // Posición
    const inpPos = document.createElement("input");
    inpPos.type = "text";
    inpPos.className = "posicion";
    inpPos.maxLength = 6;
    inpPos.dataset.tab = "resumen";
    inpPos.dataset.key = "jugadores_destacados";
    inpPos.dataset.idx = i;
    inpPos.dataset.col = "posicion";

    cont.appendChild(inpNum);
    cont.appendChild(inpNom);
    cont.appendChild(inpPos);
  }
}

// ---------- Construcción dinámica de la clasificación ----------

function construirGridClasificacion() {
  const cont = document.getElementById("gridClasificacion");
  cont.innerHTML = "";

  // Encabezados
  ["EQUIPO", "POS", "G", "E", "P", "GF", "GC", "PTS"].forEach(txt => {
    const h = document.createElement("div");
    h.className = "celda-head";
    h.textContent = txt;
    cont.appendChild(h);
  });

  // Fila Balsas
  cont.appendChild(crearFilaClasificacion("propio"));
  // Fila Rival
  cont.appendChild(crearFilaClasificacion("rival"));
}

function crearFilaClasificacion(equipo) {
  const frag = document.createDocumentFragment();

  // Nombre: contenteditable
  const nombre = document.createElement("div");
  nombre.className = "celda-nombre";
  nombre.contentEditable = "true";
  nombre.spellcheck = false;
  nombre.dataset.eq = equipo;
  nombre.dataset.col = "nombre";
  frag.appendChild(nombre);

  // Columnas numéricas
  ["pos", "g", "e", "p", "gf", "gc", "pts"].forEach(col => {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.maxLength = 2;
    inp.dataset.tab = "resumen";
    inp.dataset.key = "clasificacion";
    inp.dataset.eq = equipo;
    inp.dataset.col = col;
    frag.appendChild(inp);
  });

  return frag;
}

// ---------- Relleno de valores ----------

function refrescarValoresTexto() {
  // --- Últimos partidos ---
  document.querySelectorAll('.grid-ultimos input[data-key="ultimos_partidos"]').forEach(el => {
    const i = Number(el.dataset.idx);
    const col = el.dataset.col;
    const fila = analisis.textos.resumen.ultimos_partidos[i] || {};
    el.value = fila[col] || "";
  });

  // --- Círculos de estado ---
  refrescarCirculosEstado();

  // --- Jugadores destacados ---
  document.querySelectorAll('.grid-destacados input[data-key="jugadores_destacados"]').forEach(el => {
    const i = Number(el.dataset.idx);
    const col = el.dataset.col;
    const fila = analisis.textos.resumen.jugadores_destacados[i] || {};
    el.value = fila[col] || "";
  });

  // --- Clasificación: nombres (contenteditable) ---
  document.querySelectorAll(".grid-clasificacion .celda-nombre").forEach(el => {
    const eq = el.dataset.eq;
    el.textContent = analisis.textos.resumen.clasificacion[eq].nombre || "";
  });

  // --- Clasificación: campos numéricos ---
  document.querySelectorAll('.grid-clasificacion input[data-key="clasificacion"]').forEach(el => {
    const eq = el.dataset.eq;
    const col = el.dataset.col;
    el.value = analisis.textos.resumen.clasificacion[eq][col] || "";
  });

  // Nombre del rival por defecto, si la celda está vacía
  const celdaRival = document.querySelector('.grid-clasificacion .celda-nombre[data-eq="rival"]');
  if (celdaRival && !celdaRival.textContent.trim() && partido) {
    celdaRival.textContent = partido.rival;
    analisis.textos.resumen.clasificacion.rival.nombre = partido.rival;
  }

  // Reordenar por POS al cargar
  reordenarClasificacionPorPos();
}

function refrescarCirculosEstado() {
  document.querySelectorAll(".circulo-estado").forEach(el => {
    const i = Number(el.dataset.idx);
    const fila = analisis.textos.resumen.ultimos_partidos[i] || {};
    const estado = fila.estado || "";
    el.dataset.estado = estado;
    el.classList.remove("estado-v", "estado-e", "estado-d");
    if (estado === "V") el.classList.add("estado-v");
    else if (estado === "E") el.classList.add("estado-e");
    else if (estado === "D") el.classList.add("estado-d");
  });
}

// ---------- Autoguardado ----------

let timeoutTexto = null;

function programarGuardadoTexto() {
  if (timeoutTexto) clearTimeout(timeoutTexto);
  timeoutTexto = setTimeout(() => { guardarAnalisis(); }, 600);
}

// ---------- Manejo de cambios ----------

function onTextoCambia(e) {
  const el = e.target;
  const tab = el.dataset.tab;
  const key = el.dataset.key;
  if (!tab || !key) return;

  // Últimos partidos
  if (key === "ultimos_partidos") {
    const i = Number(el.dataset.idx);
    const col = el.dataset.col;
    analisis.textos.resumen.ultimos_partidos[i][col] = el.value;
    programarGuardadoTexto();
    return;
  }

  // Jugadores destacados
  if (key === "jugadores_destacados") {
    const i = Number(el.dataset.idx);
    const col = el.dataset.col;
    analisis.textos.resumen.jugadores_destacados[i][col] = el.value;
    programarGuardadoTexto();
    return;
  }

  // Clasificación
  if (key === "clasificacion") {
    const eq = el.dataset.eq;
    const col = el.dataset.col;
    analisis.textos.resumen.clasificacion[eq][col] = el.value;

    if (col === "pos") {
      reordenarClasificacionPorPos();
    }

    programarGuardadoTexto();
    return;
  }

  // Resto de pestañas (textareas simples)
  if (!analisis.textos[tab]) analisis.textos[tab] = {};
  analisis.textos[tab][key] = el.value;
  programarGuardadoTexto();
}

// ---------- Reordenación por POS ----------

// Reordena las dos filas de clasificación en el DOM según POS.
// No toca los datos guardados, solo la posición visual.
// Solo reordena si AMBOS POS son números válidos.
function reordenarClasificacionPorPos() {
  const cont = document.getElementById("gridClasificacion");
  if (!cont) return;

  const eqs = ["propio", "rival"];
  const filas = {};   // equipo -> array de elementos en orden
  const posVal = {};  // equipo -> número

  for (const eq of eqs) {
    const nombre = cont.querySelector(`.celda-nombre[data-eq="${eq}"]`);
    const inputs = ["pos", "g", "e", "p", "gf", "gc", "pts"].map(col =>
      cont.querySelector(`input[data-eq="${eq}"][data-col="${col}"]`)
    );
    filas[eq] = [nombre, ...inputs];

    const posTxt = analisis.textos.resumen.clasificacion[eq].pos?.trim() || "";
    const n = Number(posTxt);
    posVal[eq] = (posTxt !== "" && !isNaN(n)) ? n : null;
  }

  // Si alguno no tiene POS válido, no reordenamos
  if (posVal.propio === null || posVal.rival === null) return;

  const primeroDeberiaSer = posVal.propio <= posVal.rival ? "propio" : "rival";
  const segundoDeberiaSer = primeroDeberiaSer === "propio" ? "rival" : "propio";

  const primerNombreActual = cont.querySelector(".celda-nombre");
  const eqActualPrimero = primerNombreActual?.dataset.eq;

  if (eqActualPrimero === primeroDeberiaSer) return;

  for (const eq of eqs) {
    filas[eq].forEach(el => el.remove());
  }
  filas[primeroDeberiaSer].forEach(el => cont.appendChild(el));
  filas[segundoDeberiaSer].forEach(el => cont.appendChild(el));
}

// ---------- Instalación de listeners ----------

function instalarListenersTexto() {
  // Textareas simples (ataque, defensa, corners...)
  document.querySelectorAll(".panel-texto textarea[data-tab][data-key]").forEach(el => {
    el.addEventListener("input", onTextoCambia);
  });

  // Inputs de resumen (últimos partidos, jugadores destacados, clasificación numérica)
  document.querySelectorAll('.panel-texto input[data-tab][data-key]').forEach(el => {
    el.addEventListener("input", onTextoCambia);
  });

  // Celdas contenteditable del nombre en clasificación
  document.querySelectorAll(".grid-clasificacion .celda-nombre").forEach(el => {
    el.addEventListener("input", () => {
      const eq = el.dataset.eq;
      analisis.textos.resumen.clasificacion[eq].nombre = el.textContent.trim();
      programarGuardadoTexto();
    });

    el.addEventListener("paste", (e) => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData("text");
      document.execCommand("insertText", false, texto);
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });
  });

  // Círculos de estado (últimos partidos)
  document.querySelectorAll(".circulo-estado").forEach(el => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.idx);
      const actual = analisis.textos.resumen.ultimos_partidos[i].estado || "";
      // Ciclo: "" → V → E → D → ""
      const siguiente =
        actual === ""  ? "V" :
        actual === "V" ? "E" :
        actual === "E" ? "D" : "";
      analisis.textos.resumen.ultimos_partidos[i].estado = siguiente;
      refrescarCirculosEstado();
      programarGuardadoTexto();
    });
  });
}

// ---------- Construcción inicial (llamada desde init.js) ----------

function construirPanelTexto() {
  construirGridUltimosPartidos();
  construirGridClasificacion();
  construirGridDestacados();
  instalarListenersTexto();
}