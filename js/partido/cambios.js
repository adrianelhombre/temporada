// ---------- Interacción: selección de jugadores ----------

// Variables para menús flotantes
let menuAccionesAbierto = false;
let jugadorMenuActual = null;
let menuSuplenteAbierto = false;
let jugadorSuplenteActual = null;

// ---------- Funciones auxiliares de posiciones ----------
function obtenerPosicionesJugador(jugador) {
  return {
    principal: jugador?.posicion || null,
    secundarias: jugador?.posiciones_secundarias || []
  };
}

// Función auxiliar para generar UUID
function generarUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Verificar si un jugador ya está involucrado en algún cambio pendiente
function jugadorEnCambiosPendientes(jugadorId) {
  return cambiosPendientes.some(c => 
    c.saleJugadorId === jugadorId || c.entraJugadorId === jugadorId
  );
}

function manejarClicCampo(slotId, jugadorId) {
  if (partido.estado === "finalizado") return;
  if (jugadorId && estaExpulsado(jugadorId)) return;

  if (estadoDirecto.estado === "no_iniciado") {
    if (!jugadorId) {
      abrirSelectorHuecoVacio(slotId);
    }
    return;
  }

  if (!jugadorId) {
    abrirSelectorHuecoVacio(slotId);
    return;
  }

  if (menuAccionesAbierto && jugadorMenuActual === jugadorId) {
    cerrarMenuAcciones();
    return;
  }

  if (menuAccionesAbierto) {
    cerrarMenuAcciones();
  }

  if (!modoCambio) {
    abrirMenuAcciones(jugadorId, slotId);
    return;
  }

  // --- MODO CAMBIO ---
  if (estaExpulsado(jugadorId)) {
    mostrarNotificacion("Un jugador expulsado no puede participar en cambios.", "error");
    return;
  }

  if (jugadorEnCambiosPendientes(jugadorId)) {
    mostrarNotificacion("Este jugador ya está involucrado en un cambio pendiente.", "error");
    return;
  }

  if (seleccion && seleccion.origen === "campo" && seleccion.slotId === slotId) {
    seleccion = null;
    pintarTodo();
    return;
  }

  if (!seleccion) {
    seleccion = { origen: "campo", jugadorId, slotId };
    pintarTodo();
    return;
  }

  if (seleccion.origen === "campo") {
    const slotA = seleccion.slotId;
    const slotB = slotId;
    const tmp = estadoDirecto.huecos[slotA];
    estadoDirecto.huecos[slotA] = estadoDirecto.huecos[slotB];
    estadoDirecto.huecos[slotB] = tmp;
    seleccion = null;
    persistirEstadoDirecto();
    pintarTodo();
    return;
  }

  if (seleccion.origen === "banquillo") {
    if (estaExpulsado(jugadorId)) {
      mostrarNotificacion("El jugador que sale está expulsado y no puede ser sustituido.", "error");
      return;
    }
    if (estaExpulsado(seleccion.jugadorId)) {
      mostrarNotificacion("El jugador que entra está expulsado y no puede jugar.", "error");
      return;
    }
    if (jugadorEnCambiosPendientes(seleccion.jugadorId)) {
      mostrarNotificacion("El jugador que entra ya está involucrado en otro cambio.", "error");
      return;
    }
    cambiosPendientes.push({ saleJugadorId: jugadorId, saleSlotId: slotId, entraJugadorId: seleccion.jugadorId });
    seleccion = null;
    pintarTodo();
  }
}

