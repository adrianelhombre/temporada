// ---------- Eventos: gol, asistencia, tarjetas ----------

let jugadorModalActual = null;

function abrirModalAccionJugador(jugadorId) {
  if (estadoDirecto.estado === "no_iniciado") {
    mostrarNotificacion("No se pueden registrar eventos antes de empezar el partido.", "error");
    return;
  }
  
  if (estadoDirecto.estado === "finalizado") {
    mostrarNotificacion("El partido ya ha finalizado.", "error");
    return;
  }
  
  if (estadoDirecto.estado === "descanso") {
    mostrarNotificacion("Durante el descanso solo se pueden registrar tarjetas.", "error");
    const btnGol = document.querySelector('#modalAccionJugador [data-accion="gol"]');
    const btnAsistencia = document.querySelector('#modalAccionJugador [data-accion="asistencia"]');
    const btnAmarilla = document.querySelector('#modalAccionJugador [data-accion="amarilla"]');
    const btnRoja = document.querySelector('#modalAccionJugador [data-accion="roja"]');
    
    btnGol.style.display = 'none';
    btnAsistencia.style.display = 'none';
    btnAmarilla.style.display = 'block';
    btnRoja.style.display = 'block';
    
    const j = jugadorPorId(jugadorId);
    if (!j) {
      mostrarNotificacion("Jugador no encontrado.", "error");
      return;
    }
    jugadorModalActual = jugadorId;
    document.getElementById("tituloModalJugador").textContent = `Dorsal ${j.dorsal} - ${j.nombre}`;
    document.getElementById("subtituloModalJugador").textContent = "Descanso - Solo tarjetas";
    document.getElementById("modalAccionJugador").classList.remove("oculto");
    return;
  }
  
  const j = jugadorPorId(jugadorId);
  if (!j) {
    mostrarNotificacion("Jugador no encontrado.", "error");
    return;
  }
  
  const enCampo = Object.values(estadoDirecto.huecos).includes(jugadorId);
  
  jugadorModalActual = jugadorId;
  document.getElementById("tituloModalJugador").textContent = `Dorsal ${j.dorsal} - ${j.nombre}`;
  
  const btnGol = document.querySelector('#modalAccionJugador [data-accion="gol"]');
  const btnAsistencia = document.querySelector('#modalAccionJugador [data-accion="asistencia"]');
  const btnAmarilla = document.querySelector('#modalAccionJugador [data-accion="amarilla"]');
  const btnRoja = document.querySelector('#modalAccionJugador [data-accion="roja"]');
  
  if (enCampo) {
    btnGol.style.display = 'block';
    btnAsistencia.style.display = 'block';
    btnAmarilla.style.display = 'block';
    btnRoja.style.display = 'block';
    document.getElementById("subtituloModalJugador").textContent = "Jugador en el campo";
  } else {
    btnGol.style.display = 'none';
    btnAsistencia.style.display = 'none';
    btnAmarilla.style.display = 'block';
    btnRoja.style.display = 'block';
    document.getElementById("subtituloModalJugador").textContent = "Jugador en el banquillo (solo tarjetas)";
  }
  
  document.getElementById("modalAccionJugador").classList.remove("oculto");
}

