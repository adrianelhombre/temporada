async function cargarEstadisticasJugadores() {
  const container = document.getElementById('estadisticasJugadores');
  container.innerHTML = '<p>Cargando estadísticas de jugadores...</p>';

  try {
    const { data: jugadores, error: errorJugadores } = await supabaseClient
      .from("jugadores")
      .select("*")
      .order("dorsal");

    const { data: partidosFinalizados, error: errorPartidos } = await supabaseClient
      .from("partidos")
      .select("id, estado_directo")
      .eq("estado", "finalizado");

    if (errorJugadores || errorPartidos) {
      notificarError(errorJugadores || errorPartidos, "No se pudieron cargar las estadísticas.");
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
        partidosJugados: 0,
        // Para calcular el porcentaje: guardamos los minutos de cada partido
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

        Object.entries(minutosPartido).forEach(([jugadorId, segundos]) => {
          if (acumulado[jugadorId]) {
            const minutosJugados = segundos / 60;
            acumulado[jugadorId].minutos += segundos;
            acumulado[jugadorId].partidosJugados++;
            // Guardamos los minutos jugados en este partido
            acumulado[jugadorId].minutosPorPartido.push({
              minutos: minutosJugados,
              totalPartido: duracionPartido
            });
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

    // Renderizar como tarjetas individuales
    container.innerHTML = '';
    
    const listaJugadores = document.createElement('div');
    listaJugadores.className = 'estadisticas-jugador-container';

    Object.values(acumulado)
      .sort((a, b) => a.dorsal - b.dorsal)
      .forEach((j) => {
        const card = document.createElement('div');
        card.className = 'estadisticas-jugador-fila';
        
        // Nombre y dorsal
        const nombreDiv = document.createElement('div');
        nombreDiv.className = 'estadisticas-jugador-nombre';
        nombreDiv.innerHTML = `
          <span class="estadisticas-jugador-dorsal">${j.dorsal}</span>
          <span class="estadisticas-jugador-nombre-texto">${j.nombre}</span>
        `;
        card.appendChild(nombreDiv);

        // Datos en línea
        const datosDiv = document.createElement('div');
        datosDiv.className = 'estadisticas-jugador-datos';
        
        // Contenedor de tarjetas (solo si tiene alguna)
        if (j.amarillas > 0 || j.rojas > 0) {
          const tarjetasDiv = document.createElement('div');
          tarjetasDiv.className = 'estadisticas-jugador-tarjetas';
          
          // Tarjeta amarilla
          if (j.amarillas > 0) {
            const amarSpan = document.createElement('span');
            amarSpan.className = 'estadisticas-tarjeta-amarilla';
            amarSpan.textContent = j.amarillas;
            tarjetasDiv.appendChild(amarSpan);
          }
          
          // Tarjeta roja
          if (j.rojas > 0) {
            const rojSpan = document.createElement('span');
            rojSpan.className = 'estadisticas-tarjeta-roja';
            rojSpan.textContent = j.rojas;
            tarjetasDiv.appendChild(rojSpan);
          }
          
          datosDiv.appendChild(tarjetasDiv);
        }
        
        // Partidos Jugados
        const pjDiv = document.createElement('div');
        pjDiv.className = 'estadisticas-jugador-item';
        pjDiv.innerHTML = `
          <div class="estadisticas-jugador-valor">${j.partidosJugados}</div>
          <div class="estadisticas-jugador-etiqueta">PJ</div>
        `;
        datosDiv.appendChild(pjDiv);
        
        // Partidos Titular
        const ptDiv = document.createElement('div');
        ptDiv.className = 'estadisticas-jugador-item';
        ptDiv.innerHTML = `
          <div class="estadisticas-jugador-valor">${j.titular}</div>
          <div class="estadisticas-jugador-etiqueta">PT</div>
        `;
        datosDiv.appendChild(ptDiv);
        
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
        
        // Porcentaje: calcular sobre los partidos que ha jugado
        let porcentaje = 0;
        if (j.minutosPorPartido.length > 0) {
          let totalJugado = 0;
          let totalPosible = 0;
          j.minutosPorPartido.forEach(partido => {
            totalJugado += partido.minutos;
            totalPosible += partido.totalPartido;
          });
          porcentaje = totalPosible > 0 ? Math.round((totalJugado / totalPosible) * 100) : 0;
        }
        
        const pctDiv = document.createElement('div');
        pctDiv.className = 'estadisticas-jugador-item-porcentaje';
        pctDiv.innerHTML = `
          <div class="estadisticas-jugador-valor-porcentaje">${porcentaje}%</div>
          <div class="estadisticas-jugador-etiqueta">TIEMPO</div>
        `;
        datosDiv.appendChild(pctDiv);
        
        card.appendChild(datosDiv);
        listaJugadores.appendChild(card);
      });

    container.appendChild(listaJugadores);

    // Añadir resumen de temporada
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