function manejarClicBanquillo(jugadorId) {
  if (partido.estado === "finalizado") return;

  if (estadoDirecto.estado === "no_iniciado") {
    mostrarNotificacion("No se pueden registrar eventos antes de empezar.", "error");
    return;
  }

  if (estaExpulsado(jugadorId)) {
    mostrarNotificacion("Un jugador expulsado no puede ser seleccionado.", "error");
    return;
  }

  if (!modoCambio) {
    abrirMenuSuplente(jugadorId);
    return;
  }

  // --- MODO CAMBIO ---
  if (jugadorEnCambiosPendientes(jugadorId)) {
    mostrarNotificacion("Este jugador ya está involucrado en un cambio pendiente.", "error");
    return;
  }

  if (seleccion && seleccion.origen === "banquillo" && seleccion.jugadorId === jugadorId) {
    seleccion = null;
    pintarTodo();
    return;
  }

  if (!seleccion) {
    seleccion = { origen: "banquillo", jugadorId };
    pintarTodo();
    return;
  }

  if (seleccion.origen === "banquillo") {
    seleccion = { origen: "banquillo", jugadorId };
    pintarTodo();
    return;
  }

  if (seleccion.origen === "campo") {
    if (estaExpulsado(seleccion.jugadorId)) {
      mostrarNotificacion("El jugador que sale está expulsado y no puede ser sustituido.", "error");
      return;
    }
    if (estaExpulsado(jugadorId)) {
      mostrarNotificacion("El jugador que entra está expulsado y no puede jugar.", "error");
      return;
    }
    if (jugadorEnCambiosPendientes(seleccion.jugadorId)) {
      mostrarNotificacion("El jugador que sale ya está involucrado en otro cambio.", "error");
      return;
    }
    if (jugadorEnCambiosPendientes(jugadorId)) {
      mostrarNotificacion("El jugador que entra ya está involucrado en otro cambio.", "error");
      return;
    }
    cambiosPendientes.push({ saleJugadorId: seleccion.jugadorId, saleSlotId: seleccion.slotId, entraJugadorId: jugadorId });
    seleccion = null;
    pintarTodo();
  }
}

// ---------- Menú de acciones flotante para jugadores en campo ----------

function abrirMenuAcciones(jugadorId, slotId) {
  if (estadoDirecto.estado === "no_iniciado") {
    mostrarNotificacion("No se pueden registrar eventos antes de empezar el partido.", "error");
    return;
  }

  if (estadoDirecto.estado === "finalizado") {
    mostrarNotificacion("El partido ya ha finalizado.", "error");
    return;
  }

  const j = jugadorPorId(jugadorId);
  if (!j) {
    mostrarNotificacion("Jugador no encontrado.", "error");
    return;
  }

  const enCampo = Object.values(estadoDirecto.huecos).includes(jugadorId);
  if (!enCampo) {
    mostrarNotificacion("Este jugador no está en el campo.", "error");
    return;
  }

  jugadorMenuActual = jugadorId;

  // Actualizar título con el nombre y dorsal del jugador
  const titulo = document.getElementById("menuAccionesTitulo");
  if (titulo) {
    titulo.textContent = `${j.dorsal} - ${j.nombre}`;
  }

  const menu = document.getElementById("menuAccionesJugador");
  
  // Posición: centro-derecha de la pantalla
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Posición X: 65% del ancho de la pantalla (más centrado)
  const x = windowWidth * 0.65;
  // Posición Y: centrado verticalmente
  const y = windowHeight / 2;
  
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.transform = 'translate(-21%, -50%)';

  // Ocultar/mostrar opciones según el estado del partido
  const enDescanso = estadoDirecto.estado === "descanso";
  const menuItems = menu.querySelectorAll('.btn-accion-flotante:not(.btn-cancelar)');
  
  menuItems.forEach(btn => {
    const accion = btn.dataset.accion;
    if (enDescanso) {
      if (accion === 'gol' || accion === 'asistencia' || accion === 'tiro_puerta' || 
          accion === 'tiro_fuera' || accion === 'falta_cometida' || accion === 'falta_recibida') {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'flex';
      }
    } else {
      btn.style.display = 'flex';
    }
  });

  menu.classList.remove("oculto");
  requestAnimationFrame(() => {
    menu.classList.add("visible");
  });

  menuAccionesAbierto = true;
}

function cerrarMenuAcciones() {
  const menu = document.getElementById("menuAccionesJugador");
  menu.classList.remove("visible");
  setTimeout(() => {
    menu.classList.add("oculto");
  }, 200);
  menuAccionesAbierto = false;
  jugadorMenuActual = null;
}

