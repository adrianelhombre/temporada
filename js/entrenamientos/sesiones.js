// Gestión de planificación semanal y sesiones de entrenamiento.

async function cargarTemporada() {
  const { data: activa, error: errorActiva } = await supabaseClient.from('temporadas').select('id').eq('activa', true).limit(1).maybeSingle();
  if (errorActiva) throw errorActiva;
  if (activa) { temporadaEntrenamientosId = activa.id; return; }
  const { data, error } = await supabaseClient.from('temporadas').select('id').order('id').limit(1).maybeSingle();
  if (error) throw error; if (!data) throw new Error('No hay temporada creada.'); temporadaEntrenamientosId = data.id;
}
async function cargarJugadores() {
  const { data, error } = await supabaseClient.from('jugadores').select('id,nombre,dorsal,activo').eq('activo', true).order('dorsal', { ascending: true });
  if (error) throw error; jugadoresEntrenamiento = data || [];
}
async function cargarSemanas() {
  const selector = $('selectorSemana');
  if (!selector || !temporadaEntrenamientosId) return;
  selector.innerHTML = '<option value="">Cargando semanas…</option>';
  const { data, error } = await supabaseClient.from('entrenamientos_semanas')
    .select('*').eq('temporada_id', temporadaEntrenamientosId).order('fecha_inicio', { ascending: true });
  if (error) throw error;
  semanasEntrenamiento = data || [];
  selector.innerHTML = '';
  if (!semanasEntrenamiento.length) {
    selector.innerHTML = '<option value="">No hay semanas creadas</option>';
    $('rangoSemana').textContent = 'Crea una semana o jornada para empezar a organizar los entrenamientos.';
    $('listaSesiones').innerHTML = '<div class="tarjeta estado-vacio">Todavía no hay semanas de planificación.<br>Usa <strong>+ Nueva semana / jornada</strong> para crear la primera.</div>';
    $('btnNuevaSesion').disabled = true;
    $('btnEditarSemana').disabled = true;
    return;
  }
  $('btnNuevaSesion').disabled = false;
  $('btnEditarSemana').disabled = false;
  semanasEntrenamiento.forEach(semana => {
    const option = document.createElement('option');
    option.value = semana.id;
    option.textContent = etiquetaSemana(semana);
    selector.appendChild(option);
  });
  const hoy = fechaISO(lunesDe(new Date()));
  const actual = semanasEntrenamiento.find(semana => semana.fecha_inicio <= hoy && semana.fecha_fin >= hoy);
  selector.value = actual?.id || semanasEntrenamiento[0].id;
  await cargarSemana();
}

function etiquetaSemana(semana) {
  if (semana.tipo === 'jornada') {
    const rival = (semana.rival || '').trim();
    const condicion = semana.condicion === 'local' ? ' (L)' : ' (V)';
    return `Jornada ${semana.jornada_numero || '—'}${rival ? ` – ${rival}` : ''}${condicion}`;
  }
  return semana.nombre || `Semana del ${formatearFecha(semana.fecha_inicio)}`;
}

async function cargarSemana() {
  const semanaId = $('selectorSemana')?.value;
  const semana = semanasEntrenamiento.find(item => item.id === semanaId);
  if (!semana) return;
  $('rangoSemana').textContent = `${formatearFecha(semana.fecha_inicio)} – ${formatearFecha(semana.fecha_fin)}`;
  $('listaSesiones').innerHTML = '<div class="tarjeta estado-vacio">Cargando sesiones…</div>';
  const { data, error } = await supabaseClient.from('entrenamientos_sesiones').select('*')
    .eq('temporada_id', temporadaEntrenamientosId).eq('semana_id', semana.id).order('fecha').order('hora_inicio');
  if (error) { console.error(error); $('listaSesiones').innerHTML = '<div class="tarjeta estado-vacio">No se pudieron cargar las sesiones. Comprueba la configuración de Supabase.</div>'; return; }
  sesionesSemana = data || [];
  renderizarSesiones();
}

