// ---------- Bloques de cambios ----------

// Obtiene el estado (huecos) justo antes de un bloque
function obtenerEstadoAntesDeBloque(bloqueId) {
  // 1. Obtener todos los bloques ordenados cronológicamente
  const bloquesMap = {};
  sustituciones.forEach(s => {
    if (!bloquesMap[s.bloque_id]) bloquesMap[s.bloque_id] = [];
    bloquesMap[s.bloque_id].push(s);
  });
  
  const bloquesOrdenados = [];
  for (const [bid, lista] of Object.entries(bloquesMap)) {
    lista.sort((a, b) => a.bloque_orden - b.bloque_orden);
    const primero = lista[0];
    bloquesOrdenados.push({
      bloque_id: bid,
      segundo: primero.segundo,
      sustituciones: lista
    });
  }
  bloquesOrdenados.sort((a, b) => a.segundo - b.segundo);

  // 2. Encontrar el índice del bloque a borrar
  const index = bloquesOrdenados.findIndex(b => b.bloque_id === bloqueId);
  if (index === -1) {
    console.error('[obtenerEstadoAntesDeBloque] Bloque no encontrado:', bloqueId);
    return null;
  }

  // 3. Estado inicial: usar los huecos actuales (si no hay titulares)
  // o reconstruir desde titulares si existen
  let estado = {
    huecos: {}
  };

  // Si hay titulares guardados, usarlos como base
  if (estadoDirecto.titulares && estadoDirecto.titulares.length > 0) {
    const slots = Object.keys(estadoDirecto.huecos);
    const titulares = estadoDirecto.titulares.filter(id => id !== null && id !== undefined);
    for (let i = 0; i < slots.length; i++) {
      estado.huecos[slots[i]] = i < titulares.length ? titulares[i] : null;
    }
    console.log('[obtenerEstadoAntesDeBloque] Usando titulares como base:', titulares);
  } else {
    // Si no hay titulares, usar los huecos actuales como base
    // Pero los huecos actuales ya tienen los cambios aplicados, 
    // así que esto es un fallback
    estado.huecos = { ...estadoDirecto.huecos };
    console.log('[obtenerEstadoAntesDeBloque] Usando huecos actuales como base (sin titulares)');
  }

  // 4. Aplicar SOLO los bloques ANTERIORES al que queremos borrar
  console.log(`[obtenerEstadoAntesDeBloque] Aplicando ${index} bloques anteriores al bloque ${bloqueId}`);
  for (let i = 0; i < index; i++) {
    const bloque = bloquesOrdenados[i];
    console.log(`[obtenerEstadoAntesDeBloque] Aplicando bloque ${bloque.bloque_id} (segundo ${bloque.segundo})`);
    for (const s of bloque.sustituciones) {
      // Buscar al jugador que sale en el estado actual
      let slotSale = null;
      for (const [slotId, jugadorId] of Object.entries(estado.huecos)) {
        if (jugadorId === s.jugador_sale) {
          slotSale = slotId;
          break;
        }
      }
      if (slotSale) {
        estado.huecos[slotSale] = s.jugador_entra;
        console.log(`  ${s.jugador_sale} → ${s.jugador_entra} en slot ${slotSale}`);
      } else {
        console.warn(`[obtenerEstadoAntesDeBloque] No se encontró al jugador ${s.jugador_sale} en el campo`);
      }
    }
  }

  console.log('[obtenerEstadoAntesDeBloque] Estado final:', estado.huecos);
  return estado;
}

