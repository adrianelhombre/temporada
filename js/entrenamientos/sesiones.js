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
async function cargarSemana() {
  const rango = rangoSemana(); if (!rango || !temporadaEntrenamientosId) return;
  $('rangoSemana').textContent = `${formatearFecha(rango.desde)} – ${formatearFecha(rango.hasta)}`;
  $('listaSesiones').innerHTML = '<div class="tarjeta estado-vacio">Cargando sesiones…</div>';
  const { data, error } = await supabaseClient.from('entrenamientos_sesiones').select('*').eq('temporada_id', temporadaEntrenamientosId).gte('fecha', rango.desde).lte('fecha', rango.hasta).order('fecha').order('hora_inicio');
  if (error) { console.error(error); $('listaSesiones').innerHTML = '<div class="tarjeta estado-vacio">No se pudieron cargar las sesiones. Comprueba la configuración de Supabase.</div>'; return; }
  sesionesSemana = data || []; renderizarSesiones();
}
function renderizarSesiones() {
  const cont = $('listaSesiones');
  if (!sesionesSemana.length) { cont.innerHTML = '<div class="tarjeta estado-vacio">Todavía no hay sesiones esta semana.<br>Usa <strong>+ Nueva sesión</strong> para crear la primera.</div>'; return; }
  cont.innerHTML = '';
  sesionesSemana.forEach(sesion => {
    const fecha = new Date(sesion.fecha + 'T12:00:00'); const dia = fecha.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const card = document.createElement('article'); card.className = 'tarjeta tarjeta-sesion'; card.tabIndex = 0; card.setAttribute('role', 'button');
    card.innerHTML = `<div class="fecha-sesion"><span>${escaparHTML(dia)}</span><strong>${fecha.getDate()}</strong></div><div class="info-sesion"><h3>${escaparHTML(sesion.titulo || 'Entrenamiento')}</h3><p>${escaparHTML(sesion.objetivo || 'Sin objetivo definido')}</p><div class="sesion-meta"><span class="pildora">${Number(sesion.duracion_prevista || 0)} min</span><span class="pildora ${sesion.asistencia_confirmada ? 'confirmada' : 'pendiente'}">${sesion.asistencia_confirmada ? 'Asistencia revisada' : 'Asistencia pendiente'}</span></div></div><span class="flecha-sesion">›</span>`;
    card.addEventListener('click', () => abrirDetalleSesion(sesion)); card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirDetalleSesion(sesion); } }); cont.appendChild(card);
  });
}

function abrirModalSesion() {
  $('sesionTitulo').value = 'Entrenamiento'; $('sesionFecha').value = $('fechaSemana').value || fechaISO(new Date()); $('sesionDuracion').value = 90; $('sesionObjetivo').value = ''; $('sesionObservaciones').value = '';
  $('modalSesion').classList.remove('oculto');
}
async function crearSesion() {
  const fecha = $('sesionFecha').value; const titulo = $('sesionTitulo').value.trim(); const duracion = Number($('sesionDuracion').value);
  if (!fecha || !titulo || !Number.isFinite(duracion) || duracion < 1) { mostrarNotificacion('Indica el nombre, la fecha y una duración válida.', 'error'); return; }
  const btn = $('btnGuardarSesion'); btn.disabled = true; btn.textContent = 'Creando…';
  try {
    const payload = { temporada_id: temporadaEntrenamientosId, fecha, titulo, duracion_prevista: duracion, objetivo: $('sesionObjetivo').value.trim(), observaciones: $('sesionObservaciones').value.trim(), asistencia_confirmada: false };
    const { data, error } = await supabaseClient.from('entrenamientos_sesiones').insert(payload).select('*').single(); if (error) throw error;
    cerrarModal('modalSesion'); $('fechaSemana').value = fechaISO(lunesDe(new Date(fecha + 'T12:00:00'))); await cargarSemana(); await abrirDetalleSesion(data);
    mostrarNotificacion('Sesión creada. Ya puedes añadir ejercicios y revisar la asistencia.', 'exito');
  } catch (error) { console.error(error); mostrarNotificacion('No se pudo crear la sesión. Revisa las tablas y políticas de Supabase.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Crear sesión'; }
}
async function abrirDetalleSesion(sesion) {
  sesionActual = sesion;
  $('zonaListado').classList.add('oculto'); $('vista-detalle-sesion').classList.remove('oculto');
  $('detalleTitulo').value = sesion.titulo || 'Entrenamiento'; $('detalleFecha').value = sesion.fecha || ''; $('detalleDuracion').value = sesion.duracion_prevista ?? 90; $('detalleDuracionReal').value = sesion.duracion_real ?? ''; $('detalleObjetivo').value = sesion.objetivo || ''; $('detalleObservaciones').value = sesion.observaciones || '';
  $('detalleTituloCabecera').textContent = sesion.titulo || 'Entrenamiento'; $('detalleFechaEtiqueta').textContent = formatearFecha(sesion.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('asistenciaConfirmada').checked = Boolean(sesion.asistencia_confirmada); $('panelAsistencia').classList.add('oculto'); $('btnAlternarAsistencia').setAttribute('aria-expanded', 'false'); $('btnAlternarAsistencia').querySelector('.asistencia-icono').textContent = '＋';
  estadosAsistencia = new Map(); ejerciciosSesion = [];
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
function volverAPlanificacion() { $('vista-detalle-sesion').classList.add('oculto'); $('zonaListado').classList.remove('oculto'); cambiarVista('planificacion'); cargarSemana(); }
async function guardarDetalleSesion() {
  if (!sesionActual?.id) return;
  const fecha = $('detalleFecha').value; const titulo = $('detalleTitulo').value.trim(); const duracion = Number($('detalleDuracion').value); const duracionRealRaw = $('detalleDuracionReal').value;
  if (!fecha || !titulo || !Number.isFinite(duracion) || duracion < 1) { mostrarNotificacion('Indica nombre, fecha y una duración prevista válida.', 'error'); return; }
  const btns = [$('btnGuardarDetalle'), $('btnGuardarDetalleAbajo')]; btns.forEach(b => { b.disabled = true; b.textContent = 'Guardando…'; });
  try {
    const payload = { titulo, fecha, duracion_prevista: duracion, duracion_real: duracionRealRaw === '' ? null : Number(duracionRealRaw), objetivo: $('detalleObjetivo').value.trim(), observaciones: $('detalleObservaciones').value.trim(), asistencia_confirmada: $('asistenciaConfirmada').checked };
    const { data, error } = await supabaseClient.from('entrenamientos_sesiones').update(payload).eq('id', sesionActual.id).select('*').single(); if (error) throw error;
    sesionActual = data; $('detalleTituloCabecera').textContent = titulo; $('detalleFechaEtiqueta').textContent = formatearFecha(fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    await guardarAsistenciaSilenciosa(); $('fechaSemana').value = fechaISO(lunesDe(new Date(fecha + 'T12:00:00'))); await cargarSemana(); mostrarNotificacion('Sesión guardada.', 'exito');
  } catch (error) { console.error(error); mostrarNotificacion('No se pudieron guardar los cambios. Revisa Supabase.', 'error'); }
  finally { btns.forEach(b => { b.disabled = false; b.textContent = 'Guardar cambios'; }); }
}