function abrirModalSemana(editar = false) {
  const semanaActual = editar ? semanasEntrenamiento.find(item => item.id === $('selectorSemana')?.value) : null;
  $('tipoSemana').value = semanaActual?.tipo || 'jornada';
  $('semanaJornadaNumero').value = semanaActual?.jornada_numero ?? '';
  $('semanaRival').value = semanaActual?.rival || '';
  $('semanaCondicion').value = semanaActual?.condicion || 'visitante';
  $('semanaNombre').value = semanaActual?.nombre || '';
  const seleccionada = semanasEntrenamiento.find(item => item.id === $('selectorSemana')?.value);
  const inicio = semanaActual?.fecha_inicio || seleccionada?.fecha_inicio || fechaISO(lunesDe(new Date()));
  const fecha = new Date(inicio + 'T12:00:00'); if (!editar && seleccionada) fecha.setDate(fecha.getDate() + 7);
  $('semanaFechaInicio').value = fechaISO(fecha);
  $('modalSemana').dataset.editarId = semanaActual?.id || '';
  $('modalSemana').querySelector('h2').textContent = editar ? 'Editar semana / jornada' : 'Nueva semana / jornada';
  $('btnGuardarSemana').textContent = editar ? 'Guardar cambios' : 'Crear semana';
  actualizarCamposTipoSemana();
  actualizarRangoSemanaPreview();
  $('modalSemana').classList.remove('oculto');
}

function actualizarCamposTipoSemana() {
  const jornada = $('tipoSemana').value === 'jornada';
  $('camposSemanaJornada').classList.toggle('oculto', !jornada);
  $('camposSemanaEspecial').classList.toggle('oculto', jornada);
}

function actualizarRangoSemanaPreview() {
  const valor = $('semanaFechaInicio')?.value;
  if (!valor) { $('semanaRangoPreview').textContent = ''; return; }
  const lunes = lunesDe(new Date(valor + 'T12:00:00'));
  const domingo = new Date(lunes); domingo.setDate(domingo.getDate() + 6);
  $('semanaFechaInicio').value = fechaISO(lunes);
  $('semanaRangoPreview').textContent = `Semana: ${formatearFecha(fechaISO(lunes))} – ${formatearFecha(fechaISO(domingo))}`;
}

