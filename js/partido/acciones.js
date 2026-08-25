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

// --- Registrar expulsión por segunda amarilla (sin confirmación) ---
async function registrarExpulsionPorSegundaAmarilla(jugadorId, parteEvento) {
  const ahora = new Date().toISOString();

  const { error: errorAmarilla } = await supabaseClient.from("eventos_partido").insert({
    partido_id: partidoId, jugador_id: jugadorId, tipo: "amarilla", parte: parteEvento, momento: ahora,
  });
  if (errorAmarilla) {
    notificarError(errorAmarilla, "No se pudo registrar la segunda amarilla.");
    return;
  }

  const { error: errorRoja } = await supabaseClient.from("eventos_partido").insert({
    partido_id: partidoId, jugador_id: jugadorId, tipo: "roja", parte: parteEvento, momento: ahora,
  });
  if (errorRoja) {
    notificarError(errorRoja, "No se pudo registrar la expulsión.");
    return;
  }

  // El jugador expulsado deja de correr su reloj de minutos AHORA MISMO.
  consolidarJugador(jugadorId);

  estadoDirecto.expulsados = estadoDirecto.expulsados || [];
  if (!estadoDirecto.expulsados.includes(jugadorId)) estadoDirecto.expulsados.push(jugadorId);

  await persistirEstadoDirecto();
  await cargarEventos();
  pintarTodo();

  const j = jugadorPorId(jugadorId);
  mostrarNotificacion(`🔴 ${j ? j.nombre : 'Jugador'} (dorsal ${j ? j.dorsal : '?'}) expulsado por segunda amarilla.`, "exito");
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
      notificarError(error, "No se pudo registrar el evento.");
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

  const { error } = await supabaseClient.from("eventos_partido").insert({
    partido_id: partidoId, jugador_id: jugadorId, tipo, parte: parteEvento, momento: new Date().toISOString(),
  });
  if (error) {
    notificarError(error, "No se pudo registrar el evento.");
    return;
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
  equipoGenericoActual = 'favor';

  document.getElementById("tituloEventoGenerico").textContent = `¿${label}?`;

  document.getElementById("botonEventoFavor").classList.add("activo");
  document.getElementById("botonEventoContra").classList.remove("activo");

  actualizarCampoJugadorEventoGenerico('favor');

  document.getElementById("modalEventoGenerico").classList.remove("oculto");
}

function actualizarCampoJugadorEventoGenerico(equipo) {
  const cont = document.getElementById("campoJugadorEventoGenerico");
  equipoGenericoActual = equipo;

  if (equipo === 'favor') {
    const idsEnCampo = new Set(Object.values(estadoDirecto.huecos).filter(Boolean));
    const jugadoresEnCampo = jugadores.filter(j => idsEnCampo.has(j.id) && jugadorActivo(j) && !estaExpulsado(j.id));

    if (jugadoresEnCampo.length === 0) {
      cont.innerHTML = `<p style="color: var(--texto-secundario); text-align: center; padding: 0.5rem 0;">No hay jugadores en el campo</p>`;
      document.getElementById("botonConfirmarEventoGenerico").style.opacity = '0.5';
      return;
    }

    let html = `<div class="lista-jugadores-evento">`;

    jugadoresEnCampo.forEach(j => {
      const amarillas = eventosPartido.filter(e => e.jugador_id === j.id && e.tipo === "amarilla").length;
      const expulsado = estaExpulsado(j.id);

      let badge = '';
      if (expulsado) {
        badge = `<span class="badge-jugador-evento badge-roja">🔴</span>`;
      } else if (amarillas === 1) {
        badge = `<span class="badge-jugador-evento badge-amarilla">🟨</span>`;
      }

      html += `
        <button class="btn-jugador-evento" data-jugador="${j.id}" ${expulsado ? 'disabled' : ''}>
          <span class="btn-jugador-evento-dorsal">${j.dorsal}</span>
          <span class="btn-jugador-evento-nombre">${j.nombre}</span>
          ${badge}
        </button>
      `;
    });

    html += `</div>`;
    cont.innerHTML = html;

    cont.querySelectorAll('.btn-jugador-evento:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        cont.querySelectorAll('.btn-jugador-evento').forEach(b => b.classList.remove('seleccionado'));
        btn.classList.add('seleccionado');
        btn.dataset.seleccionado = 'true';
      });
    });

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
    const btnSeleccionado = document.querySelector('#campoJugadorEventoGenerico .btn-jugador-evento.seleccionado');
    if (!btnSeleccionado) {
      mostrarNotificacion("Selecciona un jugador.", "error");
      return;
    }

    const jugadorId = btnSeleccionado.dataset.jugador;
    if (!jugadorId) {
      mostrarNotificacion("Selecciona un jugador.", "error");
      return;
    }

    const idsEnCampo = new Set(Object.values(estadoDirecto.huecos).filter(Boolean));
    if (!idsEnCampo.has(jugadorId)) {
      mostrarNotificacion("Este jugador ya no está en el campo.", "error");
      return;
    }

    if (estaExpulsado(jugadorId)) {
      mostrarNotificacion("Este jugador está expulsado.", "error");
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

// ---------- Tiro rival ----------
function abrirModalTiroRival() {
  if (estadoDirecto.estado === "no_iniciado") {
    mostrarNotificacion("No se pueden registrar eventos antes de empezar el partido.", "error");
    return;
  }
  if (estadoDirecto.estado === "finalizado") {
    mostrarNotificacion("El partido ya ha finalizado.", "error");
    return;
  }
  if (estadoDirecto.estado === "descanso") {
    mostrarNotificacion("No se pueden registrar eventos durante el descanso.", "error");
    return;
  }
  document.getElementById("modalTiroRival").classList.remove("oculto");
}

async function registrarTiroRival(tipo) {
  document.getElementById("modalTiroRival").classList.add("oculto");
  
  if (estadoDirecto.estado === "no_iniciado" || estadoDirecto.estado === "finalizado") {
    mostrarNotificacion("No se pueden registrar eventos en este estado.", "error");
    return;
  }
  
  if (estadoDirecto.estado === "descanso") {
    mostrarNotificacion("No se pueden registrar eventos durante el descanso.", "error");
    return;
  }
  
  const tipoEvento = tipo === 'puerta' ? 'tiro_puerta_contra' : 'tiro_fuera_contra';
  const parteEvento = estadoDirecto.parte;
  const ahora = new Date().toISOString();
  
  const { error } = await supabaseClient.from("eventos_rival").insert({
    partido_id: partidoId,
    tipo: tipoEvento,
    dorsal: null,
    parte: parteEvento,
    momento: ahora,
  });
  
  if (error) {
    notificarError(error, "No se pudo registrar el tiro.");
    return;
  }
  
  await cargarEventos();
  pintarTodo();
  const label = tipo === 'puerta' ? 'a puerta' : 'fuera';
  mostrarNotificacion(`Tiro ${label} del rival registrado.`, "exito");
}

// ---------- Corner ----------
async function registrarCorner(equipo) {
  document.getElementById("modalCorner").classList.add("oculto");
  
  if (estadoDirecto.estado === "no_iniciado" || estadoDirecto.estado === "finalizado") {
    mostrarNotificacion("No se pueden registrar eventos en este estado.", "error");
    return;
  }
  
  if (estadoDirecto.estado === "descanso") {
    mostrarNotificacion("No se pueden registrar eventos durante el descanso.", "error");
    return;
  }
  
  const tipoEvento = `corner_${equipo}`;
  const parteEvento = estadoDirecto.parte;
  const ahora = new Date().toISOString();
  
  let error;
  
  if (equipo === 'favor') {
    ({ error } = await supabaseClient.from("eventos_partido").insert({
      partido_id: partidoId,
      jugador_id: null,
      tipo: tipoEvento,
      parte: parteEvento,
      momento: ahora,
    }));
  } else {
    ({ error } = await supabaseClient.from("eventos_rival").insert({
      partido_id: partidoId,
      tipo: tipoEvento,
      dorsal: null,
      parte: parteEvento,
      momento: ahora,
    }));
  }
  
  if (error) {
    notificarError(error, "No se pudo registrar el córner.");
    return;
  }
  
  await cargarEventos();
  pintarTodo();
  mostrarNotificacion(`Córner registrado (${equipo === 'favor' ? 'Balsas' : partido.rival || 'Rival'}).`, "exito");
}

// ---------- Fuera de juego ----------
async function registrarFueraJuego(equipo) {
  document.getElementById("modalFueraJuego").classList.add("oculto");
  
  if (estadoDirecto.estado === "no_iniciado" || estadoDirecto.estado === "finalizado") {
    mostrarNotificacion("No se pueden registrar eventos en este estado.", "error");
    return;
  }
  
  if (estadoDirecto.estado === "descanso") {
    mostrarNotificacion("No se pueden registrar eventos durante el descanso.", "error");
    return;
  }
  
  const tipoEvento = `fuera_juego_${equipo}`;
  const parteEvento = estadoDirecto.parte;
  const ahora = new Date().toISOString();
  
  let error;
  
  if (equipo === 'favor') {
    ({ error } = await supabaseClient.from("eventos_partido").insert({
      partido_id: partidoId,
      jugador_id: null,
      tipo: tipoEvento,
      parte: parteEvento,
      momento: ahora,
    }));
  } else {
    ({ error } = await supabaseClient.from("eventos_rival").insert({
      partido_id: partidoId,
      tipo: tipoEvento,
      dorsal: null,
      parte: parteEvento,
      momento: ahora,
    }));
  }
  
  if (error) {
    notificarError(error, "No se pudo registrar el fuera de juego.");
    return;
  }
  
  await cargarEventos();
  pintarTodo();
  mostrarNotificacion(`Fuera de juego registrado (${equipo === 'favor' ? 'Balsas' : partido.rival || 'Rival'}).`, "exito");
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
//
// Principio de esta sección: TODA mutación síncrona de estadoDirecto (estado, parte,
// segundosAcumulados, inicioTramoTimestamp, minutos, inicioJugador) se hace ANTES de
// cualquier `await`. Así, si el intervalo de tick.js se dispara mientras esperamos a
// Supabase, ya encuentra el estado consistente y no hay carrera posible.

async function empezar1aParte() {
  if (estadoDirecto.estado !== "no_iniciado" || partido.estado === "finalizado") return;

  const slots = Object.values(estadoDirecto.huecos);
  const huecosVacios = slots.filter(id => id === null || id === undefined).length;
  if (huecosVacios > 0) {
    mostrarNotificacion(`No se puede empezar el partido. Quedan ${huecosVacios} huecos vacíos.`, "error");
    return;
  }

  inicioPartidoTimestamp = new Date().toISOString();

  estadoDirecto.estado = "en_curso";
  estadoDirecto.parte = 1;
  estadoDirecto.segundosAcumulados = 0;

  const titulares = Object.values(estadoDirecto.huecos).filter(Boolean);
  estadoDirecto.titulares = titulares;

  // Arrancamos el reloj del tramo y el de cada titular, todo síncrono.
  arrancarTramo();
  titulares.forEach((jugadorId) => arrancarJugador(jugadorId));

  if (!await persistirPartido({ estado: "en_juego", inicio_timestamp: inicioPartidoTimestamp })) return;
  if (!await persistirEstadoDirecto()) return;

  pintarTodo();
}

async function pausar() {
  if (estadoDirecto.estado !== "en_curso") return;

  // Consolidar (parar) el reloj del tramo y el de todos los jugadores en campo, síncrono.
  consolidarTramo();
  consolidarTodosLosJugadoresEnCampo();
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

  // Arrancar de nuevo el tramo y los jugadores en campo desde el acumulado consolidado.
  arrancarTramo();
  arrancarTodosLosJugadoresEnCampo();

  await persistirEstadoDirecto();

  pintarTodo();
  mostrarNotificacion("Partido reanudado.", "exito");
}

async function irADescanso() {
  if (estadoDirecto.estado !== "en_curso" || estadoDirecto.parte !== 1) {
    mostrarNotificacion("Solo se puede ir a descanso durante la 1ª parte.", "error");
    return;
  }

  const objetivo = partido.duracion_parte_minutos * 60;

  // Consolidamos el tramo con su valor REAL en este instante (puede incluir descuento).
  consolidarTramo();
  const jugado = estadoDirecto.segundosAcumulados || 0;

  // Si acaba antes de tiempo, completar únicamente a los jugadores que están en el campo.
  // Si hay descuento (jugado > objetivo), NO se recorta: se conserva tal cual.
  if (jugado < objetivo) {
    const faltante = objetivo - jugado;

    Object.values(estadoDirecto.huecos)
      .filter(Boolean)
      .forEach((jugadorId) => {
        if (estaExpulsado(jugadorId)) return;
        consolidarJugador(jugadorId); // fija el tiempo real corrido hasta ahora
        estadoDirecto.minutos[jugadorId] = (estadoDirecto.minutos[jugadorId] || 0) + faltante;
      });

    estadoDirecto.segundosAcumulados = objetivo;
  } else {
    // Con descuento: consolidamos a los jugadores en campo con su tiempo real (ya incluye el descuento).
    consolidarTodosLosJugadoresEnCampo();
  }

  estadoDirecto.estado = "descanso";

  await persistirEstadoDirecto();
  pintarTodo();
  mostrarNotificacion("Descanso. Prepara la 2ª parte.", "exito");
}

async function empezar2aParte() {
  if (estadoDirecto.estado !== "descanso") {
    mostrarNotificacion("El partido no está en descanso.", "error");
    return;
  }

  // La segunda parte siempre empieza desde 0 segundos internos del tramo.
  // El marcador mostrará 35:00 gracias a segundosMarcador().
  estadoDirecto.estado = "en_curso";
  estadoDirecto.parte = 2;
  estadoDirecto.segundosAcumulados = 0;
  estadoDirecto.inicioSegundaParteTimestamp = new Date().toISOString();

  // Arrancamos el tramo y a todos los jugadores que están en el campo ahora mismo.
  arrancarTramo();
  arrancarTodosLosJugadoresEnCampo();

  await persistirEstadoDirecto();

  pintarTodo();
  mostrarNotificacion("Comienza la 2ª parte.", "exito");
}

function finalizarPartido() {
  if (partido.estado === "finalizado" || estadoDirecto.estado === "no_iniciado") return;

  if (estadoDirecto.estado === "descanso") {
    mostrarNotificacion(
      "La 1ª parte ya ha terminado. Empieza y termina la 2ª parte antes de finalizar el partido.",
      "error"
    );
    return;
  }

  if (estadoDirecto.parte === 1) {
    mostrarNotificacion(
      "No puedes finalizar el partido hasta terminar la 1ª parte (ir a descanso).",
      "error"
    );
    return;
  }

  mostrarConfirmacion("¿Finalizar el partido?", async () => {
    cerrarConfirmacion();

    const objetivo = partido.duracion_parte_minutos * 60;

    // Consolidamos el tramo con su valor real (puede incluir descuento) ANTES de decidir nada.
    consolidarTramo();
    const jugado = estadoDirecto.segundosAcumulados || 0;

    if (jugado < objetivo) {
      const faltante = objetivo - jugado;

      Object.values(estadoDirecto.huecos)
        .filter(Boolean)
        .forEach((jugadorId) => {
          if (estaExpulsado(jugadorId)) return;
          consolidarJugador(jugadorId);
          estadoDirecto.minutos[jugadorId] = (estadoDirecto.minutos[jugadorId] || 0) + faltante;
        });

      estadoDirecto.segundosAcumulados = objetivo;
    } else {
      // Con descuento: se conserva el tiempo real, no se recorta a 35:00.
      consolidarTodosLosJugadoresEnCampo();
    }

    estadoDirecto.estado = "finalizado";

    const ok = await persistirEstadoDirecto();
    if (!ok) return;

    const okPartido = await persistirPartido({ estado: "finalizado" });
    if (!okPartido) return;

    partido.estado = "finalizado";
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