async function registrarEventoDesdeMenu(tipo) {
  if (!jugadorMenuActual) {
    notificarError("No hay jugador seleccionado.", "error");
    return;
  }

  const jugadorId = jugadorMenuActual;
  cerrarMenuAcciones();

  const j = jugadorPorId(jugadorId);
  if (!j) {
    notificarError("Jugador no encontrado.", "error");
    return;
  }

  if (estadoDirecto.estado === "no_iniciado" || estadoDirecto.estado === "finalizado") {
    notificarError("No se pueden registrar eventos en este estado.", "error");
    return;
  }

  let parteEvento = estadoDirecto.parte;
  if (estadoDirecto.estado === "descanso") {
    if (tipo === "gol" || tipo === "asistencia" || tipo === "tiro_puerta" || 
        tipo === "tiro_fuera" || tipo === "falta_cometida" || tipo === "falta_recibida") {
      notificarError("Durante el descanso solo se pueden registrar tarjetas.", "error");
      return;
    }
    parteEvento = 0;
  }

  // Verificar que el jugador está en el campo para acciones de juego
  const accionesCampo = ["gol", "asistencia", "tiro_puerta", "tiro_fuera", "falta_cometida", "falta_recibida"];
  if (accionesCampo.includes(tipo)) {
    const enCampo = Object.values(estadoDirecto.huecos).includes(jugadorId);
    if (!enCampo) {
      notificarError("Los jugadores en el banquillo no pueden registrar esta acción.", "error");
      return;
    }
  }

  // Manejo de tarjetas
  if (tipo === "amarilla") {
    const amarillasActuales = eventosPartido.filter(
      e => e.jugador_id === jugadorId && e.tipo === "amarilla"
    ).length;

    if (amarillasActuales >= 1) {
      await registrarExpulsionPorSegundaAmarilla(jugadorId, parteEvento);
      return;
    }
  }

  if (tipo === "roja") {
    const { error } = await supabaseClient.from("eventos_partido").insert({
      partido_id: partidoId, jugador_id: jugadorId, tipo, parte: parteEvento, momento: new Date().toISOString(),
    });
    if (error) {
      notificarError(error, "No se pudo registrar la tarjeta roja.");
      return;
    }
    consolidarJugador(jugadorId);
    estadoDirecto.expulsados = estadoDirecto.expulsados || [];
    if (!estadoDirecto.expulsados.includes(jugadorId)) estadoDirecto.expulsados.push(jugadorId);
    await persistirEstadoDirecto();
    await cargarEventos();
    pintarTodo();
    return;
  }

  // Mapear los tipos del menú a los tipos válidos en la base de datos
  const tipoBD = {
    'gol': 'gol',
    'asistencia': 'asistencia',
    'tiro_puerta': 'tiro_puerta_favor',
    'tiro_fuera': 'tiro_fuera_favor',
    'falta_cometida': 'falta_favor',
    'falta_recibida': 'falta_favor',
    'amarilla': 'amarilla',
    'roja': 'roja'
  }[tipo] || tipo;

  const { error } = await supabaseClient.from("eventos_partido").insert({
    partido_id: partidoId, jugador_id: jugadorId, tipo: tipoBD, parte: parteEvento, momento: new Date().toISOString(),
  });
  if (error) {
    console.error("Error al registrar evento:", error);
    notificarError(error, `No se pudo registrar ${tipo}.`);
    return;
  }

  if (tipo === "gol") {
    await persistirEstadoDirecto();
  }

  await cargarEventos();
  pintarTodo();
  
  const labels = {
    'gol': 'Gol',
    'asistencia': 'Asistencia',
    'tiro_puerta': 'Tiro a puerta',
    'tiro_fuera': 'Tiro fuera',
    'falta_cometida': 'Falta cometida',
    'falta_recibida': 'Falta recibida',
    'amarilla': 'Tarjeta amarilla',
    'roja': 'Tarjeta roja'
  };
  mostrarNotificacion(`${labels[tipo] || tipo} registrado para ${j.nombre} (dorsal ${j.dorsal}).`, "exito");
}

