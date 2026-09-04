// ============================================================
// CONTROL FÍSICO
// ============================================================

let evaluaciones = [];
let evaluacionActual = null;
let mediciones = [];
let jugadores = [];
let temporadaActiva = null;
let todasMediciones = {};
let modoTemporada = false;
let jugadorBorrarPendiente = null;

// ---------- INICIO ----------
(async () => {
  if (!await exigirSesion()) return;

  await cargarTemporadaActiva();
  await cargarEvaluaciones();
  await cargarJugadores();
  
  if (evaluaciones.length > 0) {
    await seleccionarEvaluacion(evaluaciones[0].id);
  } else {
    mostrarMensajeVacio();
  }

  inicializarEventos();
})();

// ---------- CARGAR TEMPORADA ACTIVA ----------
async function cargarTemporadaActiva() {
  const { data, error } = await supabaseClient
    .from('temporadas')
    .select('*')
    .eq('activa', true)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    notificarError(error, 'No se pudo cargar la temporada activa.');
    return;
  }
  temporadaActiva = data;

  if (!temporadaActiva) {
    mostrarNotificacion('No hay temporada activa. Crea una desde la base de datos.', 'error');
  }
}

// ---------- CARGAR EVALUACIONES ----------
async function cargarEvaluaciones() {
  if (!temporadaActiva) {
    evaluaciones = [];
    return;
  }

  const { data, error } = await supabaseClient
    .from('evaluaciones_fisicas')
    .select('*')
    .eq('temporada_id', temporadaActiva.id)
    .order('fecha', { ascending: true });

  if (error) {
    notificarError(error, 'No se pudieron cargar las evaluaciones.');
    return;
  }
  evaluaciones = data || [];
}

// ---------- CARGAR JUGADORES ----------
async function cargarJugadores() {
  const { data, error } = await supabaseClient
    .from('jugadores')
    .select('id, nombre, dorsal')
    .eq('activo', true)
    .order('dorsal');

  if (error) {
    notificarError(error, 'No se pudieron cargar los jugadores.');
    return;
  }
  jugadores = data || [];
}

// ---------- CARGAR TODAS LAS MEDICIONES ----------
async function cargarTodasMediciones() {
  if (!temporadaActiva || evaluaciones.length === 0) {
    todasMediciones = {};
    return;
  }

  const ids = evaluaciones.map(e => e.id);
  const { data, error } = await supabaseClient
    .from('mediciones_fisicas')
    .select('*')
    .in('evaluacion_id', ids);

  if (error) {
    console.error('Error al cargar todas las mediciones:', error);
    return;
  }

  todasMediciones = {};
  (data || []).forEach(m => {
    if (!todasMediciones[m.evaluacion_id]) {
      todasMediciones[m.evaluacion_id] = [];
    }
    todasMediciones[m.evaluacion_id].push(m);
  });
}

// ---------- SELECCIONAR EVALUACIÓN ----------
async function seleccionarEvaluacion(evaluacionId) {
  const evalData = evaluaciones.find(e => e.id === evaluacionId);
  if (!evalData) return;

  evaluacionActual = evalData;
  modoTemporada = false;

  const { data, error } = await supabaseClient
    .from('mediciones_fisicas')
    .select('*')
    .eq('evaluacion_id', evaluacionId);

  if (error) {
    notificarError(error, 'No se pudieron cargar las mediciones.');
    return;
  }
  mediciones = data || [];

  await cargarTodasMediciones();

  actualizarHistorial();
  renderizarGridEdicion();
}

