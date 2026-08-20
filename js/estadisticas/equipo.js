async function cargarEstadisticasEquipo(filtroTipo = 'todos') {
  const container = document.getElementById('estadisticasEquipo');
  container.innerHTML = '<p>Cargando estadísticas de equipo...</p>';

  try {
    // Construir query con filtro
    let query = supabaseClient
      .from("partidos")
      .select("id, estado_directo, rival, condicion, tipo_partido")
      .eq("estado", "finalizado");
    
    if (filtroTipo !== 'todos') {
      query = query.eq("tipo_partido", filtroTipo);
    }
    
    const { data: partidosFinalizados, error: errorPartidos } = await query;

    if (errorPartidos) {
      notificarError(errorPartidos, "No se pudieron cargar las estadísticas de equipo.");
      return;
    }

    if (partidosFinalizados.length === 0) {
      container.innerHTML = '<p class="estadisticas-vacio">No hay partidos finalizados con este filtro.</p>';
      return;
    }

    const idsPartidos = partidosFinalizados.map(p => p.id);

    // Obtener eventos de Balsas
    const { data: eventosBalsas, error: errorEventosBalsas } = await supabaseClient
      .from("eventos_partido")
      .select("*")
      .in("partido_id", idsPartidos);

    if (errorEventosBalsas) {
      notificarError(errorEventosBalsas, "No se pudieron cargar los eventos de Balsas.");
      return;
    }

    // Obtener eventos del rival
    const { data: eventosRival, error: errorEventosRival } = await supabaseClient
      .from("eventos_rival")
      .select("*")
      .in("partido_id", idsPartidos);

    if (errorEventosRival) {
      notificarError(errorEventosRival, "No se pudieron cargar los eventos del rival.");
      return;
    }

    // Obtener jugadores de Balsas para identificar goles a favor
    const { data: jugadores, error: errorJugadores } = await supabaseClient
      .from("jugadores")
      .select("id");

    if (errorJugadores) {
      notificarError(errorJugadores, "No se pudieron cargar los jugadores.");
      return;
    }

    const idsJugadoresBalsas = new Set(jugadores.map(j => j.id));

    // Estadísticas del equipo Balsas
    const stats = {
      partidosJugados: partidosFinalizados.length,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      golesFavor: 0,
      golesContra: 0,
      amarillas: 0,
      rojas: 0,
      minutosJugados: 0,
      tirosPuerta: 0,
      tirosFuera: 0,
      corners: 0,
      fuerasDeJuego: 0,
      faltas: 0,
      tirosPuertaRival: 0,
      tirosFueraRival: 0,
      cornersRival: 0,
      fuerasDeJuegoRival: 0,
      faltasRival: 0
    };

    const jugadoresParticipantes = new Set();

    partidosFinalizados.forEach(p => {
      const eventosBalsasPartido = eventosBalsas.filter(e => e.partido_id === p.id);
      const eventosRivalPartido = eventosRival.filter(e => e.partido_id === p.id);
      
      // GOLES
      const golesBalsas = eventosBalsasPartido.filter(e => e.tipo === "gol").length;
      const golesRival = eventosRivalPartido.filter(e => e.tipo === "gol").length;

      stats.golesFavor += golesBalsas;
      stats.golesContra += golesRival;

      if (golesBalsas > golesRival) stats.ganados++;
      else if (golesBalsas === golesRival) stats.empatados++;
      else stats.perdidos++;

      // TARJETAS DE BALSAS
      stats.amarillas += eventosBalsasPartido.filter(e => e.tipo === "amarilla").length;
      stats.rojas += eventosBalsasPartido.filter(e => e.tipo === "roja").length;

      // ESTADÍSTICAS DE BALSAS
      stats.tirosPuerta += eventosBalsasPartido.filter(e => e.tipo === "tiro_puerta_favor").length;
      stats.tirosFuera += eventosBalsasPartido.filter(e => e.tipo === "tiro_fuera_favor").length;
      stats.corners += eventosBalsasPartido.filter(e => e.tipo === "corner_favor").length;
      stats.fuerasDeJuego += eventosBalsasPartido.filter(e => e.tipo === "fuera_juego_favor").length;
      stats.faltas += eventosBalsasPartido.filter(e => e.tipo === "falta_favor").length;

      // ESTADÍSTICAS DEL RIVAL
      stats.tirosPuertaRival += eventosRivalPartido.filter(e => e.tipo === "tiro_puerta_contra").length;
      stats.tirosFueraRival += eventosRivalPartido.filter(e => e.tipo === "tiro_fuera_contra").length;
      stats.cornersRival += eventosRivalPartido.filter(e => e.tipo === "corner_contra").length;
      stats.fuerasDeJuegoRival += eventosRivalPartido.filter(e => e.tipo === "fuera_juego_contra").length;
      stats.faltasRival += eventosRivalPartido.filter(e => e.tipo === "falta_contra").length;

      // Minutos jugados
      if (p.estado_directo?.minutos) {
        const minutosPartido = Object.values(p.estado_directo.minutos);
        const segundosTotales = minutosPartido.reduce((sum, seg) => sum + seg, 0);
        stats.minutosJugados += Math.floor(segundosTotales / 60);
      }

      // Jugadores participantes
      if (p.estado_directo?.titulares) {
        p.estado_directo.titulares.forEach(id => jugadoresParticipantes.add(id));
      }
      if (p.estado_directo?.suplentes) {
        p.estado_directo.suplentes.forEach(id => jugadoresParticipantes.add(id));
      }
    });

    // Renderizar estadísticas usando clases CSS
    const html = `
      <div class="estadisticas-equipo-grid">
        <div>
          <div class="estadisticas-equipo-valor">${stats.partidosJugados}</div>
          <div class="estadisticas-equipo-etiqueta">Partidos</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-ganados">${stats.ganados}</div>
          <div class="estadisticas-equipo-etiqueta">Ganados</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-empatados">${stats.empatados}</div>
          <div class="estadisticas-equipo-etiqueta">Empatados</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-perdidos">${stats.perdidos}</div>
          <div class="estadisticas-equipo-etiqueta">Perdidos</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor">${stats.golesFavor}</div>
          <div class="estadisticas-equipo-etiqueta">Goles Favor</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-perdidos">${stats.golesContra}</div>
          <div class="estadisticas-equipo-etiqueta">Goles Contra</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-amarillas">${stats.amarillas}</div>
          <div class="estadisticas-equipo-etiqueta">🟨 Amarillas</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-rojas">${stats.rojas}</div>
          <div class="estadisticas-equipo-etiqueta">🟥 Rojas</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor">${stats.tirosPuerta}</div>
          <div class="estadisticas-equipo-etiqueta">TP Balsas</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor">${stats.tirosFuera}</div>
          <div class="estadisticas-equipo-etiqueta">TF Balsas</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-perdidos">${stats.tirosPuertaRival}</div>
          <div class="estadisticas-equipo-etiqueta">TP Rival</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-perdidos">${stats.tirosFueraRival}</div>
          <div class="estadisticas-equipo-etiqueta">TF Rival</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor">${stats.corners}</div>
          <div class="estadisticas-equipo-etiqueta">Corners Balsas</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-perdidos">${stats.cornersRival}</div>
          <div class="estadisticas-equipo-etiqueta">Corners Rival</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor">${stats.fuerasDeJuego}</div>
          <div class="estadisticas-equipo-etiqueta">FJ Balsas</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-perdidos">${stats.fuerasDeJuegoRival}</div>
          <div class="estadisticas-equipo-etiqueta">FJ Rival</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor">${stats.faltas}</div>
          <div class="estadisticas-equipo-etiqueta">Faltas Balsas</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor-perdidos">${stats.faltasRival}</div>
          <div class="estadisticas-equipo-etiqueta">Faltas Rival</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor">${Math.round(stats.minutosJugados / stats.partidosJugados || 0)}'</div>
          <div class="estadisticas-equipo-etiqueta">Media Min/Jug</div>
        </div>
        <div>
          <div class="estadisticas-equipo-valor">${jugadoresParticipantes.size}</div>
          <div class="estadisticas-equipo-etiqueta">Jugadores Usados</div>
        </div>
      </div>
      <div class="estadisticas-equipo-diferencia">
        Diferencia de goles: ${stats.golesFavor - stats.golesContra}
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p style="color: red;">Error al cargar las estadísticas de equipo</p>';
  }
}