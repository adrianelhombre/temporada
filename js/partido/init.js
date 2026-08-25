(async () => {
  if (!await exigirSesion()) return;

  partidoId = parametroURL("id");
  if (!partidoId) { location.href = "partidos.html"; return; }

  try {
    await cargarJugadores();
    await cargarPartido();
    await cargarEventos();
  } catch (error) {
    notificarError(error, "No se pudo cargar el partido.");
    return;
  }
  pintarTodo();
  iniciarTick();

  document.getElementById("botonEmpezar1aParte").addEventListener("click", () => ejecutarAccion(empezar1aParte));
  document.getElementById("botonPausar").addEventListener("click", () => ejecutarAccion(pausar));
  document.getElementById("botonReanudar").addEventListener("click", () => ejecutarAccion(reanudar));
  document.getElementById("botonDescanso").addEventListener("click", () => ejecutarAccion(irADescanso));
  document.getElementById("botonEmpezar2aParte").addEventListener("click", () => ejecutarAccion(empezar2aParte));
  document.getElementById("botonFinalizarPartido").addEventListener("click", finalizarPartido);

  document.getElementById("botonModoCambio").addEventListener("click", (e) => {
    modoCambio = !modoCambio;
    seleccion = null;
    e.target.classList.toggle("primario", modoCambio);
    pintarTodo();
  });

  // --- Gol rival ---
  document.getElementById("botonGolRival").addEventListener("click", () => {
    document.getElementById("modalGolRival").classList.remove("oculto");
    document.getElementById("dorsalGolRival").value = "";
  });
  document.getElementById("botonConfirmarGolRival").addEventListener("click", () => ejecutarAccion(golRival));
  document.getElementById("botonCerrarModalGolRival").addEventListener("click", () => {
    document.getElementById("modalGolRival").classList.add("oculto");
    document.getElementById("dorsalGolRival").value = "";
  });

  // --- Tarjeta rival ---
  document.getElementById("botonTarjetaRival").addEventListener("click", () => {
    document.getElementById("modalTarjetaRival").classList.remove("oculto");
    document.getElementById("dorsalRival").value = "";
  });
  document.getElementById("botonRivalAmarilla").addEventListener("click", () => ejecutarAccion(() => tarjetaRival("amarilla")));
  document.getElementById("botonRivalRoja").addEventListener("click", () => ejecutarAccion(() => tarjetaRival("roja")));
  document.getElementById("botonCerrarModalRival").addEventListener("click", () => {
    document.getElementById("modalTarjetaRival").classList.add("oculto");
    document.getElementById("dorsalRival").value = "";
  });

  // --- Menú de acciones flotante para jugadores en campo ---
  document.getElementById("menuAccionesJugador").querySelectorAll('[data-accion]').forEach((btn) => {
    btn.addEventListener("click", () => ejecutarAccion(() => registrarEventoDesdeMenu(btn.dataset.accion)));
  });
  document.getElementById("btnCancelarAcciones").addEventListener("click", cerrarMenuAcciones);

  // Cerrar menú de campo al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (menuAccionesAbierto) {
      const menu = document.getElementById("menuAccionesJugador");
      const campo = document.getElementById("campo");
      if (!menu.contains(e.target) && !campo.contains(e.target)) {
        cerrarMenuAcciones();
      }
    }
  });

  // --- Menú de acciones flotante para suplentes ---
  document.getElementById("menuAccionesSuplente").querySelectorAll('[data-accion-sup]').forEach((btn) => {
    btn.addEventListener("click", () => ejecutarAccion(() => registrarEventoSuplente(btn.dataset.accionSup)));
  });
  document.getElementById("btnCancelarAccionesSuplente").addEventListener("click", cerrarMenuSuplente);

  // Cerrar menú de suplente al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (menuSuplenteAbierto) {
      const menu = document.getElementById("menuAccionesSuplente");
      const banquillo = document.getElementById("banquillo");
      if (!menu.contains(e.target) && !banquillo.contains(e.target)) {
        cerrarMenuSuplente();
      }
    }
  });

  document.getElementById("botonHistorial").addEventListener("click", abrirHistorial);
  // --- Cerrar historial con X ---
  document.getElementById("botonCerrarHistorialX").addEventListener("click", () => {
    document.getElementById("modalHistorial").classList.add("oculto");
  });

  // --- Cerrar historial con el botón de abajo ---
  document.getElementById("botonCerrarHistorial").addEventListener("click", () => {
    document.getElementById("modalHistorial").classList.add("oculto");
  });

  // ------------------------------------------------------------
  // LISTENER DE HISTORIAL CORREGIDO (usa closest('button'))
  // ------------------------------------------------------------
  document.getElementById("listaHistorial").addEventListener("click", (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;

    const idBorrar = boton.dataset.borrarEvento;
    const idEditar = boton.dataset.editarEvento;
    const idBorrarBloque = boton.dataset.borrarBloque;
    const momento = boton.dataset.momento;
    const origen = boton.dataset.origen;

    if (idBorrar) ejecutarAccion(() => borrarEvento(idBorrar, origen));
    else if (idEditar) abrirEdicionEvento(idEditar, origen);
    else if (idBorrarBloque) ejecutarAccion(() => borrarBloque(idBorrarBloque, momento));
  });

  document.getElementById("botonAnadirEvento").addEventListener("click", abrirModalAnadirEvento);
  document.getElementById("botonAnadirOrigenPropio").addEventListener("click", () => seleccionarOrigenAnadir("propio"));
  document.getElementById("botonAnadirOrigenRival").addEventListener("click", () => seleccionarOrigenAnadir("rival"));
  document.getElementById("botonGuardarAnadirEvento").addEventListener("click", () => ejecutarAccion(guardarNuevoEvento));
  document.getElementById("botonCancelarAnadirEvento").addEventListener("click", () => {
    document.getElementById("modalAnadirEvento").classList.add("oculto");
  });

  document.getElementById("botonGuardarEdicionEvento").addEventListener("click", () => ejecutarAccion(guardarEdicionEvento));
  document.getElementById("botonCancelarEdicionEvento").addEventListener("click", () => {
    document.getElementById("modalEditarEvento").classList.add("oculto");
    eventoEditando = null;
  });

  // --- Listeners para edición de cambios (bloques) ---
  document.getElementById("botonAnadirCambio").addEventListener("click", anadirFilaCambio);
  document.getElementById("botonGuardarEdicionCambio").addEventListener("click", () => ejecutarAccion(guardarEdicionCambio));
  document.getElementById("botonCancelarEdicionCambio").addEventListener("click", () => {
    document.getElementById("modalEditarCambio").classList.add("oculto");
    bloqueEditando = null;
  });

  // --- Listener para cerrar modal de hueco vacío (X) ---
  document.getElementById("botonCerrarHuecoVacioX").addEventListener("click", () => {
    document.getElementById("modalHuecoVacio").classList.add("oculto");
  });

  // --- Listener existente para el botón Cancelar ---
  document.getElementById("botonCerrarHuecoVacio").addEventListener("click", () => {
    document.getElementById("modalHuecoVacio").classList.add("oculto");
  });

  document.getElementById("botonConfirmarSi").addEventListener("click", () => {
    if (callbackConfirmacion) callbackConfirmacion();
  });
  document.getElementById("botonConfirmarNo").addEventListener("click", cerrarConfirmacion);

  document.getElementById("botonAbrirNotas").addEventListener("click", () => {
    document.getElementById("modalNotas").classList.remove("oculto");
  });
  document.getElementById("botonCerrarNotas").addEventListener("click", () => {
    document.getElementById("modalNotas").classList.add("oculto");
    document.getElementById("notasPartido").value = partido.notas || "";
  });
  document.getElementById("botonGuardarNotas").addEventListener("click", async () => {
    await ejecutarAccion(async () => {
      const ok = await persistirPartido({ notas: document.getElementById("notasPartido").value });
      if (ok) {
        document.getElementById("modalNotas").classList.add("oculto");
        mostrarNotificacion("Notas guardadas correctamente.", "exito");
      }
    });
  });

  document.getElementById("selectFormacion").addEventListener("change", (e) => {
    ejecutarAccion(() => cambiarFormacion(e.target.value));
  });
})();