async function crearSemana() {
  const tipo = $('tipoSemana').value;
  const inicioValor = $('semanaFechaInicio').value;
  if (!inicioValor) { mostrarNotificacion('Indica el lunes de la semana.', 'error'); return; }
  const inicio = lunesDe(new Date(inicioValor + 'T12:00:00'));
  const fechaInicio = fechaISO(inicio);
  const domingo = new Date(inicio); domingo.setDate(domingo.getDate() + 6);
  const fechaFin = fechaISO(domingo);
  let payload;
  if (tipo === 'jornada') {
    const numero = Number($('semanaJornadaNumero').value);
    const rival = $('semanaRival').value.trim();
    if (!Number.isInteger(numero) || numero < 1 || !rival) { mostrarNotificacion('Indica el número de jornada y el rival.', 'error'); return; }
    payload = { temporada_id: temporadaEntrenamientosId, tipo, jornada_numero: numero, rival, condicion: $('semanaCondicion').value, nombre: '', fecha_inicio: fechaInicio, fecha_fin: fechaFin };
  } else {
    const nombre = $('semanaNombre').value.trim();
    if (!nombre) { mostrarNotificacion('Indica un nombre para la semana especial.', 'error'); return; }
    payload = { temporada_id: temporadaEntrenamientosId, tipo, jornada_numero: null, rival: '', condicion: null, nombre, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
  }
  const boton = $('btnGuardarSemana'); boton.disabled = true; boton.textContent = 'Creando…';
  try {
    const editarId = $('modalSemana').dataset.editarId;
    const consulta = editarId
      ? supabaseClient.from('entrenamientos_semanas').update(payload).eq('id', editarId).select('*').single()
      : supabaseClient.from('entrenamientos_semanas').insert(payload).select('*').single();
    const { data, error } = await consulta;
    if (error) throw error;
    cerrarModal('modalSemana');
    $('modalSemana').dataset.editarId = '';
    await cargarSemanas();
    $('selectorSemana').value = data.id;
    await cargarSemana();
    mostrarNotificacion(editarId ? 'Semana de planificación actualizada.' : 'Semana de planificación creada.', 'exito');
  } catch (error) {
    console.error(error);
    if (error.code === '23505') mostrarNotificacion('Ya existe una semana de planificación con esa fecha de inicio.', 'error');
    else mostrarNotificacion('No se pudo crear la semana. Comprueba que has ejecutado la actualización SQL de Entrenamientos.', 'error');
  } finally { boton.disabled = false; boton.textContent = $('modalSemana').dataset.editarId ? 'Guardar cambios' : 'Crear semana'; }
}

function renderizarSesiones() {
  const cont = $('listaSesiones');
  if (!sesionesSemana.length) { cont.innerHTML = '<div class="tarjeta estado-vacio">Todavía no hay sesiones en esta semana.<br>Usa <strong>+ Nueva sesión</strong> para crear la primera.</div>'; return; }
  cont.innerHTML = '';
  sesionesSemana.forEach(sesion => {
    const fecha = new Date(sesion.fecha + 'T12:00:00'); const dia = fecha.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const card = document.createElement('article'); card.className = 'tarjeta tarjeta-sesion'; card.tabIndex = 0; card.setAttribute('role', 'button');
    card.innerHTML = `<div class="fecha-sesion"><span>${escaparHTML(dia)}</span><strong>${fecha.getDate()}</strong></div><div class="info-sesion"><h3>${escaparHTML(sesion.titulo || 'Entrenamiento')}</h3><p>${escaparHTML(sesion.objetivo || 'Sin objetivo definido')}</p><div class="sesion-meta"><span class="pildora">${Number(sesion.duracion_prevista || 0)} min</span><span class="pildora ${sesion.asistencia_confirmada ? 'confirmada' : 'pendiente'}">${sesion.asistencia_confirmada ? 'Asistencia revisada' : 'Asistencia pendiente'}</span></div></div><span class="flecha-sesion">›</span>`;
    card.addEventListener('click', () => { window.location.href = `sesion.html?id=${encodeURIComponent(sesion.id)}`; }); card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = `sesion.html?id=${encodeURIComponent(sesion.id)}`; } }); cont.appendChild(card);
  });
}