async function registrarEventoJugador(tipo) {
  const jugadorId = jugadorModalActual;
  document.getElementById("modalAccionJugador").classList.add("oculto");

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

// ---------- Eventos genéricos ----------

let eventoGenericoActual = null;
let equipoGenericoActual = null;

function abrirModalEventoGenerico(tipo, label) {
  if (estadoDirecto.estado === "no_iniciado") {
    mostrarNotificacion("No se pueden registrar eventos antes de empezar el partido.", "error");
    return;
  }
  
  if (estadoDirecto.estado === "finalizado") {
    mostrarNotificacion("El partido ya ha finalizado.", "error");
    return;
  }
  
  eventoGenericoActual = tipo;
  equipoGenericoActual = null;
  
  document.getElementById("tituloEventoGenerico").textContent = `¿${label}?`;
  actualizarCampoJugadorEventoGenerico(null);
  
  document.getElementById("modalEventoGenerico").classList.remove("oculto");
}

function actualizarCampoJugadorEventoGenerico(equipo) {
  const cont = document.getElementById("campoJugadorEventoGenerico");
  equipoGenericoActual = equipo;
  
  if (equipo === 'favor') {
    const idsEnCampo = new Set(Object.values(estadoDirecto.huecos).filter(Boolean));
    const jugadoresEnCampo = jugadores.filter(j => idsEnCampo.has(j.id) && jugadorActivo(j));
    
    if (jugadoresEnCampo.length === 0) {
      cont.innerHTML = `<p style="color: var(--texto-secundario); text-align: center; padding: 0.5rem 0;">No hay jugadores en el campo</p>`;
      document.getElementById("botonConfirmarEventoGenerico").style.opacity = '0.5';
      return;
    }
    
    cont.innerHTML = `
      <label for="selectJugadorEventoGenerico">Jugador de Balsas (en campo)</label>
      <select id="selectJugadorEventoGenerico">
        ${jugadoresEnCampo.map(j => `<option value="${j.id}">${j.dorsal} - ${j.nombre}</option>`).join('')}
      </select>
    `;
    document.getElementById("botonConfirmarEventoGenerico").style.opacity = '1';
    
  } else if (equipo === 'contra') {
    cont.innerHTML = `
      <label for="dorsalEventoGenerico">Dorsal del rival</label>
      <input type="number" inputmode="numeric" id="dorsalEventoGenerico" placeholder="Ej: 7" />
    `;
    document.getElementById("botonConfirmarEventoGenerico").style.opacity = '1';
    
  } else {
    cont.innerHTML = `<p style="color: var(--texto-secundario); text-align: center; padding: 0.5rem 0;">Selecciona un equipo primero</p>`;
    document.getElementById("botonConfirmarEventoGenerico").style.opacity = '0.5';
  }
}

async function confirmarEventoGenerico() {
  if (!eventoGenericoActual || !equipoGenericoActual) {
    mostrarNotificacion("Selecciona un evento y un equipo.", "error");
    return;
  }
  
  const tipo = eventoGenericoActual;
  const equipo = equipoGenericoActual;
  const tipoEvento = `${tipo}_${equipo}`;
  const ahora = new Date().toISOString();
  
  let parteEvento = estadoDirecto.parte;
  if (estadoDirecto.estado === "descanso") {
    parteEvento = 0;
  }
  
  let error;
  
  if (equipo === 'favor') {
    const jugadorId = document.getElementById("selectJugadorEventoGenerico").value;
    if (!jugadorId) {
      mostrarNotificacion("Selecciona un jugador.", "error");
      return;
    }
    
    const idsEnCampo = new Set(Object.values(estadoDirecto.huecos).filter(Boolean));
    if (!idsEnCampo.has(jugadorId)) {
      mostrarNotificacion("Este jugador ya no está en el campo.", "error");
      return;
    }
    
    ({ error } = await supabaseClient.from("eventos_partido").insert({
      partido_id: partidoId, jugador_id: jugadorId, tipo: tipoEvento, parte: parteEvento, momento: ahora,
    }));
  } else {
    const dorsal = document.getElementById("dorsalEventoGenerico").value.trim();
    if (!dorsal) {
      mostrarNotificacion("Introduce el dorsal del rival.", "error");
      return;
    }
    ({ error } = await supabaseClient.from("eventos_rival").insert({
      partido_id: partidoId, tipo: tipoEvento, dorsal: dorsal, parte: parteEvento, momento: ahora,
    }));
  }
  
  if (error) {
    notificarError(error, `No se pudo registrar el evento.`);
    return;
  }
  
  document.getElementById("modalEventoGenerico").classList.add("oculto");
  eventoGenericoActual = null;
  equipoGenericoActual = null;
  
  await persistirEstadoDirecto();
  await cargarEventos();
  pintarTodo();
  
  const labels = {
    'tiro_puerta': 'Tiro a puerta',
    'tiro_fuera': 'Tiro fuera',
    'corner': 'Córner',
    'falta': 'Falta',
    'fuera_juego': 'Fuera de juego'
  };
  mostrarNotificacion(`${labels[tipo]} ${equipo === 'favor' ? 'de Balsas' : 'del rival'} registrado.`, "exito");
}

// ---------- Rival ----------

async function golRival() {
  const dorsal = document.getElementById("dorsalGolRival").value.trim();
  document.getElementById("modalGolRival").classList.add("oculto");
  
  if (!dorsal) {
    mostrarNotificacion("Debes introducir un dorsal.", "error");
    return;
  }
  
  if (estadoDirecto.estado === "descanso") {
    mostrarNotificacion("No se pueden registrar goles durante el descanso.", "error");
    return;
  }
  
  const { error } = await supabaseClient.from("eventos_rival").insert({
    partido_id: partidoId, tipo: "gol", dorsal: dorsal, parte: estadoDirecto.parte, momento: new Date().toISOString(),
  });
  
  if (error) {
    notificarError(error, "No se pudo registrar el gol rival.");
    return;
  }
  
  document.getElementById("dorsalGolRival").value = "";
  await persistirEstadoDirecto();
  await cargarEventos();
  pintarTodo();
  mostrarNotificacion(`Gol del rival (dorsal ${dorsal}) registrado.`, "exito");
}

async function tarjetaRival(tipo) {
  const dorsal = document.getElementById("dorsalRival").value.trim();
  document.getElementById("modalTarjetaRival").classList.add("oculto");
  
  let parteEvento = estadoDirecto.parte;
  if (estadoDirecto.estado === "descanso") {
    parteEvento = 0;
  }
  
  const { error } = await supabaseClient.from("eventos_rival").insert({
    partido_id: partidoId, tipo, dorsal: dorsal || null, parte: parteEvento, momento: new Date().toISOString(),
  });
  if (error) {
    notificarError(error, "No se pudo registrar la tarjeta rival.");
    return;
  }
  document.getElementById("dorsalRival").value = "";
  await cargarEventos();
  pintarTodo();
}

// ---------- Control de partes ----------

function cerrarTramoActual(completarParte = false) {
  const tiempoObjetivo = partido.duracion_parte_minutos * 60;
  let tiempoJugado = estadoDirecto.segundosAcumulados || 0;

  if (!completarParte) {
    estadoDirecto.segundosAcumulados = tiempoJugado;
    return;
  }

  if (tiempoJugado < tiempoObjetivo) {
    const faltante = tiempoObjetivo - tiempoJugado;
    const esParte1 = estadoDirecto.parte === 1;
    
    Object.values(estadoDirecto.huecos).filter(Boolean).forEach((jugadorId) => {
      if (estaExpulsado(jugadorId)) return;
      const antes = estadoDirecto.minutos[jugadorId] || 0;
      if (esParte1 && antes >= tiempoObjetivo) return;
      let mins = antes + faltante;
      if (esParte1) {
        mins = Math.min(mins, tiempoObjetivo);
      }
      estadoDirecto.minutos[jugadorId] = mins;
    });
    estadoDirecto.segundosAcumulados = tiempoObjetivo;
  } else {
    estadoDirecto.segundosAcumulados = tiempoJugado;
  }
}

async function empezar1aParte() {
  if (estadoDirecto.estado !== "no_iniciado" || partido.estado === "finalizado") return;

  const slots = Object.values(estadoDirecto.huecos);
  const huecosVacios = slots.filter(id => id === null || id === undefined).length;
  if (huecosVacios > 0) {
    mostrarNotificacion(`No se puede empezar el partido. Quedan ${huecosVacios} huecos vacíos.`, "error");
    return;
  }

  // --- NUEVO: Guardar timestamp de inicio ---
  inicioPartidoTimestamp = new Date().toISOString();
  
  estadoDirecto.estado = "en_curso";
  estadoDirecto.parte = 1;
  estadoDirecto.segundosAcumulados = 0;
  estadoDirecto.tramos = [];

  const titulares = Object.values(estadoDirecto.huecos).filter(Boolean);
  estadoDirecto.titulares = titulares;
  titulares.forEach((jugadorId) => {
    if (estadoDirecto.minutos[jugadorId] === undefined) estadoDirecto.minutos[jugadorId] = 0;
  });

  // Guardar timestamp de inicio en el partido
  if (!await persistirPartido({ estado: "en_juego", inicio_timestamp: inicioPartidoTimestamp })) return;
  if (!await persistirEstadoDirecto()) return;
  
  if (typeof sincronizarTick === 'function') {
    sincronizarTick();
  }
  
  pintarTodo();
}

async function pausar() {
  if (estadoDirecto.estado !== "en_curso") return;
  cerrarTramoActual();
  estadoDirecto.estado = "pausado";
  await persistirEstadoDirecto();
  pintarTodo();
}

async function reanudar() {
  if (estadoDirecto.estado !== "pausado") {
    mostrarNotificacion("El partido no está pausado.", "error");
    return;
  }
  
  estadoDirecto.estado = "en_curso";
  await persistirEstadoDirecto();
  
  if (typeof sincronizarTick === 'function') {
    sincronizarTick();
  }
  
  pintarTodo();
  mostrarNotificacion("Partido reanudado.", "exito");
}

async function irADescanso() {
  if (estadoDirecto.estado !== "en_curso" || estadoDirecto.parte !== 1) {
    mostrarNotificacion("Solo se puede ir a descanso durante la 1ª parte.", "error");
    return;
  }
  
  const ahora = new Date();
  let tiempoJugado = estadoDirecto.segundosAcumulados || 0;
  
  // Cerrar tramo actual
  if (estadoDirecto.inicioParteTimestamp) {
    const inicio = new Date(estadoDirecto.inicioParteTimestamp);
    const duracionTramo = (ahora.getTime() - inicio.getTime()) / 1000;
    tiempoJugado += duracionTramo;
    
    estadoDirecto.tramos = estadoDirecto.tramos || [];
    estadoDirecto.tramos.push({
      parte: 1,
      inicio: estadoDirecto.inicioParteTimestamp,
      fin: ahora.toISOString(),
    });
    estadoDirecto.inicioParteTimestamp = null;
  }
  
  // Completar a 35' (si es menor)
  const tiempoObjetivo = partido.duracion_parte_minutos * 60;
  if (tiempoJugado < tiempoObjetivo) {
    const faltante = tiempoObjetivo - tiempoJugado;
    Object.values(estadoDirecto.huecos).filter(Boolean).forEach((jugadorId) => {
      if (estaExpulsado(jugadorId)) return;
      estadoDirecto.minutos[jugadorId] = (estadoDirecto.minutos[jugadorId] || 0) + faltante;
    });
    tiempoJugado = tiempoObjetivo;
  }
  
  estadoDirecto.segundosAcumulados = tiempoJugado;
  estadoDirecto.estado = "descanso";
  
  await persistirEstadoDirecto();
  await cargarEventos();
  pintarTodo();
  mostrarNotificacion("Descanso. Prepara la 2ª parte.", "exito");
}

async function empezar2aParte() {
  if (estadoDirecto.estado !== "descanso") {
    mostrarNotificacion("El partido no está en descanso.", "error");
    return;
  }
  
  estadoDirecto.estado = "en_curso";
  estadoDirecto.parte = 2;
  estadoDirecto.segundosAcumulados = 0;
  estadoDirecto.inicioParteTimestamp = new Date().toISOString();
  
  await persistirEstadoDirecto();
  
  if (typeof sincronizarTick === 'function') {
    sincronizarTick();
  }
  
  pintarTodo();
  mostrarNotificacion("Comienza la 2ª parte.", "exito");
}

function finalizarPartido() {
  if (partido.estado === "finalizado" || estadoDirecto.estado === "no_iniciado") return;
  
  if (estadoDirecto.estado === "descanso") {
    mostrarNotificacion("La 1ª parte ya ha terminado. Empieza y termina la 2ª parte antes de finalizar el partido.", "error");
    return;
  }
  
  if (estadoDirecto.parte === 1) {
    mostrarNotificacion("No puedes finalizar el partido hasta terminar la 1ª parte (ir a descanso).", "error");
    return;
  }
  
  mostrarConfirmacion("¿Finalizar el partido?", async () => {
    cerrarConfirmacion();
    cerrarTramoActual(true);
    estadoDirecto.segundosAcumulados = Math.floor(estadoDirecto.segundosAcumulados || 0);
    estadoDirecto.estado = "finalizado";
    
    const ok = await guardarPartidoSeguro({
      estado: "finalizado",
      estado_directo: estadoDirecto,
    });
    
    if (!ok) return;
    
    await cargarPartido();
    await cargarEventos();
    pintarTodo();
    
    mostrarNotificacion("Partido finalizado correctamente.", "exito");
  });
}

// ---------- Formación ----------

async function cambiarFormacion(nuevaFormacion) {
  if (!FORMACIONES[nuevaFormacion]) return;

  const viejosHuecos = { ...estadoDirecto.huecos };
  const nuevosHuecos = {};

  FORMACIONES[nuevaFormacion].forEach((slot) => {
    nuevosHuecos[slot.id] = null;
  });

  const jugadoresPorReasignar = [];
  for (const [slotId, jugadorId] of Object.entries(viejosHuecos)) {
    if (jugadorId) {
      if (slotId in nuevosHuecos) {
        nuevosHuecos[slotId] = jugadorId;
      } else {
        jugadoresPorReasignar.push(jugadorId);
      }
    }
  }

  for (const slotId of Object.keys(nuevosHuecos)) {
    if (nuevosHuecos[slotId] === null && jugadoresPorReasignar.length > 0) {
      nuevosHuecos[slotId] = jugadoresPorReasignar.shift();
    }
  }

  estadoDirecto.huecos = nuevosHuecos;
  partido.formacion = nuevaFormacion;

  const okPartido = await persistirPartido({ formacion: nuevaFormacion });
  const okEstado = await persistirEstadoDirecto();

  if (okPartido && okEstado) {
    mostrarNotificacion("Formación cambiada correctamente.", "exito");
  }

  pintarTodo();
}