// --- Corner ---
document.getElementById("botonCorner").addEventListener("click", () => {
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
  
  // Actualizar el nombre del rival en el modal
  document.getElementById("botonCornerContra").textContent = partido.rival || "Rival";
  document.getElementById("modalCorner").classList.remove("oculto");
});

document.getElementById("botonCornerFavor").addEventListener("click", () => {
  ejecutarAccion(() => registrarCorner('favor'));
});

document.getElementById("botonCornerContra").addEventListener("click", () => {
  ejecutarAccion(() => registrarCorner('contra'));
});

document.getElementById("botonCerrarCorner").addEventListener("click", () => {
  document.getElementById("modalCorner").classList.add("oculto");
});

// --- Fuera de juego ---
document.getElementById("botonFueraJuego").addEventListener("click", () => {
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
  
  // Actualizar el nombre del rival en el modal
  document.getElementById("botonFueraJuegoContra").textContent = partido.rival || "Rival";
  document.getElementById("modalFueraJuego").classList.remove("oculto");
});

document.getElementById("botonFueraJuegoFavor").addEventListener("click", () => {
  ejecutarAccion(() => registrarFueraJuego('favor'));
});

document.getElementById("botonFueraJuegoContra").addEventListener("click", () => {
  ejecutarAccion(() => registrarFueraJuego('contra'));
});

