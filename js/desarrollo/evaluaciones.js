// ============================================================
// EVALUACIONES - SERVICIOS DE BASE DE DATOS
// ============================================================

// ---------- OBTENER EVALUACIONES DE UN JUGADOR ----------
async function obtenerEvaluaciones(jugadorId, temporadaId) {
  try {
    // Obtener evaluaciones
    const { data: evaluaciones, error: errorEval } = await supabaseClient
      .from('evaluaciones')
      .select('*')
      .eq('jugador_id', jugadorId)
      .eq('temporada_id', temporadaId)
      .order('trimestre');

    if (errorEval) throw errorEval;

    if (!evaluaciones || evaluaciones.length === 0) {
      return [];
    }

    // Obtener notas de todas las evaluaciones
    const ids = evaluaciones.map(e => e.id);
    const { data: notas, error: errorNotas } = await supabaseClient
      .from('notas_evaluacion')
      .select('*')
      .in('evaluacion_id', ids);

    if (errorNotas) throw errorNotas;

    // Combinar evaluaciones con sus notas
    const resultado = evaluaciones.map(evaluacion => {
      const notasEval = (notas || []).filter(n => n.evaluacion_id === evaluacion.id);
      return {
        ...evaluacion,
        notas: notasEval
      };
    });

    return resultado;

  } catch (error) {
    console.error('Error al obtener evaluaciones:', error);
    return [];
  }
}

// ---------- GUARDAR EVALUACIÓN COMPLETA ----------
async function guardarEvaluacionCompleta(jugadorId, temporadaId, trimestre, fecha, observaciones, notas) {
  try {
    // Verificar si ya existe evaluación para este trimestre
    const { data: existente, error: errorExistente } = await supabaseClient
      .from('evaluaciones')
      .select('id')
      .eq('jugador_id', jugadorId)
      .eq('temporada_id', temporadaId)
      .eq('trimestre', trimestre)
      .maybeSingle();

    if (errorExistente) throw errorExistente;

    let evaluacionId;

    if (existente) {
      // Actualizar evaluación existente
      evaluacionId = existente.id;

      const { error: errorUpdate } = await supabaseClient
        .from('evaluaciones')
        .update({
          fecha_evaluacion: fecha,
          observaciones: observaciones
        })
        .eq('id', evaluacionId);

      if (errorUpdate) throw errorUpdate;

      // ACTUALIZAR notas usando UPSERT (insertar o actualizar)
      if (notas && notas.length > 0) {
        const notasParaUpsert = notas.map(n => ({
          evaluacion_id: evaluacionId,
          criterio_id: n.criterio_id,
          valor: n.valor
        }));

        // Usar upsert con conflict_target para evitar duplicados
        const { error: errorNotas } = await supabaseClient
          .from('notas_evaluacion')
          .upsert(notasParaUpsert, { 
            onConflict: 'evaluacion_id, criterio_id',
            ignoreDuplicates: false 
          });

        if (errorNotas) throw errorNotas;
      }

    } else {
      // Crear nueva evaluación
      const { data: nueva, error: errorInsert } = await supabaseClient
        .from('evaluaciones')
        .insert({
          jugador_id: jugadorId,
          temporada_id: temporadaId,
          trimestre: trimestre,
          fecha_evaluacion: fecha,
          observaciones: observaciones
        })
        .select()
        .single();

      if (errorInsert) throw errorInsert;
      evaluacionId = nueva.id;

      // Insertar nuevas notas
      if (notas && notas.length > 0) {
        const notasParaInsertar = notas.map(n => ({
          evaluacion_id: evaluacionId,
          criterio_id: n.criterio_id,
          valor: n.valor
        }));

        const { error: errorNotas } = await supabaseClient
          .from('notas_evaluacion')
          .insert(notasParaInsertar);

        if (errorNotas) throw errorNotas;
      }
    }

    return { success: true, evaluacionId };

  } catch (error) {
    console.error('Error al guardar evaluación:', error);
    return { success: false, error: error.message };
  }
}

// ---------- ELIMINAR EVALUACIÓN ----------
async function eliminarEvaluacion(evaluacionId) {
  try {
    // Las notas se eliminan en cascada por ON DELETE CASCADE
    const { error } = await supabaseClient
      .from('evaluaciones')
      .delete()
      .eq('id', evaluacionId);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error('Error al eliminar evaluación:', error);
    return { success: false, error: error.message };
  }
}

// ---------- OBTENER NOTAS DE EVALUACIÓN ----------
async function obtenerNotasEvaluacion(evaluacionId) {
  const { data, error } = await supabaseClient
    .from('notas_evaluacion')
    .select('*, criterios_evaluacion(*)')
    .eq('evaluacion_id', evaluacionId);

  if (error) {
    notificarError(error, 'No se pudieron cargar las notas.');
    return [];
  }
  return data || [];
}