function abrirModalSesion() {
  const semana = semanasEntrenamiento.find(item => item.id === $('selectorSemana')?.value);
  if (!semana) { mostrarNotificacion('Primero crea o selecciona una semana de planificación.', 'error'); return; }
  $('sesionTitulo').value = 'Entrenamiento'; $('sesionFecha').value = semana.fecha_inicio || fechaISO(new Date()); $('sesionDuracion').value = 90; $('sesionObjetivo').value = ''; $('sesionObservaciones').value = '';
  $('modalSesion').classList.remove('oculto');
}
async function crearSesion() {
  const fecha = $('sesionFecha').value; const titulo = $('sesionTitulo').value.trim(); const duracion = Number($('sesionDuracion').value);
  if (!fecha || !titulo || !Number.isFinite(duracion) || duracion < 1) { mostrarNotificacion('Indica el nombre, la fecha y una duración válida.', 'error'); return; }
  const btn = $('btnGuardarSesion'); btn.disabled = true; btn.textContent = 'Creando…';
  try {
    const semana = semanasEntrenamiento.find(item => item.id === $('selectorSemana')?.value);
    if (!semana) throw new Error('No se ha seleccionado una semana de planificación.');
    const payload = { temporada_id: temporadaEntrenamientosId, semana_id: semana.id, fecha, titulo, duracion_prevista: duracion, objetivo: $('sesionObjetivo').value.trim(), observaciones: $('sesionObservaciones').value.trim(), asistencia_confirmada: false };
    const { data, error } = await supabaseClient.from('entrenamientos_sesiones').insert(payload).select('*').single(); if (error) throw error;
    cerrarModal('modalSesion'); window.location.href = `sesion.html?id=${encodeURIComponent(data.id)}`;
  } catch (error) { console.error(error); mostrarNotificacion('No se pudo crear la sesión. Revisa las tablas y políticas de Supabase.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Crear sesión'; }
}
async function abrirDetalleSesion(sesion) {
  sesionActual = sesion;
  $('zonaListado')?.classList.add('oculto'); $('vista-detalle-sesion')?.classList.remove('oculto');
  restablecerPanelesPlegables();
  $('detalleTitulo').value = sesion.titulo || 'Entrenamiento'; $('detalleFecha').value = sesion.fecha || ''; $('detalleDuracion').value = sesion.duracion_prevista ?? 90; $('detalleDuracionReal').value = sesion.duracion_real ?? ''; $('detalleObjetivo').value = sesion.objetivo || ''; $('detalleObservaciones').value = sesion.observaciones || '';
  $('detalleTituloCabecera').textContent = sesion.titulo || 'Entrenamiento'; $('detalleFechaEtiqueta').textContent = formatearFecha(sesion.fecha, { day: 'numeric', month: 'long', year: 'numeric' });
  $('asistenciaConfirmada').checked = Boolean(sesion.asistencia_confirmada);
  cargarEquiposSesion(sesion);
  let estadoGuardadoEjercicios = sesion.estado_ejercicios;
  if (typeof estadoGuardadoEjercicios === 'string') { try { estadoGuardadoEjercicios = JSON.parse(estadoGuardadoEjercicios); } catch { estadoGuardadoEjercicios = {}; } }
  estadoContraidoEjerciciosSesion = estadoGuardadoEjercicios && typeof estadoGuardadoEjercicios === 'object' ? estadoGuardadoEjercicios : {};
  ejerciciosContraidos.clear();
  Object.entries(estadoContraidoEjerciciosSesion).forEach(([id, contraido]) => { if (contraido) ejerciciosContraidos.add(String(id)); });
  estadosAsistencia = new Map(); asistenciaLocalModificada = false; ejerciciosSesion = [];
  $('ejerciciosDeSesion').innerHTML = '<p class="texto-secundario">Cargando ejercicios…</p>'; $('listaAsistencia').innerHTML = '<p class="texto-secundario">Cargando plantilla…</p>';
  const [itemsRes, asistenciaRes] = await Promise.all([
    supabaseClient.from('entrenamientos_sesion_ejercicios').select('*').eq('sesion_id', sesion.id).order('orden'),
    supabaseClient.from('entrenamientos_asistencia').select('*').eq('sesion_id', sesion.id)
  ]);
  if (itemsRes.error) { console.error(itemsRes.error); mostrarNotificacion('No se pudieron cargar los ejercicios de la sesión.', 'error'); }
  ejerciciosSesion = itemsRes.data || [];
  if (asistenciaRes.error) { console.error(asistenciaRes.error); mostrarNotificacion('No se pudo cargar la asistencia.', 'error'); }
  (asistenciaRes.data || []).forEach(a => estadosAsistencia.set(a.jugador_id, { estado: a.estado || 'presente', justificada: Boolean(a.justificada), minutos_retraso: Number(a.minutos_retraso || 0) }));
  jugadoresEntrenamiento.forEach(j => { if (!estadosAsistencia.has(j.id)) estadosAsistencia.set(j.id, { estado: 'presente', justificada: false, minutos_retraso: 0 }); });
  actualizarSelectorEjercicios(); renderizarAsistencia(); renderizarEjerciciosSesion(); actualizarEstadoAsistencia(); window.scrollTo({ top: 0, behavior: 'auto' });
}
function obtenerDatosEquiposSesion() {
  return {
    dosEquipos: true,
    tresEquipos: $('usarTresEquipos').checked,
    equipos2: [
      $('jugadoresEquipoA').value,
      $('jugadoresEquipoB').value,
      $('jugadoresComodines').value
    ],
    equipos3: [
      $('jugadoresEquipo3A').value,
      $('jugadoresEquipo3B').value,
      $('jugadoresEquipo3C').value
    ]
  };
}

function cargarEquiposSesion(sesion) {
  let equipos = sesion.equipos_sesion;

  if (typeof equipos === 'string') {
    try { equipos = JSON.parse(equipos); } catch { equipos = null; }
  }

  equipos = equipos && typeof equipos === 'object' ? equipos : {};

  $('usarTresEquipos').checked = Boolean(equipos.tresEquipos);
  $('jugadoresEquipoA').value = equipos.equipos2?.[0] || '';
  $('jugadoresEquipoB').value = equipos.equipos2?.[1] || '';
  $('jugadoresComodines').value = equipos.equipos2?.[2] || '';
  $('jugadoresEquipo3A').value = equipos.equipos3?.[0] || '';
  $('jugadoresEquipo3B').value = equipos.equipos3?.[1] || '';
  $('jugadoresEquipo3C').value = equipos.equipos3?.[2] || '';

  renderizarOpcionesEquiposSesion();
}

function renderizarOpcionesEquiposSesion() {
  const usarTres = $('usarTresEquipos').checked;

  $('distribucionTresEquipos').classList.toggle('oculto', !usarTres);
  document.querySelector('.distribuciones-equipos')
    .classList.toggle('con-tres-equipos', usarTres);
}

async function guardarEquiposSesion() {
  if (!sesionActual?.id) return;

  const boton = $('btnGuardarEquipos');
  boton.disabled = true;
  boton.textContent = 'Guardando…';

  try {
    const equipos = obtenerDatosEquiposSesion();
    const { data, error } = await supabaseClient
      .from('entrenamientos_sesiones')
      .update({ equipos_sesion: equipos })
      .eq('id', sesionActual.id)
      .select('*')
      .single();

    if (error) throw error;

    sesionActual = data;
    mostrarNotificacion('Equipos del entrenamiento guardados.', 'exito');
  } catch (error) {
    console.error(error);
    mostrarNotificacion(
      'No se pudieron guardar los equipos. Comprueba que has añadido la columna equipos_sesion en Supabase.',
      'error'
    );
  } finally {
    boton.disabled = false;
    boton.textContent = 'Guardar equipos';
  }
}

function volverAPlanificacion() { window.location.href = 'entrenamientos.html'; }
async function guardarDetalleSesion() {
  if (!sesionActual?.id) return;
  const fecha = $('detalleFecha').value; const titulo = $('detalleTitulo').value.trim(); const duracion = Number($('detalleDuracion').value); const duracionRealRaw = $('detalleDuracionReal').value;
  if (!fecha || !titulo || !Number.isFinite(duracion) || duracion < 1) { mostrarNotificacion('Indica nombre, fecha y una duración prevista válida.', 'error'); return; }
  const btns = [$('btnGuardarDetalleAbajo')].filter(Boolean); btns.forEach(b => { b.disabled = true; b.textContent = 'Guardando…'; });
  try {
    const payload = { titulo, fecha, duracion_prevista: duracion, duracion_real: duracionRealRaw === '' ? null : Number(duracionRealRaw), objetivo: $('detalleObjetivo').value.trim(), observaciones: $('detalleObservaciones').value.trim(), asistencia_confirmada: $('asistenciaConfirmada').checked };
    const { data, error } = await supabaseClient.from('entrenamientos_sesiones').update(payload).eq('id', sesionActual.id).select('*').single(); if (error) throw error;
    sesionActual = data; $('detalleTituloCabecera').textContent = titulo; $('detalleFechaEtiqueta').textContent = formatearFecha(fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    await guardarAsistenciaSilenciosa(); mostrarNotificacion('Sesión guardada.', 'exito');
  } catch (error) { console.error(error); mostrarNotificacion('No se pudieron guardar los cambios. Revisa Supabase.', 'error'); }
  finally { btns.forEach(b => { b.disabled = false; b.textContent = 'Guardar cambios'; }); }
}
