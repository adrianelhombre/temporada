// ---------- Interacción: selección de jugadores ----------

// Variables para menús flotantes
let menuAccionesAbierto = false;
let jugadorMenuActual = null;
let menuSuplenteAbierto = false;
let jugadorSuplenteActual = null;

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

  // Antes de empezar, solo permitir seleccionar huecos vacíos
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

  // Si el menú de acciones está abierto y es el mismo jugador, cerrarlo
  if (menuAccionesAbierto && jugadorMenuActual === jugadorId) {
    cerrarMenuAcciones();
    return;
  }
  
  // Si el menú está abierto para otro jugador, cerrarlo
  if (menuAccionesAbierto) {
    cerrarMenuAcciones();
  }

  if (!modoCambio) {
    abrirMenuAcciones(jugadorId, slotId);
    return;
  }

  // --- MODO CAMBIO ---
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
    if (jugadorEnCambiosPendientes(jugadorId)) {
      mostrarNotificacion("El jugador que sale ya está involucrado en otro cambio.", "error");
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

  // Antes de empezar, no hacer nada
  if (estadoDirecto.estado === "no_iniciado") {
    mostrarNotificacion("No se pueden registrar eventos antes de empezar.", "error");
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
  
  const slotInfo = FORMACIONES[partido.formacion].find(s => s.id === slotId);
  if (!slotInfo) return;
  
  const campo = document.getElementById("campo");
  const rect = campo.getBoundingClientRect();
  const x = rect.left + (slotInfo.x / 100) * rect.width;
  const y = rect.top + (slotInfo.y / 100) * rect.height;
  
  const menu = document.getElementById("menuAccionesJugador");
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.add("posicion-arriba");
  
  const enDescanso = estadoDirecto.estado === "descanso";
  const btnGol = menu.querySelector('[data-accion="gol"]');
  const btnAsistencia = menu.querySelector('[data-accion="asistencia"]');
  
  if (enDescanso) {
    btnGol.style.display = 'none';
    btnAsistencia.style.display = 'none';
  } else {
    btnGol.style.display = 'flex';
    btnAsistencia.style.display = 'flex';
  }
  
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

  // --- CORRECCIÓN: Determinar la parte del evento ---
  let parteEvento = estadoDirecto.parte;
  if (estadoDirecto.estado === "descanso") {
    if (tipo === "gol" || tipo === "asistencia") {
      notificarError("Durante el descanso solo se pueden registrar tarjetas.", "error");
      return;
    }
    parteEvento = 0;
  }

  if (tipo === "gol" || tipo === "asistencia") {
    const enCampo = Object.values(estadoDirecto.huecos).includes(jugadorId);
    if (!enCampo) {
      notificarError("Los jugadores en el banquillo no pueden registrar goles o asistencias.", "error");
      return;
    }
  }

  const { error } = await supabaseClient.from("eventos_partido").insert({
    partido_id: partidoId, jugador_id: jugadorId, tipo, parte: parteEvento, momento: new Date().toISOString(),
  });
  if (error) {
    notificarError(error, "No se pudo registrar el evento.");
    return;
  }

  if (tipo === "roja") {
    estadoDirecto.expulsados = estadoDirecto.expulsados || [];
    if (!estadoDirecto.expulsados.includes(jugadorId)) estadoDirecto.expulsados.push(jugadorId);
    await persistirEstadoDirecto();
  }

  await cargarEventos();
  pintarTodo();
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

  // Solo permitir tarjetas para suplentes
  if (tipo !== "amarilla" && tipo !== "roja") {
    notificarError("Los suplentes solo pueden recibir tarjetas.", "error");
    return;
  }

  // --- CORRECCIÓN: Determinar la parte del evento ---
  let parteEvento = estadoDirecto.parte;
  if (estadoDirecto.estado === "descanso") {
    parteEvento = 0;
  }

  const { error } = await supabaseClient.from("eventos_partido").insert({
    partido_id: partidoId, jugador_id: jugadorId, tipo, parte: parteEvento, momento: new Date().toISOString(),
  });
  if (error) {
    notificarError(error, "No se pudo registrar la tarjeta.");
    return;
  }

  if (tipo === "roja") {
    estadoDirecto.expulsados = estadoDirecto.expulsados || [];
    if (!estadoDirecto.expulsados.includes(jugadorId)) estadoDirecto.expulsados.push(jugadorId);
    await persistirEstadoDirecto();
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

  const ahora = new Date().toISOString();
  const eventos = [];
  const sustituciones = [];
  
  const bloqueId = generarUUID();
  const segundoActual = Math.floor(segundosMarcador());
  
  // --- CORRECCIÓN: Detectar si estamos en descanso ---
  // Si el estado es descanso, la parte para el cambio debe ser 0
  let parteCambio = estadoDirecto.parte;
  if (estadoDirecto.estado === "descanso") {
    parteCambio = 0;
  }

  for (let i = 0; i < cambiosPendientes.length; i++) {
    const c = cambiosPendientes[i];
    estadoDirecto.huecos[c.saleSlotId] = c.entraJugadorId;
    if (estadoDirecto.minutos[c.entraJugadorId] === undefined) {
      estadoDirecto.minutos[c.entraJugadorId] = 0;
    }
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
    sustituciones.push({
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
    .insert(sustituciones);
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
  
  // Solo mostrar jugadores CONVOCADOS que no están en el campo
  const suplentes = jugadores.filter((j) => 
    jugadorActivo(j) && 
    !idsEnCampo.has(j.id) && 
    setConvocados.has(j.id)
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
      
      const puestoA = a.posicion || a.puesto || '';
      const puestoB = b.posicion || b.puesto || '';
      
      const coincideA = puestoA === puestoBuscado;
      const coincideB = puestoB === puestoBuscado;
      
      if (coincideA && !coincideB) return -1;
      if (!coincideA && coincideB) return 1;
      
      return a.dorsal - b.dorsal;
    });
    
    const recomendados = suplentesOrdenados.filter(j => (j.posicion || j.puesto || '') === puestoBuscado);
    const otros = suplentesOrdenados.filter(j => (j.posicion || j.puesto || '') !== puestoBuscado);
    
    const titulo = document.createElement('div');
    titulo.className = 'titulo-hueco';
    titulo.innerHTML = `
      <span>Puesto: <strong>${puestoBuscado || 'Cualquier posición'}</strong></span>
      <span class="info">${recomendados.length} recomendado${recomendados.length !== 1 ? 's' : ''} · ${suplentes.length} suplente${suplentes.length !== 1 ? 's' : ''}</span>
    `;
    cont.appendChild(titulo);
    
    if (recomendados.length > 0 && puestoBuscado) {
      const grupo = document.createElement('div');
      grupo.className = 'grupo-recomendados';
      
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = `🎯 Recomendados para ${puestoBuscado}`;
      grupo.appendChild(label);
      
      recomendados.forEach((j) => {
        const btn = document.createElement('button');
        btn.className = 'btn-jugador-hueco recomendado';
        btn.innerHTML = `
          <span><span class="dorsal">${j.dorsal}</span> - <span class="nombre">${j.nombre}</span></span>
          <span class="puesto-tag">${j.posicion || j.puesto || 'Sin puesto'}</span>
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
        btn.innerHTML = `
          <span><span class="dorsal">${j.dorsal}</span> - <span class="nombre">${j.nombre}</span></span>
          <span class="puesto-tag">${j.posicion || j.puesto || 'Sin puesto'}</span>
        `;
        btn.addEventListener('click', () => asignarJugadorAHueco(j.id));
        grupo.appendChild(btn);
      });
      
      cont.appendChild(grupo);
    }
    
    if (recomendados.length === 0 && puestoBuscado) {
      const aviso = document.createElement('div');
      aviso.className = 'aviso-sin-recomendados';
      aviso.textContent = `⚠️ No hay jugadores con puesto ${puestoBuscado}. Puedes seleccionar cualquier suplente.`;
      cont.appendChild(aviso);
    }
  }
  
  document.getElementById("modalHuecoVacio").classList.remove("oculto");
}

async function asignarJugadorAHueco(jugadorId) {
  document.getElementById("modalHuecoVacio").classList.add("oculto");
  estadoDirecto.huecos[slotHuecoActual] = jugadorId;
  if (estadoDirecto.minutos[jugadorId] === undefined) estadoDirecto.minutos[jugadorId] = 0;

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