// ---------- Menú flotante para suplentes ----------

function abrirMenuSuplente(jugadorId) {
  if (estadoDirecto.estado === "no_iniciado") {
    mostrarNotificacion("No se pueden registrar eventos antes de empezar el partido.", "error");
    return;
  }

  if (estadoDirecto.estado === "finalizado") {
    mostrarNotificacion("El partido ya ha finalizado.", "error");
    return;
  }

  const j = jugadorPorId(jugadorId);
  if (!j) {
    mostrarNotificacion("Jugador no encontrado.", "error");
    return;
  }

  const enCampo = Object.values(estadoDirecto.huecos).includes(jugadorId);
  if (enCampo) {
    mostrarNotificacion("Este jugador está en el campo. Usa el menú del campo.", "error");
    return;
  }

  jugadorSuplenteActual = jugadorId;

  const banquillo = document.getElementById("banquillo");
  const fichas = banquillo.querySelectorAll('.ficha-jugador-banquillo');
  let rect = null;

  for (const ficha of fichas) {
    if (ficha.dataset.jugador === jugadorId) {
      rect = ficha.getBoundingClientRect();
      break;
    }
  }

  if (!rect) {
    mostrarNotificacion("No se pudo encontrar la posición del jugador.", "error");
    return;
  }

  const menu = document.getElementById("menuAccionesSuplente");
  const x = rect.left + rect.width / 2;
  const y = rect.top;

  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.add("posicion-arriba");

  menu.classList.remove("oculto");
  requestAnimationFrame(() => {
    menu.classList.add("visible");
  });

  menuSuplenteAbierto = true;
}

function cerrarMenuSuplente() {
  const menu = document.getElementById("menuAccionesSuplente");
  menu.classList.remove("visible");
  setTimeout(() => {
    menu.classList.add("oculto");
  }, 200);
  menuSuplenteAbierto = false;
  jugadorSuplenteActual = null;
}

async function registrarEventoSuplente(tipo) {
  if (!jugadorSuplenteActual) {
    notificarError("No hay jugador seleccionado.", "error");
    return;
  }

  const jugadorId = jugadorSuplenteActual;
  cerrarMenuSuplente();

  const j = jugadorPorId(jugadorId);
  if (!j) {
    notificarError("Jugador no encontrado.", "error");
    return;
  }

  if (estadoDirecto.estado === "no_iniciado" || estadoDirecto.estado === "finalizado") {
    notificarError("No se pueden registrar eventos en este estado.", "error");
    return;
  }

  if (tipo !== "amarilla" && tipo !== "roja") {
    notificarError("Los suplentes solo pueden recibir tarjetas.", "error");
    return;
  }

  let parteEvento = estadoDirecto.parte;
  if (estadoDirecto.estado === "descanso") {
    parteEvento = 0;
  }

  if (tipo === "amarilla") {
    const amarillasActuales = eventosPartido.filter(
      e => e.jugador_id === jugadorId && e.tipo === "amarilla"
    ).length;

    if (amarillasActuales >= 1) {
      await registrarExpulsionPorSegundaAmarilla(jugadorId, parteEvento);
      return;
    }
  }

  if (tipo === "roja") {
    const { error } = await supabaseClient.from("eventos_partido").insert({
      partido_id: partidoId, jugador_id: jugadorId, tipo, parte: parteEvento, momento: new Date().toISOString(),
    });
    if (error) {
      notificarError(error, "No se pudo registrar la tarjeta.");
      return;
    }
    estadoDirecto.expulsados = estadoDirecto.expulsados || [];
    if (!estadoDirecto.expulsados.includes(jugadorId)) estadoDirecto.expulsados.push(jugadorId);
    await persistirEstadoDirecto();
    await cargarEventos();
    pintarTodo();
    return;
  }

  const { error } = await supabaseClient.from("eventos_partido").insert({
    partido_id: partidoId, jugador_id: jugadorId, tipo, parte: parteEvento, momento: new Date().toISOString(),
  });
  if (error) {
    notificarError(error, "No se pudo registrar la tarjeta.");
    return;
  }

  await cargarEventos();
  pintarTodo();
  mostrarNotificacion(`Tarjeta ${tipo === 'amarilla' ? 'amarilla' : 'roja'} para ${j.nombre} (dorsal ${j.dorsal}) registrada.`, "exito");
}