// ---------- RENDERIZAR GRID EDICIÓN ----------
function renderizarGridEdicion() {
  const gridBody = document.getElementById('gridBodyEdicion');
  const titulo = document.getElementById('tituloTabla');
  
  document.getElementById('gridEdicion').classList.remove('oculto');
  document.getElementById('gridTemporada').classList.add('oculto');
  
  titulo.textContent = evaluacionActual ? evaluacionActual.nombre : '✏️ Edición';
  
  if (!evaluacionActual) {
    gridBody.innerHTML = '<div class="grid-mensaje">Selecciona o crea una evaluación</div>';
    return;
  }

  if (jugadores.length === 0) {
    gridBody.innerHTML = '<div class="grid-mensaje">No hay jugadores activos</div>';
    return;
  }

  const idxActual = evaluaciones.findIndex(e => e.id === evaluacionActual.id);
  const evalAnterior = idxActual > 0 ? evaluaciones[idxActual - 1] : null;
  
  let medicionesAnteriores = [];
  if (evalAnterior) {
    medicionesAnteriores = todasMediciones[evalAnterior.id] || [];
  }

  let html = '';
  jugadores.forEach(j => {
    const medicion = mediciones.find(m => m.jugador_id === j.id) || {};
    const altura = medicion.altura_cm || '';
    const peso = medicion.peso_kg || '';
    const imc = medicion.imc || '';
    const tieneDatos = altura !== '' && peso !== '';
    const estadoClass = tieneDatos ? 'completo' : 'pendiente';
    const imcClass = imc !== '' ? 'has-value' : '';

    let medAnterior = null;
    let alturaAnterior = '';
    let pesoAnterior = '';
    if (evalAnterior) {
      medAnterior = medicionesAnteriores.find(m => m.jugador_id === j.id);
      if (medAnterior) {
        alturaAnterior = medAnterior.altura_cm || '';
        pesoAnterior = medAnterior.peso_kg || '';
      }
    }

    const textoEstado = tieneDatos ? 'Completo' : 'Pendiente';

    html += `
      <div class="grid-row-edicion" data-jugador-id="${j.id}">
        <div class="cell cell-estado">
          <span class="circulo-estado ${estadoClass}" title="${textoEstado}"></span>
        </div>
        <div class="cell cell-dorsal">${j.dorsal}</div>
        <div class="cell cell-nombre" title="${escaparHTML(j.nombre)}">${escaparHTML(j.nombre)}</div>
        <div class="cell cell-altura">
          <span class="valor-anterior">${alturaAnterior !== '' ? `<span class="label-ant">ant:</span> ${alturaAnterior} cm` : ''}</span>
          <select class="select-altura" data-jugador="${j.id}" data-campo="altura">
            <option value="">--</option>
            ${generarOpcionesAltura(altura)}
          </select>
        </div>
        <div class="cell cell-peso">
          <span class="valor-anterior">${pesoAnterior !== '' ? `<span class="label-ant">ant:</span> ${parseFloat(pesoAnterior).toFixed(1)} kg` : ''}</span>
          <div class="select-peso-wrapper">
            <select class="select-peso" data-jugador="${j.id}" data-campo="peso_entero">
              <option value="">-</option>
              ${generarOpcionesPesoEntero(peso)}
            </select>
            <span class="peso-decimal">.</span>
            <select class="select-peso" data-jugador="${j.id}" data-campo="peso_decimal">
              ${generarOpcionesPesoDecimal(peso)}
            </select>
            <span class="peso-decimal">kg</span>
          </div>
        </div>
        <div class="cell cell-imc">
          <span class="imc-badge ${imcClass}" id="imc_${j.id}">
            ${imc !== '' ? parseFloat(imc).toFixed(1) : '--'}
          </span>
        </div>
        <div class="cell cell-acciones">
          <button class="btn-borrar-fila" data-jugador="${j.id}" title="Borrar datos de este jugador">✕</button>
        </div>
      </div>
    `;
  });

  gridBody.innerHTML = html;
  inicializarEventosGrid();
}

