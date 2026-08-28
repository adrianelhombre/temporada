// ============================================================
// TEMPORADAS
// ============================================================

// ---------- OBTENER TEMPORADA ACTIVA ----------
async function obtenerTemporadaActiva() {
  const { data, error } = await supabaseClient
    .from('temporadas')
    .select('*')
    .eq('activa', true)
    .single();

  if (error) {
    notificarError(error, 'No se pudo cargar la temporada activa.');
    return null;
  }
  return data;
}

// ---------- OBTENER TODAS LAS TEMPORADAS ----------
async function obtenerTodasLasTemporadas() {
  const { data, error } = await supabaseClient
    .from('temporadas')
    .select('*')
    .order('nombre', { ascending: false });

  if (error) {
    notificarError(error, 'No se pudieron cargar las temporadas.');
    return [];
  }
  return data || [];
}

// ---------- CREAR NUEVA TEMPORADA ----------
async function crearTemporada(nombre, fechaInicio, fechaFin) {
  const { data, error } = await supabaseClient
    .from('temporadas')
    .insert({
      nombre: nombre,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      activa: false
    })
    .select()
    .single();

  if (error) {
    notificarError(error, 'No se pudo crear la temporada.');
    return null;
  }
  return data;
}

// ---------- ACTIVAR TEMPORADA ----------
async function activarTemporada(id) {
  // Desactivar todas primero
  const { error: errorDesactivar } = await supabaseClient
    .from('temporadas')
    .update({ activa: false })
    .neq('id', id);

  if (errorDesactivar) {
    notificarError(errorDesactivar, 'No se pudieron desactivar las temporadas.');
    return false;
  }

  // Activar la seleccionada
  const { error: errorActivar } = await supabaseClient
    .from('temporadas')
    .update({ activa: true })
    .eq('id', id);

  if (errorActivar) {
    notificarError(errorActivar, 'No se pudo activar la temporada.');
    return false;
  }

  return true;
}