// ---------- Borrar bloque ----------
function borrarBloque(bloqueId, momentoOriginal) {
  mostrarConfirmacion(
    "¿Borrar este bloque de cambios? Se restaurará la alineación anterior y se ajustarán los minutos.",
    async () => {
      cerrarConfirmacion();

      console.log('[borrarBloque] Iniciando borrado del bloque:', bloqueId);

      // 1. Obtener las sustituciones del bloque
      const sustitucionesBloque = sustituciones.filter(s => s.bloque_id === bloqueId);
      if (sustitucionesBloque.length === 0) {
        mostrarNotificacion("No se encontraron sustituciones para este bloque.", "error");
        return;
      }
      sustitucionesBloque.sort((a, b) => a.bloque_orden - b.bloque_orden);
      console.log('[borrarBloque] Sustituciones del bloque:', sustitucionesBloque);

      // 2. Obtener el estado anterior a este bloque
      const estadoAnterior = obtenerEstadoAntesDeBloque(bloqueId);
      if (!estadoAnterior) {
        notificarError("No se pudo reconstruir el estado anterior.", "error");
        return;
      }

      // 3. Guardar los huecos actuales para comparar después
      const huecosAntes = { ...estadoDirecto.huecos };
      console.log('[borrarBloque] Huecos antes:', huecosAntes);
      console.log('[borrarBloque] Estado anterior a restaurar:', estadoAnterior.huecos);

      // 4. Calcular el tiempo transcurrido desde cada cambio
      const segundoActual = Math.floor(segundosMarcador());
      const parteActual = estadoDirecto.parte;
      const duracionParte = (partido && partido.duracion_parte_minutos) || 0;

      // 5. Ajustar minutos: restar al entrante, sumar al sale
      for (const s of sustitucionesBloque) {
        const jugadorSale = s.jugador_sale;
        const jugadorEntra = s.jugador_entra;
        const segundoCambio = s.segundo;

        let tiempoTranscurrido = segundoActual - segundoCambio;
        if (s.parte === 1 && parteActual === 2) {
          tiempoTranscurrido += duracionParte * 60;
        }
        tiempoTranscurrido = Math.max(0, tiempoTranscurrido);

        // Verificar si el entrante está en el campo AHORA
        const entraEnCampo = Object.values(estadoDirecto.huecos).includes(jugadorEntra);
        if (entraEnCampo && tiempoTranscurrido > 0) {
          const minutosEntra = estadoDirecto.minutos[jugadorEntra] || 0;
          const minutosSale = estadoDirecto.minutos[jugadorSale] || 0;
          
          estadoDirecto.minutos[jugadorEntra] = Math.max(0, minutosEntra - tiempoTranscurrido);
          estadoDirecto.minutos[jugadorSale] = minutosSale + tiempoTranscurrido;
          
          console.log(`[borrarBloque] Ajuste: ${jugadorEntra} pierde ${tiempoTranscurrido}s, ${jugadorSale} gana ${tiempoTranscurrido}s`);
        }
      }

      // 6. Restaurar la alineación anterior
      estadoDirecto.huecos = estadoAnterior.huecos;
      console.log('[borrarBloque] Huecos restaurados:', estadoDirecto.huecos);

      // 7. Eliminar de la base de datos
      const { error: errSust } = await supabaseClient
        .from("sustituciones")
        .delete()
        .eq("partido_id", partidoId)
        .eq("bloque_id", bloqueId);
      if (errSust) {
        notificarError(errSust, "Error al borrar sustituciones.");
        return;
      }

      const { error: errEv } = await supabaseClient
        .from("eventos_partido")
        .delete()
        .eq("partido_id", partidoId)
        .eq("momento", momentoOriginal)
        .in("tipo", ["sale", "entra"]);
      if (errEv) {
        notificarError(errEv, "Error al borrar eventos.");
        return;
      }

      // 8. Guardar y recargar
      await persistirEstadoDirecto();
      await cargarEventos();
      pintarTodo();
      abrirHistorial();
      mostrarNotificacion("Bloque de cambios eliminado. Alineación y minutos restaurados.", "exito");
    }
  );
}

// ---------- Edición de bloques (desactivada) ----------
let bloqueEditando = null;

function abrirEdicionBloque(bloqueId, momentoOriginal) {
  mostrarNotificacion("La edición de cambios no está disponible.", "error");
}

function renderizarListaCambios(lista) {
  // No se usa
}

async function guardarEdicionCambio() {
  // No se usa
}

function anadirFilaCambio() {
  // No se usa
}