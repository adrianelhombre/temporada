// ---------- Utilidades de tiempo ----------

function minutoDeEvento(momentoISO, parteEvento) {
  if (!inicioPartidoTimestamp) return 0;
  
  const momento = new Date(momentoISO).getTime();
  
  // --- PARTE 2: usar el inicio de la segunda parte ---
  if (parteEvento === 2) {
    // Buscar el timestamp de inicio de la segunda parte
    // Primero intentamos con estadoDirecto.inicioParteTimestamp
    if (estadoDirecto.inicioParteTimestamp) {
      const inicioSegunda = new Date(estadoDirecto.inicioParteTimestamp).getTime();
      // Si el evento es posterior al inicio de la segunda parte
      if (momento >= inicioSegunda) {
        const segundos = (momento - inicioSegunda) / 1000;
        return Math.round(segundos * 100) / 100;
      }
    }
    
    // Si no hay inicioParteTimestamp o el evento es anterior,
    // intentamos calcular restando la duración de la primera parte
    // (esto es un fallback para eventos creados antes de tener la referencia)
    const inicio = new Date(inicioPartidoTimestamp).getTime();
    let segundos = Math.max(0, (momento - inicio) / 1000);
    const duracionParte = (partido && partido.duracion_parte_minutos) || 0;
    segundos = Math.max(0, segundos - (duracionParte * 60));
    return Math.round(segundos * 100) / 100;
  }
  
  // --- DESCANSO (parte 0): siempre 35' ---
  if (parteEvento === 0) {
    const duracionParte = (partido && partido.duracion_parte_minutos) || 0;
    return duracionParte * 60;
  }
  
  // --- PARTE 1: usar inicioPartidoTimestamp ---
  const inicio = new Date(inicioPartidoTimestamp).getTime();
  let segundos = Math.max(0, (momento - inicio) / 1000);
  return Math.round(segundos * 100) / 100;
}

function minutoTotalPartido(momentoISO, parteEvento) {
  const duracionParte = (partido && partido.duracion_parte_minutos) || 0;
  const segundosDentroParte = minutoDeEvento(momentoISO, parteEvento);
  
  if (parteEvento === 0) {
    return Math.round(segundosDentroParte * 100) / 100;
  }
  
  const segundosPartesAnteriores = (parteEvento - 1) * duracionParte * 60;
  return Math.round((segundosPartesAnteriores + segundosDentroParte) * 100) / 100;
}

function momentoDesdeMinuto(parteSeleccionada, minuto) {
  if (!inicioPartidoTimestamp) return new Date().toISOString();
  
  const segundosObjetivo = Math.max(0, Number(minuto) || 0) * 60;
  const duracionParte = (partido && partido.duracion_parte_minutos) || 0;
  
  // --- PARTE 2: usar el inicio de la segunda parte ---
  if (parteSeleccionada === 2) {
    if (estadoDirecto.inicioParteTimestamp) {
      const inicioSegunda = new Date(estadoDirecto.inicioParteTimestamp).getTime();
      return new Date(inicioSegunda + segundosObjetivo * 1000).toISOString();
    }
    // Fallback
    const inicio = new Date(inicioPartidoTimestamp).getTime();
    const offset = (duracionParte * 60 + segundosObjetivo) * 1000;
    return new Date(inicio + offset).toISOString();
  }
  
  // --- PARTE 0 (DESCANSO) ---
  if (parteSeleccionada === 0) {
    const tiempoDescanso = estadoDirecto.segundosAcumulados || (duracionParte * 60);
    const diff = tiempoDescanso - segundosObjetivo;
    const ahora = Date.now();
    return new Date(ahora - diff * 1000).toISOString();
  }
  
  // --- PARTE 1: usar inicioPartidoTimestamp ---
  const inicio = new Date(inicioPartidoTimestamp).getTime();
  return new Date(inicio + segundosObjetivo * 1000).toISOString();
}

function nombreJugador(j) {
  return j ? `${j.dorsal} - ${escaparHTML(j.nombre)}` : "?";
}