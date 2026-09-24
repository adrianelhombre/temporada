// ---------- Constantes ----------

const TABS_CON_FORMACIONES = ["resumen", "ataque", "defensa"];

// ---------- Inicialización ----------

(async () => {
  if (!await exigirSesion()) return;

  partidoId = parametroURL("id");
  if (!partidoId) { location.href = "partidos.html"; return; }

  try {
    await cargarPartido();
  } catch (error) {
    notificarError(error, "No se pudo cargar el partido.");
    return;
  }

  document.getElementById("tituloPrepartido").textContent = `Pre-partido vs ${partido.rival}`;
  document.getElementById("nombreRivalBtn").textContent = partido.rival;

  // --- Color rival ---
  const inputColor = document.getElementById("inputColorRival");
  inputColor.value = analisis.color_rival;
  inputColor.addEventListener("input", (e) => cambiarColorRival(e.target.value));

  // --- Selects de formación ---
  poblarSelectFormaciones();
  document.getElementById("selectFormRival").addEventListener("change", (e) =>
    ejecutarAplicarFormacion("rival", e.target.value)
  );
  document.getElementById("selectFormPropia").addEventListener("change", (e) =>
    ejecutarAplicarFormacion("propio", e.target.value)
  );

  // --- Botones de añadir ficha ---
  document.getElementById("btnAnadirPropio").addEventListener("click", () => anadirFicha("propio"));
  document.getElementById("btnAnadirRival").addEventListener("click", () => anadirFicha("rival"));

  // --- Botón borrar todas ---
  document.getElementById("btnBorrarTodas").addEventListener("click", borrarTodasFichas);

  // --- Tabs ---
  document.querySelectorAll(".tab-prepartido").forEach(btn => {
    btn.addEventListener("click", () => cambiarTab(btn.dataset.tab));
  });

  // --- Panel de texto: construir grids, clasificación y listeners ---
  construirPanelTexto();

  // --- Menú ficha ---
  document.getElementById("btnEditarFicha").addEventListener("click", abrirModalEtiqueta);
  document.getElementById("btnBorrarFicha").addEventListener("click", borrarFichaSeleccionada);

  // --- Modal etiqueta ---
  document.getElementById("btnGuardarEtiqueta").addEventListener("click", guardarEtiqueta);
  document.getElementById("btnCancelarEtiqueta").addEventListener("click", cancelarEtiqueta);
  document.getElementById("inputEtiquetaFicha").addEventListener("keydown", (e) => {
    if (e.key === "Enter") guardarEtiqueta();
    if (e.key === "Escape") cancelarEtiqueta();
  });

  // --- Deseleccionar al hacer click fuera ---
  document.addEventListener("pointerdown", (e) => {
    if (document.querySelector(".superposicion:not(.oculto)")) return;
    if (e.target.closest(".ficha-pizarra")) return;
    if (e.target.closest(".menu-ficha-flotante")) return;
    deseleccionarFicha();
  });

  window.addEventListener("scroll", () => {
    if (fichaSeleccionadaId !== null) deseleccionarFicha();
  }, { passive: true });

  // --- Generar formaciones en la primera apertura ---
  await generarSiEsNecesario();

  // --- Ajustar controles según pestaña activa ---
  actualizarControlesPorPestana();

  // --- Pintar ---
  pintarPizarra();
  pintarTexto();
  refrescarValoresTexto();
})();

// ---------- Formaciones ----------

function poblarSelectFormaciones() {
  // Las formaciones válidas son las definidas para la pestaña "resumen".
  // Como todas las pestañas tienen las mismas 4 formaciones (4-3-3, 4-4-2,
  // 4-2-3-1, 3-5-2), basta con leer las claves de cualquiera de ellas.
  const formaciones = Object.keys(FORMACIONES_PREPARTIDO.resumen.rival);
  const opciones = formaciones.map(n => `<option value="${n}">${n}</option>`).join("");
  document.getElementById("selectFormRival").innerHTML = opciones;
  document.getElementById("selectFormPropia").innerHTML = opciones;
}

async function ejecutarAplicarFormacion(equipo, nombreFormacion) {
  await aplicarFormacion(equipo, nombreFormacion);
}

function actualizarControlesPorPestana() {
  const tab = tabActiva;

  // Botón +Balsas (oculto en resumen)
  document.getElementById("btnAnadirPropio").style.display =
    tab === "resumen" ? "none" : "";

  // Select formación Balsas (oculto en resumen y corners)
  const mostrarPropia = TABS_CON_FORMACIONES.includes(tab) && tab !== "resumen";
  document.getElementById("wrapperFormPropia").classList.toggle("oculto", !mostrarPropia);

  // Select formación Rival (oculto en corners)
  document.getElementById("wrapperFormRival").classList.toggle(
    "oculto", !TABS_CON_FORMACIONES.includes(tab)
  );

  // Sincronizar valores de los selects con el estado actual
  const form = analisis.formaciones[tab] || { rival: null, propio: null };
  const selRival = document.getElementById("selectFormRival");
  const selPropia = document.getElementById("selectFormPropia");
  selRival.value = form.rival || "";
  selPropia.value = form.propio || "";
}

// ---------- Cambio de pestaña ----------

function cambiarTab(nuevaTab) {
  if (!TABS.includes(nuevaTab)) return;
  if (nuevaTab === tabActiva) return;

  deseleccionarFicha();
  tabActiva = nuevaTab;

  document.querySelectorAll(".tab-prepartido").forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.tab === nuevaTab);
  });

  actualizarControlesPorPestana();
  pintarPizarra();
  pintarTexto();
  refrescarValoresTexto();
}