// Cancelar un cambio individual de la lista de pendientes
function cancelarCambioPendiente(index) {
  cambiosPendientes.splice(index, 1);
  pintarTodo();
}

// Cancelar todos los cambios pendientes
function cancelarTodosLosCambios() {
  cambiosPendientes = [];
  seleccion = null;
  pintarTodo();
}

async function confirmarCambios() {
  if (cambiosPendientes.length === 0) {
    mostrarNotificacion("No hay cambios pendientes para confirmar.", "error");
    return;
  }

  for (const c of cambiosPendientes) {
    if (estaExpulsado(c.saleJugadorId)) {
      const sale = jugadorPorId(c.saleJugadorId);
      mostrarNotificacion(`El jugador que sale (${sale ? sale.dorsal + ' - ' + sale.nombre : '?'}) está expulsado.`, "error");
      return;
    }
    if (estaExpulsado(c.entraJugadorId)) {
      const entra = jugadorPorId(c.entraJugadorId);
      mostrarNotificacion(`El jugador que entra (${entra ? entra.dorsal + ' - ' + entra.nombre : '?'}) está expulsado.`, "error");
      return;
    }
  }

  const ahora = new Date().toISOString();
  const eventos = [];
  const sustitucionesNuevas = [];

  const bloqueId = generarUUID();
  const segundoActual = Math.floor(segundosMarcador());

  let parteCambio = estadoDirecto.parte;
  if (estadoDirecto.estado === "descanso") {
    parteCambio = 0;
  }

  // Todo esto es síncrono: paramos el reloj del que sale y arrancamos el del que entra,
  // en el mismo instante, antes de cualquier await.
  for (let i = 0; i < cambiosPendientes.length; i++) {
    const c = cambiosPendientes[i];

    consolidarJugador(c.saleJugadorId);
    estadoDirecto.huecos[c.saleSlotId] = c.entraJugadorId;
    arrancarJugador(c.entraJugadorId);

    eventos.push(
      {
        partido_id: partidoId,
        jugador_id: c.saleJugadorId,
        tipo: "sale",
        parte: parteCambio,
        momento: ahora
      },
      {
        partido_id: partidoId,
        jugador_id: c.entraJugadorId,
        tipo: "entra",
        parte: parteCambio,
        momento: ahora
      }
    );
    sustitucionesNuevas.push({
      partido_id: partidoId,
      bloque_id: bloqueId,
      bloque_orden: i + 1,
      parte: parteCambio,
      segundo: segundoActual,
      jugador_sale: c.saleJugadorId,
      jugador_entra: c.entraJugadorId
    });
  }

  const { error: errorEventos } = await supabaseClient
    .from("eventos_partido")
    .insert(eventos);
  if (errorEventos) {
    notificarError(errorEventos, "No se pudieron registrar los cambios.");
    await cargarPartido();
    pintarTodo();
    return;
  }

  const { error: errorSustituciones } = await supabaseClient
    .from("sustituciones")
    .insert(sustitucionesNuevas);
  if (errorSustituciones) {
    notificarError(errorSustituciones, "No se pudieron guardar las sustituciones.");
    await cargarPartido();
    pintarTodo();
    return;
  }

  cambiosPendientes = [];
  modoCambio = false;
  document.getElementById("botonModoCambio").classList.remove("primario");

  await persistirEstadoDirecto();
  await cargarEventos();
  pintarTodo();
}

function cancelarCambios() {
  cambiosPendientes = [];
  seleccion = null;
  pintarTodo();
}

// ---------- Rellenar un hueco vacío ----------

