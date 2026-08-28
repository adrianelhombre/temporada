let jugadores = [];
let jugadoresEquipo = [];
let jugadoresExternos = [];
let posicionPrincipalSeleccionada = null;
let posicionesSecundariasSeleccionadas = new Set();

// POSICIONES_JUGADOR ya está definido en formaciones.js

// --- Selectores de posiciones ---

function inicializarSelectoresPosiciones(jugador) {
  const principalEl = document.getElementById('selectorPrincipal');
  const secundarioEl = document.getElementById('selectorSecundario');
  
  principalEl.innerHTML = '';
  secundarioEl.innerHTML = '';
  
  // Usar 'posicion' como posición principal (campo existente)
  posicionPrincipalSeleccionada = jugador?.posicion || null;
  posicionesSecundariasSeleccionadas = new Set(jugador?.posiciones_secundarias || []);
  
  // Crear chips para posición principal
  POSICIONES_JUGADOR.forEach(pos => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-posicion';
    chip.textContent = pos;
    chip.dataset.posicion = pos;
    
    if (pos === posicionPrincipalSeleccionada) {
      chip.classList.add('seleccionado', 'principal');
    }
    
    chip.addEventListener('click', () => {
      // Deseleccionar todas las principales
      principalEl.querySelectorAll('.chip-posicion').forEach(c => c.classList.remove('seleccionado', 'principal'));
      
      if (posicionPrincipalSeleccionada === pos) {
        posicionPrincipalSeleccionada = null;
      } else {
        posicionPrincipalSeleccionada = pos;
        chip.classList.add('seleccionado', 'principal');
        
        // Si la posición está seleccionada como secundaria, la quitamos de ahí
        if (posicionesSecundariasSeleccionadas.has(pos)) {
          posicionesSecundariasSeleccionadas.delete(pos);
          actualizarChipsSecundarios();
        }
      }
    });
    
    principalEl.appendChild(chip);
  });
  
  // Crear chips para posiciones secundarias
  actualizarChipsSecundarios();
}

function actualizarChipsSecundarios() {
  const secundarioEl = document.getElementById('selectorSecundario');
  secundarioEl.innerHTML = '';
  
  POSICIONES_JUGADOR.forEach(pos => {
    // No mostrar la posición principal como secundaria
    if (pos === posicionPrincipalSeleccionada) return;
    
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-posicion secundaria';
    chip.textContent = pos;
    chip.dataset.posicion = pos;
    
    if (posicionesSecundariasSeleccionadas.has(pos)) {
      chip.classList.add('seleccionado');
    }
    
    chip.addEventListener('click', () => {
      if (pos === posicionPrincipalSeleccionada) {
        // No se puede seleccionar la principal como secundaria
        return;
      }
      
      if (posicionesSecundariasSeleccionadas.has(pos)) {
        posicionesSecundariasSeleccionadas.delete(pos);
        chip.classList.remove('seleccionado');
      } else {
        posicionesSecundariasSeleccionadas.add(pos);
        chip.classList.add('seleccionado');
      }
    });
    
    secundarioEl.appendChild(chip);
  });
}

// --- Carga de jugadores ---

async function cargarJugadores() {
  const { data, error } = await supabaseClient
    .from("jugadores")
    .select("*")
    .eq("activo", true)
    .order("dorsal");
  if (error) {
    notificarError(error, "No se pudo cargar la plantilla.");
    return;
  }
  
  jugadores = data || [];
  
  // Separar jugadores del equipo y externos
  // Por defecto (null o false) son del equipo
  jugadoresEquipo = jugadores.filter(j => j.es_de_otro_equipo !== true);
  jugadoresExternos = jugadores.filter(j => j.es_de_otro_equipo === true);
  
  pintarTabla();
}

function pintarTabla() {
  const cuerpo = document.querySelector("#tablaJugadores tbody");
  cuerpo.innerHTML = "";
  
  // Función para pintar una fila de jugador
  function pintarFila(j, esExterno = false) {
    const fila = document.createElement("tr");
    
    // Obtener todas las posiciones (principal + secundarias)
    const posiciones = [];
    if (j.posicion) posiciones.push({ pos: j.posicion, principal: true });
    if (j.posiciones_secundarias) {
      j.posiciones_secundarias.forEach(p => posiciones.push({ pos: p, principal: false }));
    }
    
    const posicionesHTML = posiciones.map(p => 
      `<span class="jugador-posicion-tag ${p.principal ? 'principal' : ''}">${p.pos}</span>`
    ).join('');
    
    // Solo añadir un indicador visual para jugadores externos
    const nombreHTML = esExterno ? 
      `${escaparHTML(j.nombre)} <span style="font-size:0.6rem; color:var(--texto-secundario); font-weight:400;">(ext.)</span>` : 
      escaparHTML(j.nombre);
    
    fila.innerHTML = `
      <td>
        <div class="celda-jugador">
          <span class="jugador-dorsal">${j.dorsal}</span>
          <span class="jugador-nombre">${nombreHTML}</span>
        </div>
      </td>
      <td><div class="jugador-posiciones">${posicionesHTML || '-'}</div></td>
      <td style="text-align:right;">
        <div class="acciones-jugador">
          <button class="btn-editar" data-editar="${j.id}">Editar</button>
          <button class="btn-borrar" data-borrar="${j.id}">Borrar</button>
        </div>
      </td>
      <td style="text-align:center;">
        <button class="btn-ficha" data-id="${j.id}" title="Ver ficha del jugador">👤</button>
      </td>
    `;
    return fila;
  }
  
  // Primero los jugadores del equipo (sin separador)
  jugadoresEquipo.forEach(j => cuerpo.appendChild(pintarFila(j, false)));
  
  // Luego los externos con un pequeño separador
  if (jugadoresExternos.length > 0) {
    const separador = document.createElement("tr");
    separador.innerHTML = `<td colspan="4" style="padding: 12px 0 6px 0; border-bottom: 1px solid var(--borde);">
      <span style="font-size:0.7rem; color:var(--texto-secundario); text-transform:uppercase; letter-spacing:0.05em;">Jugadores de otros equipos</span>
    </td>`;
    cuerpo.appendChild(separador);
    
    jugadoresExternos.forEach(j => cuerpo.appendChild(pintarFila(j, true)));
  }
  
  // Si no hay jugadores
  if (jugadoresEquipo.length === 0 && jugadoresExternos.length === 0) {
    const vacio = document.createElement("tr");
    vacio.innerHTML = `<td colspan="4" style="text-align:center; padding:40px 0; color:var(--texto-secundario);">
      No hay jugadores registrados
    </td>`;
    cuerpo.appendChild(vacio);
  }
}

