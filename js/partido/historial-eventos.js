// ---------- Eventos individuales ----------

// --- TIPOS CON SUFIJOS PARA LA BASE DE DATOS ---
const TIPOS_EDITABLES_PROPIO = [
  "gol", 
  "asistencia", 
  "amarilla", 
  "roja",
  "tiro_puerta_favor",
  "tiro_fuera_favor",
  "corner_favor",
  "falta_favor",
  "fuera_juego_favor"
];

const TIPOS_EDITABLES_RIVAL = [
  "gol", 
  "amarilla", 
  "roja",
  "tiro_puerta_contra",
  "tiro_fuera_contra",
  "corner_contra",
  "falta_contra",
  "fuera_juego_contra"
];

let eventoEditando = null;

// Borrar evento individual
function borrarEvento(id, origen) {
  mostrarConfirmacion("¿Borrar este evento?", async () => {
    cerrarConfirmacion();
    const tabla = origen === "propio" ? "eventos_partido" : "eventos_rival";
    const { error } = await supabaseClient.from(tabla).delete().eq("id", id);
    if (error) {
      notificarError(error, "No se pudo borrar el evento.");
      return;
    }
    await persistirEstadoDirecto();
    await cargarEventos();
    pintarTodo();
    abrirHistorial();
  });
}

function abrirEdicionEvento(id, origen) {
  const lista = origen === "propio" ? eventosPartido : eventosRival;
  const evento = lista.find((e) => e.id === id);
  if (!evento) return;
  eventoEditando = { id, origen };

  const campoJugador = document.getElementById("campoJugadorEditar");
  if (origen === "propio") {
    campoJugador.innerHTML = `<label for="selectJugadorEditar">Jugador</label><select id="selectJugadorEditar"></select>`;
    const select = document.getElementById("selectJugadorEditar");
    
    // Filtrar solo jugadores convocados
    const convocados = partido.convocados || [];
    const setConvocados = new Set(convocados);
    const jugadoresConvocados = jugadores.filter(j => setConvocados.has(j.id) && jugadorActivo(j));
    
    select.innerHTML = jugadoresConvocados.map((j) => `<option value="${j.id}">${j.dorsal} - ${escaparHTML(j.nombre)}</option>`).join("");
    select.value = evento.jugador_id;
  } else {
    campoJugador.innerHTML = `<label for="inputDorsalEditar">Dorsal del rival</label><input type="number" inputmode="numeric" id="inputDorsalEditar" />`;
    document.getElementById("inputDorsalEditar").value = evento.dorsal || "";
  }

  const opciones = origen === "propio" ? TIPOS_EDITABLES_PROPIO : TIPOS_EDITABLES_RIVAL;
  const selectTipo = document.getElementById("tipoEventoEditar");
  
  const labels = {
    'gol': 'Gol',
    'asistencia': 'Asistencia',
    'amarilla': 'Tarjeta amarilla',
    'roja': 'Tarjeta roja',
    'tiro_puerta_favor': 'Tiro a puerta',
    'tiro_fuera_favor': 'Tiro fuera',
    'corner_favor': 'Córner',
    'falta_favor': 'Falta',
    'fuera_juego_favor': 'Fuera de juego',
    'tiro_puerta_contra': 'Tiro a puerta',
    'tiro_fuera_contra': 'Tiro fuera',
    'corner_contra': 'Córner',
    'falta_contra': 'Falta',
    'fuera_juego_contra': 'Fuera de juego'
  };
  
  selectTipo.innerHTML = opciones.map((t) => `<option value="${t}">${labels[t] || t}</option>`).join("");
  selectTipo.value = evento.tipo;

  document.getElementById("parteEventoEditar").value = evento.parte;
  
  const minuto = Math.round(minutoDeEvento(evento.momento, evento.parte) / 60);
  document.getElementById("minutoEventoEditar").value = minuto;

  document.getElementById("modalEditarEvento").classList.remove("oculto");
}

async function guardarEdicionEvento() {
  if (!eventoEditando) return;
  const { id, origen } = eventoEditando;
  const nuevaParte = Number(document.getElementById("parteEventoEditar").value);
  const nuevoTipo = document.getElementById("tipoEventoEditar").value;
  const nuevoMinuto = Number(document.getElementById("minutoEventoEditar").value);
  
  const nuevoMomento = momentoDesdeMinuto(nuevaParte, nuevoMinuto);
  
  const cambios = {
    tipo: nuevoTipo,
    parte: nuevaParte,
    momento: nuevoMomento,
  };

  const tiposGenericos = ['tiro_puerta_favor', 'tiro_fuera_favor', 'corner_favor', 'falta_favor', 'fuera_juego_favor',
                         'tiro_puerta_contra', 'tiro_fuera_contra', 'corner_contra', 'falta_contra', 'fuera_juego_contra'];
  
  if (origen === "propio") {
    if (tiposGenericos.includes(nuevoTipo)) {
      cambios.jugador_id = document.getElementById("selectJugadorEditar")?.value || null;
    } else {
      cambios.jugador_id = document.getElementById("selectJugadorEditar").value;
    }
  } else {
    cambios.dorsal = document.getElementById("inputDorsalEditar").value.trim() || null;
  }

  const tabla = origen === "propio" ? "eventos_partido" : "eventos_rival";
  const { error } = await supabaseClient.from(tabla).update(cambios).eq("id", id);
  if (error) {
    notificarError(error, "No se pudo editar el evento.");
    return;
  }
  document.getElementById("modalEditarEvento").classList.add("oculto");
  eventoEditando = null;
  await persistirEstadoDirecto();
  await cargarEventos();
  pintarTodo();
  abrirHistorial();
}