function abrirSelectorHuecoVacio(slotId) {
  slotHuecoActual = slotId;
  const idsEnCampo = new Set(Object.values(estadoDirecto.huecos).filter(Boolean));
  const convocados = partido.convocados || [];
  const setConvocados = new Set(convocados);

  const suplentes = jugadores.filter((j) => 
    jugadorActivo(j) && 
    !idsEnCampo.has(j.id) && 
    setConvocados.has(j.id) &&
    !estaExpulsado(j.id)
  );

  const cont = document.getElementById("listaHuecoVacio");
  cont.innerHTML = "";

  const slotInfo = FORMACIONES[partido.formacion].find(s => s.id === slotId);
  const puestoBuscado = slotInfo ? slotInfo.etiqueta : null;

  if (suplentes.length === 0) {
    cont.innerHTML = `<p class="mensaje-vacio">No hay jugadores convocados disponibles.</p>`;
  } else {
    const suplentesOrdenados = [...suplentes].sort((a, b) => {
      if (!puestoBuscado) return a.dorsal - b.dorsal;

      const posA = obtenerPosicionesJugador(a);
      const posB = obtenerPosicionesJugador(b);

      const esPrincipalA = posA.principal === puestoBuscado;
      const esPrincipalB = posB.principal === puestoBuscado;
      const esSecundariaA = posA.secundarias.includes(puestoBuscado);
      const esSecundariaB = posB.secundarias.includes(puestoBuscado);

      const prioridadA = esPrincipalA ? 0 : (esSecundariaA ? 1 : 2);
      const prioridadB = esPrincipalB ? 0 : (esSecundariaB ? 1 : 2);

      if (prioridadA !== prioridadB) return prioridadA - prioridadB;

      return a.dorsal - b.dorsal;
    });

    const principales = suplentesOrdenados.filter(j => {
      const pos = obtenerPosicionesJugador(j);
      return pos.principal === puestoBuscado;
    });
    const secundarios = suplentesOrdenados.filter(j => {
      const pos = obtenerPosicionesJugador(j);
      return pos.principal !== puestoBuscado && pos.secundarias.includes(puestoBuscado);
    });
    const otros = suplentesOrdenados.filter(j => {
      const pos = obtenerPosicionesJugador(j);
      return pos.principal !== puestoBuscado && !pos.secundarias.includes(puestoBuscado);
    });

    const titulo = document.createElement('div');
    titulo.className = 'titulo-hueco';
    titulo.innerHTML = `
      <span>Puesto: <strong>${puestoBuscado || 'Cualquier posición'}</strong></span>
      <span class="info">${principales.length} principal${principales.length !== 1 ? 'es' : ''} · ${secundarios.length} secundario${secundarios.length !== 1 ? 's' : ''} · ${suplentes.length} suplente${suplentes.length !== 1 ? 's' : ''}</span>
    `;
    cont.appendChild(titulo);

    if (principales.length > 0 && puestoBuscado) {
      const grupo = document.createElement('div');
      grupo.className = 'grupo-recomendados';

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = `🎯 ${puestoBuscado} (principal)`;
      grupo.appendChild(label);

      principales.forEach((j) => {
        const btn = document.createElement('button');
        btn.className = 'btn-jugador-hueco recomendado';
        const pos = obtenerPosicionesJugador(j);
        btn.innerHTML = `
          <span><span class="dorsal">${j.dorsal}</span> - <span class="nombre">${j.nombre}</span> <span style="color:var(--texto-secundario);font-size:0.7rem;">★</span></span>
          <span class="puesto-tag">${pos.principal || 'Sin principal'}</span>
        `;
        btn.addEventListener('click', () => asignarJugadorAHueco(j.id));
        grupo.appendChild(btn);
      });

      cont.appendChild(grupo);
    }

    if (secundarios.length > 0 && puestoBuscado) {
      const grupo = document.createElement('div');
      grupo.className = 'grupo-recomendados-secundarios';

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = `🔄 ${puestoBuscado} (secundario)`;
      grupo.appendChild(label);

      secundarios.forEach((j) => {
        const btn = document.createElement('button');
        btn.className = 'btn-jugador-hueco secundario';
        const pos = obtenerPosicionesJugador(j);
        btn.innerHTML = `
          <span><span class="dorsal">${j.dorsal}</span> - <span class="nombre">${j.nombre}</span> <span style="color:var(--texto-secundario);font-size:0.7rem;">⧫</span></span>
          <span class="puesto-tag">${pos.principal || 'Sin principal'} +${pos.secundarias.length}</span>
        `;
        btn.addEventListener('click', () => asignarJugadorAHueco(j.id));
        grupo.appendChild(btn);
      });

      cont.appendChild(grupo);
    }

    if (otros.length > 0) {
      const grupo = document.createElement('div');
      grupo.className = 'grupo-otros';

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = `📋 Otros jugadores (${otros.length})`;
      grupo.appendChild(label);

      otros.forEach((j) => {
        const btn = document.createElement('button');
        btn.className = 'btn-jugador-hueco otro';
        const pos = obtenerPosicionesJugador(j);
        btn.innerHTML = `
          <span><span class="dorsal">${j.dorsal}</span> - <span class="nombre">${j.nombre}</span></span>
          <span class="puesto-tag">${pos.principal || 'Sin principal'}${pos.secundarias.length > 0 ? ` +${pos.secundarias.length}` : ''}</span>
        `;
        btn.addEventListener('click', () => asignarJugadorAHueco(j.id));
        grupo.appendChild(btn);
      });

      cont.appendChild(grupo);
    }

    if (principales.length === 0 && secundarios.length === 0 && puestoBuscado) {
      const aviso = document.createElement('div');
      aviso.className = 'aviso-sin-recomendados';
      aviso.textContent = `⚠️ No hay jugadores con puesto ${puestoBuscado} (principal o secundario). Puedes seleccionar cualquier suplente.`;
      cont.appendChild(aviso);
    }
  }

  document.getElementById("modalHuecoVacio").classList.remove("oculto");
}