// ---------- RENDERIZAR GRID TEMPORADA ----------
function renderizarGridTemporada() {
  const gridBody = document.getElementById('gridBodyTemporada');
  const gridHeader = document.getElementById('gridHeaderTemporada');
  const titulo = document.getElementById('tituloTabla');
  
  document.getElementById('gridEdicion').classList.add('oculto');
  document.getElementById('gridTemporada').classList.remove('oculto');
  
  titulo.textContent = 'Resumen de temporada';
  
  modoTemporada = true;
  
  actualizarHistorial();
  
  if (evaluaciones.length === 0) {
    gridBody.innerHTML = '<div class="grid-mensaje">No hay evaluaciones para mostrar</div>';
    return;
  }

  if (jugadores.length === 0) {
    gridBody.innerHTML = '<div class="grid-mensaje">No hay jugadores activos</div>';
    return;
  }

  let headerHtml = `
    <div class="col-header dorsal-col" style="justify-content:center; width:50px;">Dorsal</div>
    <div class="col-header nombre-col" style="justify-content:flex-start; flex:1;">Nombre</div>
  `;
  evaluaciones.forEach(e => {
    headerHtml += `<div class="col-header" style="justify-content:center; min-width:110px;">${escaparHTML(e.nombre)}</div>`;
  });
  gridHeader.innerHTML = headerHtml;
  const columnTemplate = `50px 1fr ${evaluaciones.map(() => 'minmax(110px, 1fr)').join(' ')}`;
  gridHeader.style.gridTemplateColumns = columnTemplate;

  let html = '';
  jugadores.forEach(j => {
    html += `<div class="grid-row-temporada" style="grid-template-columns: ${columnTemplate};">`;
    html += `<div class="cell" style="justify-content:center; font-weight:700; text-align:center">${j.dorsal}</div>`;
    html += `<div class="cell" style="justify-content:flex-start; font-weight:500; text-transform:uppercase; font-size:1rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escaparHTML(j.nombre)}</div>`;
    
    evaluaciones.forEach((e, idx) => {
      const medicionesEval = todasMediciones[e.id] || [];
      const med = medicionesEval.find(m => m.jugador_id === j.id);
      
      let medAnterior = null;
      if (idx > 0) {
        const evalAnterior = evaluaciones[idx - 1];
        const medicionesAnteriores = todasMediciones[evalAnterior.id] || [];
        medAnterior = medicionesAnteriores.find(m => m.jugador_id === j.id);
      }
      
      if (med && med.altura_cm !== null && med.peso_kg !== null) {
        const imc = med.imc || calcularIMC(med.altura_cm, med.peso_kg);
        const altura = med.altura_cm;
        const peso = parseFloat(med.peso_kg).toFixed(1);
        const imcVal = imc !== null ? parseFloat(imc).toFixed(1) : '--';
        
        let diffAltura = null, diffPeso = null, diffImc = null;
        if (medAnterior && medAnterior.altura_cm !== null && medAnterior.peso_kg !== null) {
          const imcAnterior = medAnterior.imc || calcularIMC(medAnterior.altura_cm, medAnterior.peso_kg);
          diffAltura = med.altura_cm - medAnterior.altura_cm;
          diffPeso = parseFloat((parseFloat(med.peso_kg) - parseFloat(medAnterior.peso_kg)).toFixed(1));
          if (imc !== null && imcAnterior !== null) {
            diffImc = parseFloat((imc - imcAnterior).toFixed(1));
          }
        }
        
        // Determinar qué mostrar como diff
        const diffAlturaDisplay = diffAltura !== null ? `${diffAltura >= 0 ? '+' : ''}${diffAltura}` : '\u00A0';
        const diffPesoDisplay = diffPeso !== null ? `${diffPeso >= 0 ? '+' : ''}${diffPeso}` : '\u00A0';
        const diffImcDisplay = diffImc !== null ? `${diffImc >= 0 ? '+' : ''}${diffImc}` : '\u00A0';
        
        const diffAlturaClass = diffAltura !== null ? (diffAltura >= 0 ? 'positiva' : 'negativa') : '';
        const diffPesoClass = diffPeso !== null ? (diffPeso >= 0 ? 'positiva' : 'negativa') : '';
        const diffImcClass = diffImc !== null ? (diffImc >= 0 ? 'positiva' : 'negativa') : '';
        
        html += `
          <div class="cell col-eval-temp" style="justify-content:center; padding:0.2rem;">
            <div class="eval-datos">
              <div class="eval-item">
                <span class="diff ${diffAlturaClass}" style="${diffAltura === null ? 'opacity:0;' : ''}">${diffAlturaDisplay}</span>
                <span class="eval-valor altura">${altura}</span>
              </div>
              <div class="eval-item">
                <span class="diff ${diffPesoClass}" style="${diffPeso === null ? 'opacity:0;' : ''}">${diffPesoDisplay}</span>
                <span class="eval-valor peso">${peso}</span>
              </div>
              <div class="eval-item">
                <span class="diff ${diffImcClass}" style="${diffImc === null ? 'opacity:0;' : ''}">${diffImcDisplay}</span>
                <span class="eval-valor imc">${imcVal}</span>
              </div>
            </div>
            <div class="eval-labels">
              <span class="eval-label">Altura</span>
              <span class="eval-label">Peso</span>
              <span class="eval-label">IMC</span>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="cell col-eval-temp" style="justify-content:center; padding:0.2rem;">
            <span class="sin-dato">—</span>
          </div>
        `;
      }
    });
    
    html += `</div>`;
  });

  gridBody.innerHTML = html;
}

