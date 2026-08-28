// ============================================================
// PID - PLAN INDIVIDUAL DE DESARROLLO
// ============================================================

// ---------- OBTENER OBJETIVOS DE UN JUGADOR ----------
async function obtenerObjetivos(jugadorId, temporadaId) {
  try {
    const { data: objetivos, error: errorObj } = await supabaseClient
      .from('objetivos_pid')
      .select('*')
      .eq('jugador_id', jugadorId)
      .eq('temporada_id', temporadaId)
      .order('fecha_inicio', { ascending: false });

    if (errorObj) throw errorObj;

    if (!objetivos || objetivos.length === 0) {
      return [];
    }

    const ids = objetivos.map(o => o.id);
    const { data: seguimientos, error: errorSeg } = await supabaseClient
      .from('seguimiento_pid')
      .select('*')
      .in('objetivo_id', ids)
      .order('fecha', { ascending: true });

    if (errorSeg) throw errorSeg;

    const resultado = objetivos.map(obj => {
      const seguimientosObj = (seguimientos || []).filter(s => s.objetivo_id === obj.id);
      let progreso = 0;
      if (seguimientosObj.length > 0) {
        progreso = seguimientosObj[seguimientosObj.length - 1].progreso;
      }
      return {
        ...obj,
        seguimientos: seguimientosObj,
        progreso: progreso
      };
    });

    return resultado;

  } catch (error) {
    console.error('Error al obtener objetivos:', error);
    return [];
  }
}

// ---------- CREAR OBJETIVO ----------
async function crearObjetivoCompleto(jugadorId, temporadaId, categoria, titulo, descripcion, fechaInicio, fechaRevision) {
  try {
    const { data, error } = await supabaseClient
      .from('objetivos_pid')
      .insert({
        jugador_id: jugadorId,
        temporada_id: temporadaId,
        categoria: categoria,
        titulo: titulo,
        descripcion: descripcion || '',
        fecha_inicio: fechaInicio,
        fecha_revision: fechaRevision || null,
        estado: 'activo'
      })
      .select()
      .single();

    if (error) throw error;

    const { error: errorSeg } = await supabaseClient
      .from('seguimiento_pid')
      .insert({
        objetivo_id: data.id,
        progreso: 0,
        observaciones: 'Objetivo creado',
        fecha: fechaInicio
      });

    if (errorSeg) throw errorSeg;

    return { success: true, objetivo: data };

  } catch (error) {
    console.error('Error al crear objetivo:', error);
    return { success: false, error: error.message };
  }
}

// ---------- GUARDAR SEGUIMIENTO ----------
async function guardarSeguimientoCompleto(objetivoId, progreso, observaciones, fecha) {
  try {
    const { data, error } = await supabaseClient
      .from('seguimiento_pid')
      .insert({
        objetivo_id: objetivoId,
        progreso: progreso,
        observaciones: observaciones || '',
        fecha: fecha
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, seguimiento: data };

  } catch (error) {
    console.error('Error al guardar seguimiento:', error);
    return { success: false, error: error.message };
  }
}

// ---------- ACTUALIZAR ESTADO OBJETIVO ----------
async function actualizarEstadoObjetivoCompleto(objetivoId, nuevoEstado) {
  try {
    // 1. Actualizar el estado en la tabla objetivos_pid
    const { error } = await supabaseClient
      .from('objetivos_pid')
      .update({ estado: nuevoEstado })
      .eq('id', objetivoId);

    if (error) throw error;

    // 2. Si se completa, añadir seguimiento automático con 100%
    if (nuevoEstado === 'conseguido') {
      const fecha = new Date().toISOString().split('T')[0];
      const resultado = await guardarSeguimientoCompleto(objetivoId, 100, '✅ Objetivo completado', fecha);
      if (!resultado.success) {
        console.warn('No se pudo guardar el seguimiento automático:', resultado.error);
        // No fallamos la operación principal si el seguimiento falla
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error al actualizar estado:', error);
    return { success: false, error: error.message };
  }
}

// ---------- ELIMINAR OBJETIVO ----------
async function eliminarObjetivoCompleto(objetivoId) {
  try {
    const { error } = await supabaseClient
      .from('objetivos_pid')
      .delete()
      .eq('id', objetivoId);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error('Error al eliminar objetivo:', error);
    return { success: false, error: error.message };
  }
}