async function asignarJugadorAHueco(jugadorId) {
  document.getElementById("modalHuecoVacio").classList.add("oculto");

  if (estaExpulsado(jugadorId)) {
    mostrarNotificacion("No se puede asignar un jugador expulsado.", "error");
    return;
  }

  estadoDirecto.huecos[slotHuecoActual] = jugadorId;

  // Si el partido está en curso, el jugador que entra arranca su reloj ya mismo.
  if (estadoDirecto.estado === "en_curso") {
    arrancarJugador(jugadorId);
  } else if (estadoDirecto.minutos[jugadorId] === undefined) {
    estadoDirecto.minutos[jugadorId] = 0;
  }

  if (estadoDirecto.estado !== "no_iniciado") {
    const { error } = await supabaseClient.from("eventos_partido").insert({
      partido_id: partidoId, jugador_id: jugadorId, tipo: "entra", parte: estadoDirecto.parte, momento: new Date().toISOString(),
    });
    if (error) {
      notificarError(error, "No se pudo incorporar al jugador.");
      await cargarPartido();
      pintarTodo();
      return;
    }
    await cargarEventos();
  }
  await persistirEstadoDirecto();
  pintarTodo();
}

// ---------- Eliminar jugador del campo (antes de empezar) ----------
function eliminarJugadorDelCampo(jugadorId, slotId) {
  if (estadoDirecto.estado !== "no_iniciado") {
    mostrarNotificacion("Solo se pueden eliminar jugadores antes de empezar el partido.", "error");
    return;
  }

  const jugador = jugadorPorId(jugadorId);
  mostrarConfirmacion(
    `¿Eliminar a ${jugador ? jugador.nombre : 'jugador'} (dorsal ${jugador ? jugador.dorsal : '?'}) del campo?`,
    async () => {
      cerrarConfirmacion();
      estadoDirecto.huecos[slotId] = null;
      await persistirEstadoDirecto();
      pintarTodo();
    }
  );
}