// ---------- GENERAR OPCIONES ----------
function generarOpcionesAltura(selected) {
  let html = '';
  for (let i = 140; i <= 190; i++) {
    const sel = selected === i ? 'selected' : '';
    html += `<option value="${i}" ${sel}>${i}</option>`;
  }
  return html;
}

function generarOpcionesPesoEntero(peso) {
  let html = '';
  const entero = peso !== '' ? Math.floor(peso) : '';
  for (let i = 30; i <= 85; i++) {
    const sel = entero === i ? 'selected' : '';
    html += `<option value="${i}" ${sel}>${i}</option>`;
  }
  return html;
}

function generarOpcionesPesoDecimal(peso) {
  let html = '';
  const decimal = peso !== '' ? Math.round((peso - Math.floor(peso)) * 10) : 0;
  for (let i = 0; i <= 9; i++) {
    const sel = decimal === i ? 'selected' : '';
    html += `<option value="${i}" ${sel}>${i}</option>`;
  }
  return html;
}

// ---------- ACTUALIZAR HISTORIAL ----------
function actualizarHistorial() {
  const container = document.getElementById('listaHistorial');
  
  let html = '';
  
  evaluaciones.forEach(e => {
    // Una evaluación está activa SI:
    // 1. Hay una evaluación seleccionada (evaluacionActual)
    // 2. Su ID coincide con la evaluación seleccionada
    // 3. NO estamos en modo temporada
    const isActive = evaluacionActual && e.id === evaluacionActual.id && !modoTemporada;
    html += `
      <span class="item-historial ${isActive ? 'activo' : ''}" data-id="${e.id}" data-tipo="evaluacion">
        ${escaparHTML(e.nombre)}
      </span>
    `;
  });
  
  // "Temporada" está activo SI estamos en modo temporada
  const isTemporadaActive = modoTemporada;
  html += `
    <span class="item-historial temporada ${isTemporadaActive ? 'activo' : ''}" data-tipo="temporada">
      Temporada
    </span>
  `;
  
  container.innerHTML = html;

  container.querySelectorAll('.item-historial').forEach(el => {
    el.addEventListener('click', () => {
      const tipo = el.dataset.tipo;
      const id = el.dataset.id;
      
      if (tipo === 'temporada') {
        // Si ya estamos en temporada, no hacer nada
        if (!modoTemporada) {
          renderizarGridTemporada();
          // actualizarHistorial() ya se llama dentro de renderizarGridTemporada()
        }
      } else if (tipo === 'evaluacion' && id) {
        // Si la evaluación ya está seleccionada y no estamos en temporada, no hacer nada
        if (evaluacionActual?.id !== id || modoTemporada) {
          seleccionarEvaluacion(id);
          // seleccionarEvaluacion() ya llama a actualizarHistorial()
        }
      }
    });
  });
}

// ---------- MOSTRAR MENSAJE VACÍO ----------
function mostrarMensajeVacio() {
  const gridBody = document.getElementById('gridBody');
  gridBody.innerHTML = '<div class="grid-mensaje">Crea una nueva evaluación para empezar</div>';
}

// ---------- CALCULAR IMC ----------
function calcularIMC(alturaCm, pesoKg) {
  if (!alturaCm || !pesoKg || alturaCm <= 0 || pesoKg <= 0) return null;
  const alturaMetros = alturaCm / 100;
  const imc = pesoKg / (alturaMetros * alturaMetros);
  return Math.round(imc * 10) / 10;
}

