(async () => {
  if (!await exigirSesion()) return;

  const [{ data: jugadores, error: errorJugadores }, { data: partidosFinalizados, error: errorPartidos }] = await Promise.all([
    supabaseClient.from("jugadores").select("*").order("dorsal"),
    supabaseClient.from("partidos").select("id").eq("estado", "finalizado"),
  ]);
  if (errorJugadores || errorPartidos) {
    notificarError(errorJugadores || errorPartidos, "No se pudieron cargar las estadísticas.");
    return;
  }
  const idsPartidos = (partidosFinalizados || []).map((p) => p.id);

  const acumulado = {};
  (jugadores || []).forEach((j) => {
    acumulado[j.id] = { dorsal: j.dorsal, nombre: j.nombre, minutos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, titular: 0, suplente: 0 };
  });

  if (idsPartidos.length > 0) {
    const [{ data: eventos, error: errorEventos }, { data: partidosConEstado, error: errorEstados }] = await Promise.all([
      supabaseClient.from("eventos_partido").select("*").in("partido_id", idsPartidos),
      supabaseClient.from("partidos").select("id, estado_directo").in("id", idsPartidos),
    ]);
    if (errorEventos || errorEstados) {
      notificarError(errorEventos || errorEstados, "No se pudieron calcular las estadísticas.");
      return;
    }

    (partidosConEstado || []).forEach((p) => {
      const minutosPartido = (p.estado_directo && p.estado_directo.minutos) || {};
      Object.entries(minutosPartido).forEach(([jugadorId, segundos]) => {
        if (acumulado[jugadorId]) acumulado[jugadorId].minutos += segundos;
      });

      const titulares = (p.estado_directo && p.estado_directo.titulares) || [];
      Object.keys(acumulado).forEach((jugadorId) => {
        if (titulares.includes(jugadorId)) {
          acumulado[jugadorId].titular++;
        } else if ((((p.estado_directo && p.estado_directo.minutos) || {})[jugadorId]) !== undefined) {
          acumulado[jugadorId].suplente++;
        }
      });
    });

    (eventos || []).forEach((e) => {
      if (!acumulado[e.jugador_id]) return;
      if (e.tipo === "gol") acumulado[e.jugador_id].goles++;
      if (e.tipo === "asistencia") acumulado[e.jugador_id].asistencias++;
      if (e.tipo === "amarilla") acumulado[e.jugador_id].amarillas++;
      if (e.tipo === "roja") acumulado[e.jugador_id].rojas++;
    });
  }

  const cuerpo = document.querySelector("#tablaEstadisticas tbody");
  Object.values(acumulado)
    .sort((a, b) => a.dorsal - b.dorsal)
    .forEach((j) => {
      const fila = document.createElement("tr");
      const mm = Math.floor(j.minutos / 60);
      [j.dorsal, j.nombre, `${mm}'`, j.goles, j.asistencias, j.amarillas, j.rojas, j.titular, j.suplente].forEach((valor) => {
        const celda = document.createElement("td");
        celda.textContent = valor;
        fila.appendChild(celda);
      });
      cuerpo.appendChild(fila);
    });
})();
