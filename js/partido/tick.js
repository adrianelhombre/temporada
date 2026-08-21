// ---------- Cronómetro ----------

let segundosReales = 0;
let ultimoTick = Date.now();

function segundosMarcador() {
  const segundosDeLaParte = segundosParteActual();

  if (estadoDirecto.parte === 2) {
    // La segunda parte comienza en 35:00 (duración de la primera parte)
    return (partido.duracion_parte_minutos * 60) + segundosDeLaParte;
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
  document.querySelectorAll(".ficha-jugador[data-jugador]").forEach((el) => {
    const jugadorId = el.dataset.jugador;
    const mins = estadoDirecto.minutos[jugadorId] || 0;
    const etiqueta = el.querySelector(".minutos");
    if (etiqueta) etiqueta.textContent = formatoMMSS(mins);
  });
}

function sincronizarTick() {
  segundosReales = estadoDirecto.segundosAcumulados || 0;
  ultimoTick = Date.now();
}

function iniciarTick() {
  sincronizarTick();

  setInterval(async () => {
    const ahora = Date.now();
    const delta = (ahora - ultimoTick) / 1000;
    ultimoTick = ahora;

    const enVivo = estadoDirecto.estado === "en_curso";
    document.getElementById("textoTiempo").textContent =
      estadoDirecto.estado === "descanso" ? "DESCANSO" : formatoMMSS(segundosMarcador());
    document.getElementById("textoEstado").textContent = enVivo
      ? `${estadoDirecto.parte}ª Parte en Juego`
      : etiquetaEstadoTexto();

    if (estadoDirecto.estado === "en_curso") {
      segundosReales += delta;

      if (segundosReales - estadoDirecto.segundosAcumulados >= 1) {
        const segundosAAñadir = Math.floor(segundosReales - estadoDirecto.segundosAcumulados);

        for (let i = 0; i < segundosAAñadir; i++) {
          Object.values(estadoDirecto.huecos).filter(Boolean).forEach((jugadorId) => {
            if (estaExpulsado(jugadorId)) return;
            estadoDirecto.minutos[jugadorId] = (estadoDirecto.minutos[jugadorId] || 0) + 1;
          });
        }

        estadoDirecto.segundosAcumulados = Math.floor(segundosReales);
        contadorTick++;
        if (contadorTick % 5 === 0) {
          await persistirEstadoDirecto();
        }
      }

      actualizarMinutosEnPantalla();
    } else {
      // Mantener sincronizado el contador sin seguir acumulando tiempo
      if (segundosReales !== (estadoDirecto.segundosAcumulados || 0)) {
        segundosReales = estadoDirecto.segundosAcumulados || 0;
      }
    }
  }, 500);
}