// ---------- GUARDAR MEDICIÓN ----------
async function guardarMedicion(jugadorId, altura, peso) {
  if (!evaluacionActual) return;

  const imc = calcularIMC(altura, peso);

  const existente = mediciones.find(m => m.jugador_id === jugadorId);

  const data = {
    evaluacion_id: evaluacionActual.id,
    jugador_id: jugadorId,
    altura_cm: altura || null,
    peso_kg: peso || null,
    imc: imc
  };

  let result;
  if (existente) {
    result = await supabaseClient
      .from('mediciones_fisicas')
      .update(data)
      .eq('id', existente.id);
  } else {
    result = await supabaseClient
      .from('mediciones_fisicas')
      .insert(data);
  }

  if (result.error) {
    console.error('Error al guardar:', result.error);
    notificarError(result.error, 'Error al guardar la medición.');
    return;
  }

  if (existente) {
    Object.assign(existente, data);
  } else {
    mediciones.push({ ...data, id: result.data?.[0]?.id || 'temp' });
  }

  // Actualizar IMC en DOM
  const imcSpan = document.getElementById(`imc_${jugadorId}`);
  if (imcSpan) {
    imcSpan.textContent = imc !== null ? imc.toFixed(1) : '--';
    imcSpan.className = `imc-badge ${imc !== null ? 'has-value' : ''}`;
  }

  // Actualizar círculo de estado
  const row = document.querySelector(`.grid-row-edicion[data-jugador-id="${jugadorId}"]`);
  if (row) {
    const circulo = row.querySelector('.circulo-estado');
    if (circulo) {
      const tieneDatos = altura !== null && peso !== null && altura !== '' && peso !== '';
      circulo.className = `circulo-estado ${tieneDatos ? 'completo' : 'pendiente'}`;
      circulo.title = tieneDatos ? 'Completo' : 'Pendiente';
    }
  }

  await actualizarEstadoEvaluacion();
  await cargarTodasMediciones();
  
  if (modoTemporada) {
    renderizarGridTemporada();
  }
}

// ---------- BORRAR DATOS DE JUGADOR ----------
async function borrarDatosJugador(jugadorId) {
  if (!evaluacionActual) return;

  const existente = mediciones.find(m => m.jugador_id === jugadorId);
  if (!existente) return;

  const data = {
    altura_cm: null,
    peso_kg: null,
    imc: null
  };

  const { error } = await supabaseClient
    .from('mediciones_fisicas')
    .update(data)
    .eq('id', existente.id);

  if (error) {
    notificarError(error, 'Error al borrar los datos.');
    return;
  }

  // Actualizar el objeto en memoria
  Object.assign(existente, data);

  // Actualizar el DOM inmediatamente - USAR grid-row-edicion
  const row = document.querySelector(`.grid-row-edicion[data-jugador-id="${jugadorId}"]`);
  if (row) {
    const selectAltura = row.querySelector('.select-altura');
    const selectEntero = row.querySelector('.select-peso[data-campo="peso_entero"]');
    const selectDecimal = row.querySelector('.select-peso[data-campo="peso_decimal"]');
    const imcSpan = document.getElementById(`imc_${jugadorId}`);
    const circulo = row.querySelector('.circulo-estado');

    // Resetear selects
    if (selectAltura) selectAltura.value = '';
    if (selectEntero) selectEntero.value = '';
    if (selectDecimal) selectDecimal.value = '0';
    
    // Resetear IMC
    if (imcSpan) {
      imcSpan.textContent = '--';
      imcSpan.className = 'imc-badge';
    }
    
    // Resetear círculo de estado
    if (circulo) {
      circulo.className = 'circulo-estado pendiente';
      circulo.title = 'Pendiente';
    }
  }

  await actualizarEstadoEvaluacion();
  await cargarTodasMediciones();
  
  // Si estamos en modo temporada, actualizar la vista de temporada
  if (modoTemporada) {
    renderizarGridTemporada();
  }
  
  cerrarModalBorrarDatos();
}