function mostrarFormulario(jugador) {
  document.getElementById("formularioJugador").classList.remove("oculto");
  document.getElementById("jugadorId").value = jugador ? jugador.id : "";
  document.getElementById("nombreJugador").value = jugador ? jugador.nombre : "";
  document.getElementById("dorsalJugador").value = jugador ? jugador.dorsal : "";
  
  // Checkbox: solo se marca si es explícitamente de otro equipo
  document.getElementById("esDeOtroEquipo").checked = jugador ? jugador.es_de_otro_equipo === true : false;
  
  // Inicializar selectores de posiciones
  inicializarSelectoresPosiciones(jugador);
}

function ocultarFormulario() {
  document.getElementById("formularioJugador").classList.add("oculto");
  posicionPrincipalSeleccionada = null;
  posicionesSecundariasSeleccionadas.clear();
}

// --- Obtener posiciones guardadas ---

function obtenerPosicionesGuardadas() {
  return {
    posicion: posicionPrincipalSeleccionada,
    posiciones_secundarias: Array.from(posicionesSecundariasSeleccionadas)
  };
}

// --- Inicialización ---

(async () => {
  if (!await exigirSesion()) return;
  await cargarJugadores();

  document.getElementById("botonNuevoJugador").addEventListener("click", () => mostrarFormulario(null));
  document.getElementById("botonCancelarJugador").addEventListener("click", ocultarFormulario);

  document.getElementById("botonGuardarJugador").addEventListener("click", async () => {
    const id = document.getElementById("jugadorId").value;
    const nombre = document.getElementById("nombreJugador").value.trim();
    const dorsal = parseInt(document.getElementById("dorsalJugador").value, 10);
    const esDeOtroEquipo = document.getElementById("esDeOtroEquipo").checked;
    
    if (!nombre || !Number.isInteger(dorsal) || dorsal < 1 || dorsal > 999) {
      mostrarNotificacion("Indica un nombre y un dorsal entre 1 y 999.", "error");
      return;
    }
    
    // Validar que tenga al menos una posición
    const posiciones = obtenerPosicionesGuardadas();
    if (!posiciones.posicion && posiciones.posiciones_secundarias.length === 0) {
      mostrarNotificacion("Debes seleccionar al menos una posición (principal o secundaria).", "error");
      return;
    }

    // Verificar dorsal duplicado solo entre jugadores del equipo
    if (!esDeOtroEquipo) {
      const dorsalRepetido = jugadoresEquipo.some((jugador) => jugador.dorsal === dorsal && jugador.id !== id);
      if (dorsalRepetido) {
        mostrarNotificacion("Ya existe un jugador con ese dorsal.", "error");
        return;
      }
    }

    const registro = {
      nombre: nombre,
      dorsal: dorsal,
      posicion: posiciones.posicion,
      posiciones_secundarias: posiciones.posiciones_secundarias,
      es_de_otro_equipo: esDeOtroEquipo,
    };

    let error;
    if (id) {
      ({ error } = await supabaseClient.from("jugadores").update(registro).eq("id", id));
    } else {
      ({ error } = await supabaseClient.from("jugadores").insert(registro));
    }
    if (error) {
      notificarError(error, "No se pudo guardar el jugador.");
      return;
    }
    ocultarFormulario();
    await cargarJugadores();
  });

  let idPendienteBorrar = null;

  document.querySelector("#tablaJugadores tbody").addEventListener("click", async (e) => {
    // Botón Ficha
    const btnFicha = e.target.closest('.btn-ficha');
    if (btnFicha) {
      window.location.href = `jugador.html?id=${btnFicha.dataset.id}`;
      return;
    }

    const idEditar = e.target.dataset.editar;
    const idBorrar = e.target.dataset.borrar;
    if (idEditar) {
      mostrarFormulario(jugadores.find((j) => j.id === idEditar));
    }
    if (idBorrar) {
      idPendienteBorrar = idBorrar;
      document.getElementById("modalConfirmarBorrado").classList.remove("oculto");
    }
  });

  document.getElementById("botonCancelarBorrado").addEventListener("click", () => {
    idPendienteBorrar = null;
    document.getElementById("modalConfirmarBorrado").classList.add("oculto");
  });

  document.getElementById("botonConfirmarBorrado").addEventListener("click", async () => {
    if (!idPendienteBorrar) return;
    const { error } = await supabaseClient.from("jugadores").update({ activo: false }).eq("id", idPendienteBorrar);
    if (error) {
      notificarError(error, "No se pudo desactivar el jugador.");
      return;
    }
    idPendienteBorrar = null;
    document.getElementById("modalConfirmarBorrado").classList.add("oculto");
    await cargarJugadores();
  });
})();