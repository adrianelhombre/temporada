let jugadores = [];

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
    fila.innerHTML = `
      <td>${j.dorsal}</td>
      <td>${escaparHTML(j.nombre)}</td>
      <td>${escaparHTML(j.posicion || "-")}</td>
      <td style="text-align:right;">
        <button class="pequeno" data-editar="${j.id}">Editar</button>
        <button class="pequeno peligro" data-borrar="${j.id}">Borrar</button>
      </td>`;
    cuerpo.appendChild(fila);
  });
}

function rellenarSelectPosiciones() {
  const select = document.getElementById("posicionJugador");
  select.innerHTML = POSICIONES_JUGADOR.map((p) => `<option value="${p}">${p}</option>`).join("");
}

function mostrarFormulario(jugador) {
  document.getElementById("formularioJugador").classList.remove("oculto");
  document.getElementById("jugadorId").value = jugador ? jugador.id : "";
  document.getElementById("nombreJugador").value = jugador ? jugador.nombre : "";
  document.getElementById("dorsalJugador").value = jugador ? jugador.dorsal : "";
  document.getElementById("posicionJugador").value = jugador ? jugador.posicion : "POR";
}

function ocultarFormulario() {
  document.getElementById("formularioJugador").classList.add("oculto");
}

(async () => {
  if (!await exigirSesion()) return;
  rellenarSelectPosiciones();
  await cargarJugadores();

  document.getElementById("botonNuevoJugador").addEventListener("click", () => mostrarFormulario(null));
  document.getElementById("botonCancelarJugador").addEventListener("click", ocultarFormulario);

  document.getElementById("botonGuardarJugador").addEventListener("click", async () => {
    const id = document.getElementById("jugadorId").value;
    const registro = {
      nombre: document.getElementById("nombreJugador").value.trim(),
      dorsal: parseInt(document.getElementById("dorsalJugador").value, 10),
      posicion: document.getElementById("posicionJugador").value,
    };
    if (!registro.nombre || !Number.isInteger(registro.dorsal) || registro.dorsal < 1 || registro.dorsal > 999) {
      mostrarNotificacion("Indica un nombre y un dorsal entre 1 y 999.", "error");
      return;
    }

    const dorsalRepetido = jugadores.some((jugador) => jugador.dorsal === registro.dorsal && jugador.id !== id);
    if (dorsalRepetido) {
      mostrarNotificacion("Ya existe un jugador activo con ese dorsal.", "error");
      return;
    }

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