// ---------- ACTUALIZAR ESTADO DE EVALUACIÓN ----------
async function actualizarEstadoEvaluacion() {
  if (!evaluacionActual || jugadores.length === 0) return;

  const jugadoresConDatos = jugadores.filter(j => {
    const med = mediciones.find(m => m.jugador_id === j.id);
    return med && med.altura_cm !== null && med.peso_kg !== null;
  });

  const nuevoEstado = jugadoresConDatos.length === jugadores.length ? 'completada' : 'en_progreso';

  if (evaluacionActual.estado !== nuevoEstado) {
    const { error } = await supabaseClient
      .from('evaluaciones_fisicas')
      .update({ estado: nuevoEstado })
      .eq('id', evaluacionActual.id);

    if (!error) {
      evaluacionActual.estado = nuevoEstado;
      actualizarHistorial();
    }
  }
}

// ---------- CREAR NUEVA EVALUACIÓN ----------
async function crearNuevaEvaluacion(nombre, fecha) {
  if (!temporadaActiva) {
    mostrarNotificacion('No hay temporada activa.', 'error');
    return;
  }

  if (!nombre.trim() || !fecha) {
    mostrarNotificacion('Completa todos los campos.', 'error');
    return;
  }

  const { data, error } = await supabaseClient
    .from('evaluaciones_fisicas')
    .insert({
      temporada_id: temporadaActiva.id,
      nombre: nombre.trim(),
      fecha: fecha,
      estado: 'en_progreso'
    })
    .select()
    .single();

  if (error) {
    notificarError(error, 'No se pudo crear la evaluación.');
    return;
  }

  const medicionesInsert = jugadores.map(j => ({
    evaluacion_id: data.id,
    jugador_id: j.id,
    altura_cm: null,
    peso_kg: null,
    imc: null
  }));

  const { error: errorMed } = await supabaseClient
    .from('mediciones_fisicas')
    .insert(medicionesInsert);

  if (errorMed) {
    console.error('Error al crear mediciones:', errorMed);
    await supabaseClient.from('evaluaciones_fisicas').delete().eq('id', data.id);
    notificarError(errorMed, 'Error al crear las mediciones.');
    return;
  }

  await cargarEvaluaciones();
  await seleccionarEvaluacion(data.id);
  mostrarNotificacion('Evaluación creada correctamente.', 'exito');
  cerrarModalNuevaEvaluacion();
}

// ---------- ELIMINAR EVALUACIÓN ----------
async function eliminarEvaluacion() {
  if (!evaluacionActual) {
    mostrarNotificacion('No hay evaluación seleccionada.', 'error');
    return;
  }

  const { error } = await supabaseClient
    .from('evaluaciones_fisicas')
    .delete()
    .eq('id', evaluacionActual.id);

  if (error) {
    notificarError(error, 'No se pudo eliminar la evaluación.');
    return;
  }

  mostrarNotificacion('Evaluación eliminada correctamente.', 'exito');
  await cargarEvaluaciones();
  
  if (evaluaciones.length > 0) {
    await seleccionarEvaluacion(evaluaciones[0].id);
  } else {
    evaluacionActual = null;
    mediciones = [];
    todasMediciones = {};
    modoTemporada = false;
    renderizarGridEdicion();
    actualizarHistorial();
  }
  
  cerrarModalEliminarEvaluacion();
}

// ---------- EVENTOS ----------
function inicializarEventos() {
  document.getElementById('btnNuevaEvaluacion').addEventListener('click', () => {
    document.getElementById('modalNuevaEvaluacion').classList.remove('oculto');
    document.getElementById('inputFechaEval').value = new Date().toISOString().split('T')[0];
    document.getElementById('inputNombreEval').focus();
  });

  document.getElementById('btnCancelarNuevaEval').addEventListener('click', cerrarModalNuevaEvaluacion);
  document.getElementById('btnCrearEvaluacion').addEventListener('click', async () => {
    const nombre = document.getElementById('inputNombreEval').value.trim();
    const fecha = document.getElementById('inputFechaEval').value;
    await crearNuevaEvaluacion(nombre, fecha);
  });

  document.getElementById('modalNuevaEvaluacion').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalNuevaEvaluacion();
  });

  document.getElementById('inputNombreEval').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btnCrearEvaluacion').click();
  });

  document.getElementById('btnEliminarEvaluacion').addEventListener('click', () => {
    if (!evaluacionActual) {
      mostrarNotificacion('No hay evaluación seleccionada.', 'error');
      return;
    }
    document.getElementById('textoEliminarEval').textContent = 
      `¿Seguro que quieres eliminar "${evaluacionActual.nombre}"? Se borrarán todas las mediciones asociadas. Esta acción no se puede deshacer.`;
    document.getElementById('modalEliminarEvaluacion').classList.remove('oculto');
  });

  document.getElementById('btnCancelarEliminarEval').addEventListener('click', cerrarModalEliminarEvaluacion);
  document.getElementById('btnConfirmarEliminarEval').addEventListener('click', eliminarEvaluacion);

  document.getElementById('modalEliminarEvaluacion').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalEliminarEvaluacion();
  });

  // Modal borrar datos
  document.getElementById('btnCancelarBorrarDatos').addEventListener('click', cerrarModalBorrarDatos);
  document.getElementById('btnConfirmarBorrarDatos').addEventListener('click', async () => {
    if (jugadorBorrarPendiente) {
      await borrarDatosJugador(jugadorBorrarPendiente);
      jugadorBorrarPendiente = null;
    }
  });

  document.getElementById('modalBorrarDatos').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalBorrarDatos();
  });
}

