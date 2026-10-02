// ---------- Cronómetro (solo redibuja; nunca acumula) ----------

function segundosMarcador() {
  const objetivo = partido.duracion_parte_minutos * 60;
  // ===== NUEVO =====
  // Si ya se cumplió el tiempo, el marcador se queda clavado en el objetivo.
  const segundosDeLaParte = Math.min(segundosParteActual(), objetivo);

  if (estadoDirecto.parte === 2) {
    // La segunda parte comienza en 35:00 (duración de la primera parte)
    return objetivo + segundosDeLaParte;
  }

  // Para la primera parte, mostramos el tiempo real jugado (puede ser >35 si hay descuento)
  return segundosDeLaParte;
}

function etiquetaEstadoTexto() {
  return {
    no_iniciado: "Sin Empezar",
    pausado: "Pausado",
    descanso: "Descanso",
    finalizado: "Partido Finalizado",
  }[estadoDirecto.estado] || "";
}

function actualizarMinutosEnPantalla() {
  document.querySelectorAll(".ficha-jugador[data-jugador], .ficha-jugador-banquillo[data-jugador]").forEach((el) => {
    const jugadorId = el.dataset.jugador;
    const segs = segundosJugador(jugadorId);
    const etiqueta = el.querySelector(".minutos");
    if (etiqueta) etiqueta.textContent = formatoMMSS(segs);
  });
}

// Contador para persistir periódicamente sin saturar Supabase.
let contadorPersistencia = 0;

function iniciarTick() {
  setInterval(async () => {
    // Si hay una acción de estado en curso (empezar parte, pausar, ir a descanso...),
    // no tocamos nada: solo redibujamos con los últimos datos consolidados para evitar
    // pintar valores a medio actualizar mientras la operación termina.
    if (operacionEnCurso) return;

    const enVivo = estadoDirecto.estado === "en_curso";

    // ===== NUEVO =====
    // Pausa automática al llegar al tiempo reglamentario.
    // Consolidamos tramo y jugadores, marcamos tiempoCumplido y redibujamos.
    // El estado sigue siendo "en_curso" para no confundir con una pausa manual.
    if (enVivo && !estadoDirecto.tiempoCumplido) {
      const objetivo = partido.duracion_parte_minutos * 60;
      if (segundosParteActual() >= objetivo) {
        consolidarTramo();
        consolidarTodosLosJugadoresEnCampo();
        estadoDirecto.tiempoCumplido = true;
        await persistirEstadoDirecto();
        pintarTodo();
        return;
      }
    }

    document.getElementById("textoTiempo").textContent =
      estadoDirecto.estado === "descanso" ? "DESCANSO" : formatoMMSS(segundosMarcador());

    // ===== NUEVO =====
    // Texto de estado: si el tiempo está cumplido, lo indicamos.
    document.getElementById("textoEstado").textContent =
      estadoDirecto.tiempoCumplido && estadoDirecto.estado === "en_curso"
        ? `${estadoDirecto.parte}ª Parte - Tiempo cumplido`
        : (enVivo ? `${estadoDirecto.parte}ª Parte en Juego` : etiquetaEstadoTexto());

    if (enVivo && !estadoDirecto.tiempoCumplido) {
      actualizarMinutosEnPantalla();

      contadorPersistencia++;
      // Persistimos cada ~5s (10 ticks de 500ms) solo el "ancla" del reloj
      // (inicioTramoTimestamp / inicioJugador ya están fijos desde que arrancó el tramo,
      // así que esto es solo para que otros dispositivos vean el estado si recargan).
      if (contadorPersistencia % 10 === 0) {
        await persistirEstadoDirecto();
      }
    }
  }, 500);
}