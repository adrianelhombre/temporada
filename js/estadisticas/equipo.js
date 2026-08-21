// ============================================
// ESTADÍSTICAS DE EQUIPO - REFACTORIZADO
// ============================================

// ---------- OBTENER DATOS ----------
async function obtenerDatosPartidos(filtroTipo) {
  let query = supabaseClient
    .from("partidos")
    .select("id, estado_directo, rival, condicion, tipo_partido")
    .eq("estado", "finalizado");
  
  if (filtroTipo !== 'todos') {
    query = query.eq("tipo_partido", filtroTipo);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function obtenerEventos(idsPartidos) {
  const [balsas, rival] = await Promise.all([
    supabaseClient.from("eventos_partido").select("*").in("partido_id", idsPartidos),
    supabaseClient.from("eventos_rival").select("*").in("partido_id", idsPartidos)
  ]);
  
  if (balsas.error) throw balsas.error;
  if (rival.error) throw rival.error;
  
  return { eventosBalsas: balsas.data || [], eventosRival: rival.data || [] };
}

async function obtenerJugadores() {
  const { data, error } = await supabaseClient.from("jugadores").select("id, nombre, dorsal");
  if (error) throw error;
  return data || [];
}

// ---------- CALCULAR ESTADÍSTICAS ----------
function calcularEstadisticasEquipo(partidos, eventosBalsas, eventosRival, jugadores) {
  const stats = {
    partidosJugados: partidos.length,
    ganados: 0,
    empatados: 0,
    perdidos: 0,
    golesFavor: 0,
    golesContra: 0,
    amarillas: 0,
    rojas: 0,
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
  const minutosPorJugador = {};
  const partidosJugadosPorJugador = {};
  
  // Rankings de goleadores y asistentes
  const goleadores = {};
  const asistentes = {};
  const jugadoresMap = {};
  jugadores.forEach(j => {
    jugadoresMap[j.id] = j;
    goleadores[j.id] = 0;
    asistentes[j.id] = 0;
  });

  const idsJugadores = new Set(jugadores.map(j => j.id));

  partidos.forEach(p => {
    const balsasPartido = eventosBalsas.filter(e => e.partido_id === p.id);
    const rivalPartido = eventosRival.filter(e => e.partido_id === p.id);
    
    // Goles
    const golesBalsas = balsasPartido.filter(e => e.tipo === "gol").length;
    const golesRival = rivalPartido.filter(e => e.tipo === "gol").length;
    stats.golesFavor += golesBalsas;
    stats.golesContra += golesRival;
    
    if (golesBalsas > golesRival) stats.ganados++;
    else if (golesBalsas === golesRival) stats.empatados++;
    else stats.perdidos++;

    // Tarjetas Balsas
    stats.amarillas += balsasPartido.filter(e => e.tipo === "amarilla").length;
    stats.rojas += balsasPartido.filter(e => e.tipo === "roja").length;

    // Estadísticas de Balsas
    stats.tirosPuerta += balsasPartido.filter(e => e.tipo === "tiro_puerta_favor").length;
    stats.tirosFuera += balsasPartido.filter(e => e.tipo === "tiro_fuera_favor").length;
    stats.corners += balsasPartido.filter(e => e.tipo === "corner_favor").length;
    stats.fuerasDeJuego += balsasPartido.filter(e => e.tipo === "fuera_juego_favor").length;
    stats.faltas += balsasPartido.filter(e => e.tipo === "falta_favor").length;

    // Estadísticas del Rival
    stats.tirosPuertaRival += rivalPartido.filter(e => e.tipo === "tiro_puerta_contra").length;
    stats.tirosFueraRival += rivalPartido.filter(e => e.tipo === "tiro_fuera_contra").length;
    stats.cornersRival += rivalPartido.filter(e => e.tipo === "corner_contra").length;
    stats.fuerasDeJuegoRival += rivalPartido.filter(e => e.tipo === "fuera_juego_contra").length;
    stats.faltasRival += rivalPartido.filter(e => e.tipo === "falta_contra").length;

    // Goleadores y asistentes
    balsasPartido.forEach(e => {
      if (e.tipo === "gol" && jugadoresMap[e.jugador_id]) {
        goleadores[e.jugador_id] = (goleadores[e.jugador_id] || 0) + 1;
      }
      if (e.tipo === "asistencia" && jugadoresMap[e.jugador_id]) {
        asistentes[e.jugador_id] = (asistentes[e.jugador_id] || 0) + 1;
      }
    });

    // Minutos por partido (para media por partido)
    if (p.estado_directo?.minutos) {
      Object.entries(p.estado_directo.minutos).forEach(([jugadorId, segundos]) => {
        if (idsJugadores.has(jugadorId)) {
          minutosPorJugador[jugadorId] = (minutosPorJugador[jugadorId] || 0) + segundos;
          partidosJugadosPorJugador[jugadorId] = (partidosJugadosPorJugador[jugadorId] || 0) + 1;
          jugadoresParticipantes.add(jugadorId);
        }
      });
    }

    // Jugadores participantes
    if (p.estado_directo?.titulares) {
      p.estado_directo.titulares.forEach(id => jugadoresParticipantes.add(id));
    }
    if (p.estado_directo?.suplentes) {
      p.estado_directo.suplentes.forEach(id => jugadoresParticipantes.add(id));
    }
  });

  // Calcular media de minutos por jugador POR PARTIDO
  let totalMediaPorPartido = 0;
  let jugadoresConMinutos = 0;
  
  Object.keys(minutosPorJugador).forEach(jugadorId => {
    const totalMinutos = minutosPorJugador[jugadorId] / 60;
    const partidosJugados = partidosJugadosPorJugador[jugadorId] || 1;
    const mediaJugador = Math.round(totalMinutos / partidosJugados);
    totalMediaPorPartido += mediaJugador;
    jugadoresConMinutos++;
  });
  
  const mediaMinutosPorJugador = jugadoresConMinutos > 0 
    ? Math.round(totalMediaPorPartido / jugadoresConMinutos) 
    : 0;

  // Crear rankings
  const rankingGoleadores = Object.entries(goleadores)
    .filter(([id, goles]) => goles > 0 && jugadoresMap[id])
    .map(([id, goles]) => ({
      id,
      nombre: jugadoresMap[id].nombre,
      dorsal: jugadoresMap[id].dorsal,
      goles
    }))
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 5);

  const rankingAsistentes = Object.entries(asistentes)
    .filter(([id, asistencias]) => asistencias > 0 && jugadoresMap[id])
    .map(([id, asistencias]) => ({
      id,
      nombre: jugadoresMap[id].nombre,
      dorsal: jugadoresMap[id].dorsal,
      asistencias
    }))
    .sort((a, b) => b.asistencias - a.asistencias)
    .slice(0, 5);

  return {
    stats,
    jugadoresParticipantes: jugadoresParticipantes.size,
    mediaMinutosPorJugador,
    rankingGoleadores,
    rankingAsistentes
  };
}

// ---------- RENDERIZAR ----------
function renderizarBloquePrincipal(stats) {
  const diferencia = stats.golesFavor - stats.golesContra;
  const colorDiferencia = diferencia >= 0 ? '#22c55e' : '#F44336';
  const signoDiferencia = diferencia >= 0 ? '+' : '';

  return `
    <div style="display: flex; align-items: center; gap: 2rem; padding: 0.5rem 0; margin-bottom: 1.5rem; border-bottom: 2px solid var(--borde);">
      <!-- PARTIDOS -->
      <div style="display: flex; align-items: center; gap: 1.5rem; flex: 1;">
        <div style="text-align: center; flex-shrink: 0;">
          <div style="font-size: 3rem; font-weight: 800; color: var(--negro); line-height: 1;">${stats.partidosJugados}</div>
          <div style="font-size: 0.7rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Partidos</div>
        </div>
        <div style="display: flex; gap: 1.5rem;">
          <div style="text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 700; color: #4CAF50;">${stats.ganados}</div>
            <div style="font-size: 0.6rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Ganados</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 700; color: #FFC107;">${stats.empatados}</div>
            <div style="font-size: 0.6rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Empatados</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.8rem; font-weight: 700; color: #F44336;">${stats.perdidos}</div>
            <div style="font-size: 0.6rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Perdidos</div>
          </div>
        </div>
      </div>

      <!-- SEPARADOR -->
      <div style="width: 2px; height: 60px; background: var(--borde); flex-shrink: 0;"></div>

      <!-- GOLES -->
      <div style="display: flex; align-items: center; gap: 1rem; flex: 1; justify-content: flex-end;">
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--negro);">${stats.golesFavor}</div>
          <div style="font-size: 0.6rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Goles Favor</div>
        </div>
        <div style="text-align: center; flex-shrink: 0; min-width: 60px;">
          <div style="font-size: 2.2rem; font-weight: 800; color: ${colorDiferencia}; line-height: 1;">
            ${signoDiferencia}${diferencia}
          </div>
          <div style="font-size: 0.6rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Diferencia</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--negro);">${stats.golesContra}</div>
          <div style="font-size: 0.6rem; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Goles Contra</div>
        </div>
      </div>
    </div>
  `;
}

function renderizarRanking(jugadores, titulo, tipo) {
  if (jugadores.length === 0) {
    return `
      <div style="flex: 1; text-align: center; padding: 0.5rem 0;">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">${titulo}</div>
        <div style="font-size: 0.8rem; color: var(--texto-secundario);">Sin datos</div>
      </div>
    `;
  }

  const maxValue = tipo === 'goles' 
    ? Math.max(...jugadores.map(j => j.goles)) 
    : Math.max(...jugadores.map(j => j.asistencias));

  const items = jugadores.map((j, index) => {
    const value = tipo === 'goles' ? j.goles : j.asistencias;
    const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const color = tipo === 'goles' ? '#22c55e' : '#3b82f6';
    const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

    return `
      <div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;">
        <span style="font-size: 0.7rem; font-weight: 700; min-width: 24px; color: var(--texto-secundario);">${medalla}</span>
        <span style="font-size: 0.75rem; font-weight: 600; min-width: 28px; text-align: center; background: #333; color: #fff; padding: 1px 0; border-radius: 4px;">${j.dorsal}</span>
        <span style="font-size: 0.75rem; font-weight: 500; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${j.nombre}</span>
        <span style="font-size: 0.8rem; font-weight: 700; color: ${color}; min-width: 20px; text-align: right;">${value}</span>
      </div>
    `;
  }).join('');

  return `
    <div style="flex: 1; padding: 0.5rem 0;">
      <div style="font-size: 0.8rem; font-weight: 700; color: var(--texto-secundario); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem; text-align: center;">${titulo}</div>
      ${items}
    </div>
  `;
}

function renderizarBloqueRankings(rankingGoleadores, rankingAsistentes) {
  return `
    <div style="display: flex; gap: 2rem; padding: 0.5rem 0; margin-bottom: 1.5rem; border-bottom: 2px solid var(--borde);">
      ${renderizarRanking(rankingGoleadores, '⚽ Máximos Goleadores', 'goles')}
      <div style="width: 2px; height: auto; background: var(--borde); flex-shrink: 0;"></div>
      ${renderizarRanking(rankingAsistentes, '🅰️ Máximos Asistentes', 'asistencias')}
    </div>
  `;
}

function renderizarBloqueResto(stats, mediaMinutos, jugadoresUsados) {
  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; text-align: center; padding: 0.5rem 0;">
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
        <div class="estadisticas-equipo-valor" style="color: #F44336;">${stats.tirosPuertaRival}</div>
        <div class="estadisticas-equipo-etiqueta">TP Rival</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor" style="color: #F44336;">${stats.tirosFueraRival}</div>
        <div class="estadisticas-equipo-etiqueta">TF Rival</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor">${stats.corners}</div>
        <div class="estadisticas-equipo-etiqueta">Corners Balsas</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor" style="color: #F44336;">${stats.cornersRival}</div>
        <div class="estadisticas-equipo-etiqueta">Corners Rival</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor">${stats.fuerasDeJuego}</div>
        <div class="estadisticas-equipo-etiqueta">FJ Balsas</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor" style="color: #F44336;">${stats.fuerasDeJuegoRival}</div>
        <div class="estadisticas-equipo-etiqueta">FJ Rival</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor">${stats.faltas}</div>
        <div class="estadisticas-equipo-etiqueta">Faltas Balsas</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor" style="color: #F44336;">${stats.faltasRival}</div>
        <div class="estadisticas-equipo-etiqueta">Faltas Rival</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor">${mediaMinutos}'</div>
        <div class="estadisticas-equipo-etiqueta">Media Min/Jug</div>
      </div>
      <div>
        <div class="estadisticas-equipo-valor">${jugadoresUsados}</div>
        <div class="estadisticas-equipo-etiqueta">Jugadores Usados</div>
      </div>
    </div>
  `;
}

// ---------- FUNCIÓN PRINCIPAL ----------
async function cargarEstadisticasEquipo(filtroTipo = 'todos') {
  const container = document.getElementById('estadisticasEquipo');
  container.innerHTML = '<p>Cargando estadísticas de equipo...</p>';

  try {
    // Obtener datos
    const partidos = await obtenerDatosPartidos(filtroTipo);
    
    if (partidos.length === 0) {
      container.innerHTML = '<p class="estadisticas-vacio">No hay partidos finalizados con este filtro.</p>';
      return;
    }

    const idsPartidos = partidos.map(p => p.id);
    const [eventos, jugadores] = await Promise.all([
      obtenerEventos(idsPartidos),
      obtenerJugadores()
    ]);

    // Calcular estadísticas
    const { stats, jugadoresParticipantes, mediaMinutosPorJugador, rankingGoleadores, rankingAsistentes } = 
      calcularEstadisticasEquipo(partidos, eventos.eventosBalsas, eventos.eventosRival, jugadores);

    // Renderizar
    const html = `
      ${renderizarBloquePrincipal(stats)}
      ${renderizarBloqueRankings(rankingGoleadores, rankingAsistentes)}
      ${renderizarBloqueResto(stats, mediaMinutosPorJugador, jugadoresParticipantes)}
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p style="color: red;">Error al cargar las estadísticas de equipo</p>';
  }
}