function cerrarModalNuevaEvaluacion() {
  document.getElementById('modalNuevaEvaluacion').classList.add('oculto');
  document.getElementById('inputNombreEval').value = '';
}

function cerrarModalEliminarEvaluacion() {
  document.getElementById('modalEliminarEvaluacion').classList.add('oculto');
}

function cerrarModalBorrarDatos() {
  document.getElementById('modalBorrarDatos').classList.add('oculto');
  jugadorBorrarPendiente = null;
}

// ---------- EVENTOS DEL GRID ----------
function inicializarEventosGrid() {
  document.querySelectorAll('.select-altura').forEach(select => {
    select.addEventListener('change', async (e) => {
      const jugadorId = select.dataset.jugador;
      const altura = parseInt(select.value) || null;
      const peso = obtenerPesoJugador(jugadorId);
      await guardarMedicion(jugadorId, altura, peso);
    });
  });

  document.querySelectorAll('.select-peso[data-campo="peso_entero"]').forEach(select => {
    select.addEventListener('change', async (e) => {
      const jugadorId = select.dataset.jugador;
      const peso = obtenerPesoJugador(jugadorId);
      const altura = obtenerAlturaJugador(jugadorId);
      await guardarMedicion(jugadorId, altura, peso);
    });
  });

  document.querySelectorAll('.select-peso[data-campo="peso_decimal"]').forEach(select => {
    select.addEventListener('change', async (e) => {
      const jugadorId = select.dataset.jugador;
      const peso = obtenerPesoJugador(jugadorId);
      const altura = obtenerAlturaJugador(jugadorId);
      await guardarMedicion(jugadorId, altura, peso);
    });
  });

  document.querySelectorAll('.btn-borrar-fila').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const jugadorId = btn.dataset.jugador;
      const row = btn.closest('.grid-row');
      const nombre = row ? row.querySelector('.cell-nombre')?.textContent || 'Jugador' : 'Jugador';
      jugadorBorrarPendiente = jugadorId;
      document.getElementById('textoBorrarDatos').textContent = 
        `¿Seguro que quieres borrar los datos de "${nombre}" en esta evaluación?`;
      document.getElementById('modalBorrarDatos').classList.remove('oculto');
    });
  });
}

function obtenerAlturaJugador(jugadorId) {
  const select = document.querySelector(`.select-altura[data-jugador="${jugadorId}"]`);
  return select ? parseInt(select.value) || null : null;
}

function obtenerPesoJugador(jugadorId) {
  const selectEntero = document.querySelector(`.select-peso[data-jugador="${jugadorId}"][data-campo="peso_entero"]`);
  const selectDecimal = document.querySelector(`.select-peso[data-jugador="${jugadorId}"][data-campo="peso_decimal"]`);
  
  if (!selectEntero || !selectDecimal) return null;
  
  const entero = parseInt(selectEntero.value);
  const decimal = parseInt(selectDecimal.value);
  
  if (isNaN(entero) || isNaN(decimal)) return null;
  return parseFloat(`${entero}.${decimal}`);
}