document.getElementById("botonCerrarFueraJuego").addEventListener("click", () => {
  document.getElementById("modalFueraJuego").classList.add("oculto");
});

// --- Eventos genéricos ---
// Los botones de acciones rápidas que ahora están en el menú del jugador se comentan
// document.getElementById("botonTiroPuerta").addEventListener("click", () => abrirModalEventoGenerico('tiro_puerta', 'Tiro a puerta'));
// document.getElementById("botonTiroFuera").addEventListener("click", () => abrirModalEventoGenerico('tiro_fuera', 'Tiro fuera'));
// document.getElementById("botonFalta").addEventListener("click", () => abrirModalEventoGenerico('falta', 'Falta'));

// --- Modal evento genérico ---
document.getElementById("botonEventoFavor").addEventListener("click", () => {
  document.getElementById("botonEventoFavor").classList.add("activo");
  document.getElementById("botonEventoContra").classList.remove("activo");
  jugadorModalActual = null;
  actualizarCampoJugadorEventoGenerico('favor');
});

document.getElementById("botonEventoContra").addEventListener("click", () => {
  document.getElementById("botonEventoContra").classList.add("activo");
  document.getElementById("botonEventoFavor").classList.remove("activo");
  jugadorModalActual = null;
  actualizarCampoJugadorEventoGenerico('contra');
});

document.getElementById("botonConfirmarEventoGenerico").addEventListener("click", () => ejecutarAccion(confirmarEventoGenerico));

document.getElementById("botonCerrarEventoGenerico").addEventListener("click", () => {
  document.getElementById("modalEventoGenerico").classList.add("oculto");
  eventoGenericoActual = null;
  equipoGenericoActual = null;
  jugadorModalActual = null;
});

// --- Tiro rival ---
document.getElementById("botonTiroRival").addEventListener("click", abrirModalTiroRival);
document.getElementById("botonTiroPuertaRival").addEventListener("click", () => ejecutarAccion(() => registrarTiroRival('puerta')));
document.getElementById("botonTiroFueraRival").addEventListener("click", () => ejecutarAccion(() => registrarTiroRival('fuera')));
document.getElementById("botonCerrarTiroRival").addEventListener("click", () => {
  document.getElementById("modalTiroRival").classList.add("oculto");
});
