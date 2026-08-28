// ============================================================
// CRITERIOS DE EVALUACIÓN
// ============================================================

// ---------- OBTENER CRITERIOS POR POSICIÓN ----------
async function obtenerCriteriosPorPosicion(posicion) {
  if (!posicion) return {};

  try {
    // POSICIONES DE CAMPO (NO portero)
    const posicionesCampo = ['DFC', 'LTI', 'LTD', 'MC', 'MCD', 'MCO', 'EI', 'ED', 'DC'];
    const esPortero = posicion === 'POR';

    let comunes = [];
    let especificosFiltrados = [];

    if (esPortero) {
      // PORTERO: SOLO criterios específicos, NO comunes
      const { data: especificos, error: errorEspecificos } = await supabaseClient
        .from('criterios_evaluacion')
        .select('*')
        .eq('activo', true)
        .eq('es_comun', false)
        .order('orden');

      if (errorEspecificos) throw errorEspecificos;

      // Filtrar los que pertenecen a PORTERO
      const { data: relaciones, error: errorRelaciones } = await supabaseClient
        .from('criterios_posiciones')
        .select('criterio_id')
        .eq('posicion', 'POR');

      if (errorRelaciones) throw errorRelaciones;

      const idsEspecificosPosicion = new Set(relaciones.map(r => r.criterio_id));
      especificosFiltrados = especificos.filter(c => idsEspecificosPosicion.has(c.id));

    } else {
      // JUGADORES DE CAMPO: comunes + específicos de su posición
      
      // 1. Obtener criterios comunes
      const { data: comunesData, error: errorComunes } = await supabaseClient
        .from('criterios_evaluacion')
        .select('*')
        .eq('es_comun', true)
        .eq('activo', true)
        .order('orden');

      if (errorComunes) throw errorComunes;
      comunes = comunesData || [];

      // 2. Obtener criterios específicos de esta posición
      const { data: especificos, error: errorEspecificos } = await supabaseClient
        .from('criterios_evaluacion')
        .select('*')
        .eq('activo', true)
        .eq('es_comun', false)
        .order('orden');

      if (errorEspecificos) throw errorEspecificos;

      // 3. Filtrar los específicos que pertenecen a esta posición
      const { data: relaciones, error: errorRelaciones } = await supabaseClient
        .from('criterios_posiciones')
        .select('criterio_id')
        .eq('posicion', posicion);

      if (errorRelaciones) throw errorRelaciones;

      const idsEspecificosPosicion = new Set(relaciones.map(r => r.criterio_id));
      especificosFiltrados = especificos.filter(c => idsEspecificosPosicion.has(c.id));
    }

    // 4. Combinar comunes + específicos filtrados (evitar duplicados por ID)
    const mapa = new Map();
    comunes.forEach(c => mapa.set(c.id, c));
    especificosFiltrados.forEach(c => mapa.set(c.id, c));

    const todos = Array.from(mapa.values());

    // 5. Agrupar por categoría
    const agrupado = {
      tecnica: [],
      tactica: [],
      fisica: [],
      psicologica: [],
      personal: []
    };

    todos.forEach(c => {
      if (agrupado[c.categoria]) {
        agrupado[c.categoria].push(c);
      }
    });

    // 6. ORDENAR: primero los comunes, luego los específicos (por nombre para mantener consistencia)
    Object.keys(agrupado).forEach(cat => {
      agrupado[cat].sort((a, b) => {
        // Primero comunes, luego específicos
        if (a.es_comun && !b.es_comun) return -1;
        if (!a.es_comun && b.es_comun) return 1;
        return a.nombre.localeCompare(b.nombre);
      });
    });

    return agrupado;

  } catch (error) {
    console.error('Error al obtener criterios:', error);
    notificarError(error, 'No se pudieron cargar los criterios de evaluación.');
    return {};
  }
}

// ---------- OBTENER TODOS LOS CRITERIOS (para administración) ----------
async function obtenerTodosLosCriterios() {
  const { data, error } = await supabaseClient
    .from('criterios_evaluacion')
    .select('*')
    .eq('activo', true)
    .order('categoria')
    .order('orden');

  if (error) {
    notificarError(error, 'No se pudieron cargar los criterios.');
    return [];
  }
  return data || [];
}

// ---------- OBTENER CRITERIOS POR CATEGORÍA ----------
async function obtenerCriteriosPorCategoria(categoria) {
  const { data, error } = await supabaseClient
    .from('criterios_evaluacion')
    .select('*')
    .eq('categoria', categoria)
    .eq('activo', true)
    .order('orden');

  if (error) {
    notificarError(error, 'No se pudieron cargar los criterios.');
    return [];
  }
  return data || [];
}