let jugadores = [];
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
  pintarTabla();
}

function pintarTabla() {
  const cuerpo = document.querySelector("#tablaJugadores tbody");
  cuerpo.innerHTML = "";
  jugadores.forEach((j) => {
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
    
    fila.innerHTML = `
      <td>
        <div class="celda-jugador">
          <span class="jugador-dorsal">${j.dorsal}</span>
          <span class="jugador-nombre">${escaparHTML(j.nombre)}</span>
        </div>
      </td>
      <td><div class="jugador-posiciones">${posicionesHTML || '-'}</div></td>
      <td style="text-align:right;">
        <div class="acciones-jugador">
          <button class="btn-editar" data-editar="${j.id}">Editar</button>
          <button class="btn-borrar" data-borrar="${j.id}">Borrar</button>
        </div>
      </td>
    `;
    cuerpo.appendChild(fila);
  });
}

function mostrarFormulario(jugador) {
  document.getElementById("formularioJugador").classList.remove("oculto");
  document.getElementById("jugadorId").value = jugador ? jugador.id : "";
  document.getElementById("nombreJugador").value = jugador ? jugador.nombre : "";
  document.getElementById("dorsalJugador").value = jugador ? jugador.dorsal : "";
  
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
    posicion: posicionPrincipalSeleccionada,  // ← Usamos 'posicion' como antes
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

    const dorsalRepetido = jugadores.some((jugador) => jugador.dorsal === dorsal && jugador.id !== id);
    if (dorsalRepetido) {
      mostrarNotificacion("Ya existe un jugador activo con ese dorsal.", "error");
      return;
    }

    const registro = {
      nombre: nombre,
      dorsal: dorsal,
      posicion: posiciones.posicion,  // ← Mantenemos el campo existente
      posiciones_secundarias: posiciones.posiciones_secundarias,  // ← Nuevo campo
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