// ---------- Añadir evento ----------
let origenAnadir = "propio";

function actualizarCampoJugadorAnadir() {
  const cont = document.getElementById("campoJugadorAnadir");
  if (origenAnadir === "propio") {
    cont.innerHTML = `<label for="selectJugadorAnadir">Jugador</label><select id="selectJugadorAnadir"></select>`;
    
    // Filtrar solo jugadores convocados
    const convocados = partido.convocados || [];
    const setConvocados = new Set(convocados);
    const jugadoresConvocados = jugadores.filter(j => setConvocados.has(j.id) && jugadorActivo(j));
    
    document.getElementById("selectJugadorAnadir").innerHTML =
      jugadoresConvocados.map((j) => `<option value="${j.id}">${j.dorsal} - ${escaparHTML(j.nombre)}</option>`).join("");
  } else {
    cont.innerHTML = `<label for="dorsalAnadir">Dorsal del rival</label><input type="number" inputmode="numeric" id="dorsalAnadir" />`;
  }
  
  const opciones = origenAnadir === "propio" ? TIPOS_EDITABLES_PROPIO : TIPOS_EDITABLES_RIVAL;
  const labels = {
    'gol': 'Gol',
    'asistencia': 'Asistencia',
    'amarilla': 'Tarjeta amarilla',
    'roja': 'Tarjeta roja',
    'tiro_puerta_favor': 'Tiro a puerta',
    'tiro_fuera_favor': 'Tiro fuera',
    'corner_favor': 'Córner',
    'falta_favor': 'Falta',
    'fuera_juego_favor': 'Fuera de juego',
    'tiro_puerta_contra': 'Tiro a puerta',
    'tiro_fuera_contra': 'Tiro fuera',
    'corner_contra': 'Córner',
    'falta_contra': 'Falta',
    'fuera_juego_contra': 'Fuera de juego'
  };
  
  document.getElementById("tipoEventoAnadir").innerHTML = opciones.map((t) => 
    `<option value="${t}">${labels[t] || t}</option>`
  ).join("");
}

function seleccionarOrigenAnadir(origen) {
  origenAnadir = origen;
  
  document.getElementById("botonAnadirOrigenPropio").classList.remove("activo");
  document.getElementById("botonAnadirOrigenRival").classList.remove("activo");
  
  if (origen === "propio") {
    document.getElementById("botonAnadirOrigenPropio").classList.add("activo");
  } else {
    document.getElementById("botonAnadirOrigenRival").classList.add("activo");
  }
  
  actualizarCampoJugadorAnadir();
}

function abrirModalAnadirEvento() {
  document.getElementById("botonAnadirOrigenPropio").classList.add("activo");
  document.getElementById("botonAnadirOrigenRival").classList.remove("activo");
  
  seleccionarOrigenAnadir("propio");
  document.getElementById("parteEventoAnadir").value = estadoDirecto.parte || 1;
  document.getElementById("minutoEventoAnadir").value = 0;
  document.getElementById("modalAnadirEvento").classList.remove("oculto");
}

async function guardarNuevoEvento() {
  const tipo = document.getElementById("tipoEventoAnadir").value;
  const parteSeleccionada = Number(document.getElementById("parteEventoAnadir").value);
  const momento = momentoDesdeMinuto(parteSeleccionada, document.getElementById("minutoEventoAnadir").value);

  const tiposGenericos = ['tiro_puerta_favor', 'tiro_fuera_favor', 'corner_favor', 'falta_favor', 'fuera_juego_favor',
                         'tiro_puerta_contra', 'tiro_fuera_contra', 'corner_contra', 'falta_contra', 'fuera_juego_contra'];

  let error;
  if (origenAnadir === "propio") {
    let jugadorId = null;
    if (!tiposGenericos.includes(tipo)) {
      jugadorId = document.getElementById("selectJugadorAnadir").value;
      if (!jugadorId) {
        mostrarNotificacion("Selecciona un jugador.", "error");
        return;
      }
    } else {
      jugadorId = document.getElementById("selectJugadorAnadir")?.value || null;
    }
    ({ error } = await supabaseClient.from("eventos_partido").insert({
      partido_id: partidoId, jugador_id: jugadorId, tipo, parte: parteSeleccionada, momento,
    }));
  } else {
    let dorsal = document.getElementById("dorsalAnadir").value.trim() || null;
    if (!tiposGenericos.includes(tipo) && !dorsal) {
      mostrarNotificacion("Introduce el dorsal del rival.", "error");
      return;
    }
    ({ error } = await supabaseClient.from("eventos_rival").insert({
      partido_id: partidoId, tipo, dorsal: dorsal, parte: parteSeleccionada, momento,
    }));
  }

  if (error) {
    notificarError(error, "No se pudo añadir el evento.");
    return;
  }

  document.getElementById("modalAnadirEvento").classList.add("oculto");
  await persistirEstadoDirecto();
  await cargarEventos();
  pintarTodo();
}