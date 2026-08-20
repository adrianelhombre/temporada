async function cargarEstadisticasJugadores(filtroTipo = 'todos') {
  const container = document.getElementById('estadisticasJugadores');
  container.innerHTML = '<p>Cargando estadísticas de jugadores...</p>';

  try {
    const { data: jugadores, error: errorJugadores } = await supabaseClient
      .from("jugadores")
      .select("*")
      .order("dorsal");

    if (errorJugadores) {
      notificarError(errorJugadores, "No se pudieron cargar los jugadores.");
      return;
    }

    // Construir query con filtro
    let query = supabaseClient
      .from("partidos")
      .select("id, estado_directo, convocados, tipo_partido")
      .eq("estado", "finalizado");
    
    if (filtroTipo !== 'todos') {
      query = query.eq("tipo_partido", filtroTipo);
    }
    
    const { data: partidosFinalizados, error: errorPartidos } = await query;

    if (errorPartidos) {
      notificarError(errorPartidos, "No se pudieron cargar las estadísticas.");
      return;
    }

    if (partidosFinalizados.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:var(--texto-secundario);">No hay partidos finalizados con este filtro.</p>';
      return;
    }

    const idsPartidos = partidosFinalizados.map(p => p.id);
    const acumulado = {};

    jugadores.forEach(j => {
      acumulado[j.id] = {
        dorsal: j.dorsal,
        nombre: j.nombre,
        minutos: 0,
        goles: 0,
        asistencias: 0,
        amarillas: 0,
        rojas: 0,
        titular: 0,
        suplente: 0,
        partidosConvocados: 0,
        partidosJugados: 0,
        minutosPorPartido: []
      };
    });

    if (idsPartidos.length > 0) {
      const { data: eventos, error: errorEventos } = await supabaseClient
        .from("eventos_partido")
        .select("*")
        .in("partido_id", idsPartidos);

      if (errorEventos) {
        notificarError(errorEventos, "No se pudieron calcular las estadísticas.");
        return;
      }

      partidosFinalizados.forEach(p => {
        const minutosPartido = p.estado_directo?.minutos || {};
        const titulares = p.estado_directo?.titulares || [];
        const suplentes = p.estado_directo?.suplentes || [];
        const duracionPartido = p.estado_directo?.duracion_partido || 70;
        const convocados = p.convocados || [];

        convocados.forEach(jugadorId => {
          if (acumulado[jugadorId]) {
            acumulado[jugadorId].partidosConvocados++;
            const minutosJugados = (minutosPartido[jugadorId] || 0) / 60;
            acumulado[jugadorId].minutosPorPartido.push({
              minutosJugados: minutosJugados,
              totalPartido: duracionPartido
            });
          }
        });

        Object.entries(minutosPartido).forEach(([jugadorId, segundos]) => {
          if (acumulado[jugadorId]) {
            acumulado[jugadorId].minutos += segundos;
            acumulado[jugadorId].partidosJugados++;
          }
        });

        titulares.forEach(id => {
          if (acumulado[id]) {
            acumulado[id].titular++;
          }
        });

        suplentes.forEach(id => {
          if (acumulado[id]) {
            acumulado[id].suplente++;
          }
        });
      });

      eventos.forEach(e => {
        if (!acumulado[e.jugador_id]) return;
        if (e.tipo === "gol") acumulado[e.jugador_id].goles++;
        if (e.tipo === "asistencia") acumulado[e.jugador_id].asistencias++;
        if (e.tipo === "amarilla") acumulado[e.jugador_id].amarillas++;
        if (e.tipo === "roja") acumulado[e.jugador_id].rojas++;
      });
    }

    // Renderizar
    container.innerHTML = '';
    
    const listaJugadores = document.createElement('div');
    listaJugadores.className = 'estadisticas-jugador-container';

    Object.values(acumulado)
      .sort((a, b) => a.dorsal - b.dorsal)
      .forEach((j) => {
        const card = document.createElement('div');
        card.className = 'estadisticas-jugador-fila';
        
        const nombreDiv = document.createElement('div');
        nombreDiv.className = 'estadisticas-jugador-nombre';
        nombreDiv.innerHTML = `
          <span class="estadisticas-jugador-dorsal">${j.dorsal}</span>
          <span class="estadisticas-jugador-nombre-texto">${j.nombre}</span>
        `;
        card.appendChild(nombreDiv);

        const datosDiv = document.createElement('div');
        datosDiv.className = 'estadisticas-jugador-datos';
        
        if (j.amarillas > 0 || j.rojas > 0) {
          const tarjetasDiv = document.createElement('div');
          tarjetasDiv.className = 'estadisticas-jugador-tarjetas';
          
          if (j.amarillas > 0) {
            const amarSpan = document.createElement('span');
            amarSpan.className = 'estadisticas-tarjeta-amarilla';
            amarSpan.textContent = j.amarillas;
            tarjetasDiv.appendChild(amarSpan);
          }
          
          if (j.rojas > 0) {
            const rojSpan = document.createElement('span');
            rojSpan.className = 'estadisticas-tarjeta-roja';
            rojSpan.textContent = j.rojas;
            tarjetasDiv.appendChild(rojSpan);
          }
          
          datosDiv.appendChild(tarjetasDiv);
        }
        
        // PC: Partidos Convocados
        const pcDiv = document.createElement('div');
        pcDiv.className = 'estadisticas-jugador-item';
        pcDiv.innerHTML = `
          <div class="estadisticas-jugador-valor">${j.partidosConvocados}</div>
          <div class="estadisticas-jugador-etiqueta">PC</div>
        `;
        datosDiv.appendChild(pcDiv);
        
        // PT: Partidos Titular (número simple)
        const ptDiv = document.createElement('div');
        ptDiv.className = 'estadisticas-jugador-item';
        ptDiv.innerHTML = `
          <div class="estadisticas-jugador-valor">${j.titular}</div>
          <div class="estadisticas-jugador-etiqueta">PT</div>
        `;
        datosDiv.appendChild(ptDiv);
        
        // % TIT: porcentaje de titularidad (con ancho fijo)
        const pctTitDiv = document.createElement('div');
        pctTitDiv.className = 'estadisticas-jugador-item-porcentaje';
        const pctTitularidad = j.partidosConvocados > 0 
          ? Math.round((j.titular / j.partidosConvocados) * 100) 
          : 0;
        pctTitDiv.innerHTML = `
          <div class="estadisticas-jugador-valor-porcentaje" style="color: var(--amarillo);">${pctTitularidad}%</div>
          <div class="estadisticas-jugador-etiqueta">% TIT</div>
        `;
        datosDiv.appendChild(pctTitDiv);
        
        // Goles
        const golDiv = document.createElement('div');
        golDiv.className = 'estadisticas-jugador-item';
        golDiv.innerHTML = `
          <div class="estadisticas-jugador-valor-goles">${j.goles}</div>
          <div class="estadisticas-jugador-etiqueta">G</div>
        `;
        datosDiv.appendChild(golDiv);
        
        // Asistencias
        const asisDiv = document.createElement('div');
        asisDiv.className = 'estadisticas-jugador-item';
        asisDiv.innerHTML = `
          <div class="estadisticas-jugador-valor">${j.asistencias}</div>
          <div class="estadisticas-jugador-etiqueta">A</div>
        `;
        datosDiv.appendChild(asisDiv);

        // Minutos
        const mins = Math.floor(j.minutos / 60);
        const minDiv = document.createElement('div');
        minDiv.className = 'estadisticas-jugador-item-minutos';
        minDiv.innerHTML = `
          <div class="estadisticas-jugador-valor">${mins}'</div>
          <div class="estadisticas-jugador-etiqueta">MIN</div>
        `;
        datosDiv.appendChild(minDiv);
        
        // Porcentaje de tiempo jugado (sobre convocados)
        let porcentajeTiempo = 0;
        if (j.minutosPorPartido.length > 0) {
          let totalJugado = 0;
          let totalPosible = 0;
          j.minutosPorPartido.forEach(partido => {
            totalJugado += partido.minutosJugados;
            totalPosible += partido.totalPartido;
          });
          porcentajeTiempo = totalPosible > 0 ? Math.round((totalJugado / totalPosible) * 100) : 0;
        }
        
        const pctDiv = document.createElement('div');
        pctDiv.className = 'estadisticas-jugador-item-porcentaje';
        pctDiv.innerHTML = `
          <div class="estadisticas-jugador-valor-porcentaje" style="color: var(--amarillo);">${porcentajeTiempo}%</div>
          <div class="estadisticas-jugador-etiqueta">TIEMPO</div>
        `;
        datosDiv.appendChild(pctDiv);
        
        card.appendChild(datosDiv);
        listaJugadores.appendChild(card);
      });

    container.appendChild(listaJugadores);

    const resumen = document.createElement('div');
    resumen.className = 'estadisticas-resumen';
    resumen.innerHTML = `
      <strong>Temporada:</strong> ${partidosFinalizados.length} partidos | 
      <strong>Jugadores:</strong> ${jugadores.length}
    `;
    container.appendChild(resumen);

  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p style="color:red;">Error al cargar las estadísticas</p>';
  }
}