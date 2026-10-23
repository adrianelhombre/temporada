let temporadaEntrenamientosId = null;
let jugadoresEntrenamiento = [];
let sesionesSemana = [];
let ejerciciosBiblioteca = [];
let estadosAsistencia = new Map();
let sesionActual = null;
let ejerciciosSesion = [];
let graficoActual = { version: 1, campo: 'entero', elementos: [] };
let herramientaGrafico = 'seleccionar';
let puntoInicialGrafico = null;
let puntoPrevisualizacionGrafico = null;
let elementoGraficoSeleccionado = null;
let arrastreGrafico = null;
let ejercicioArrastradoId = null;
let creandoZonaGrafico = null;
let zonaPrevisualizacionGrafico = null;

const $ = (id) => document.getElementById(id);
const CATEGORIAS_EJERCICIOS = ['Posesiones', 'Finalizaciones', 'Transiciones', 'Defensa', 'Físico', 'Partidos', 'Técnica', 'Otros'];
const NOMBRES_HERRAMIENTAS = { seleccionar: 'Mover / editar', jugadorA: 'Añadir jugador A', jugadorB: 'Añadir jugador B', comodin: 'Añadir comodín', flecha: 'Dibujar flecha (marca dos puntos)', linea: 'Dibujar línea (marca dos puntos)', cono: 'Añadir cono', porteria: 'Añadir portería', zona: 'Añadir zona', borrar: 'Borrar elemento' };

(async function iniciarEntrenamientos() {
  if (!await exigirSesion()) return;
  $('botonCerrarSesion')?.addEventListener('click', cerrarSesion);
  document.querySelectorAll('.tab-entrenamiento').forEach(btn => btn.addEventListener('click', () => cambiarVista(btn.dataset.vista)));
  $('fechaSemana').value = fechaISO(lunesDe(new Date()));
  $('fechaSemana').addEventListener('change', cargarSemana);
  $('btnNuevaSesion').addEventListener('click', () => abrirModalSesion());
  $('btnGuardarSesion').addEventListener('click', crearSesion);
  $('btnVolverSesiones').addEventListener('click', volverAPlanificacion);
  $('btnVolverSesionesAbajo').addEventListener('click', volverAPlanificacion);
  $('btnGuardarDetalle').addEventListener('click', guardarDetalleSesion);
  $('btnGuardarDetalleAbajo').addEventListener('click', guardarDetalleSesion);
  $('btnGuardarAsistencia').addEventListener('click', guardarAsistencia);
  $('btnAlternarAsistencia').addEventListener('click', alternarAsistencia);
  $('btnCrearEjercicioDesdeSesion').addEventListener('click', () => abrirModalEjercicio());
  $('btnNuevoEjercicio').addEventListener('click', () => abrirModalEjercicio());
  $('btnGuardarEjercicio').addEventListener('click', guardarEjercicio);
  $('buscarEjercicio').addEventListener('input', renderizarEjercicios);
  $('buscarEjercicioSesion').addEventListener('input', actualizarSelectorEjercicios);
  ['graficoColor', 'graficoDiscontinua'].forEach(id => { $(id).addEventListener('input', actualizarEstiloSeleccionadoEnVivo); $(id).addEventListener('change', actualizarEstiloSeleccionadoEnVivo); });
  $('graficoEtiquetaJugador').addEventListener('input', actualizarEtiquetaJugadorSeleccionado);
  $('filtroCategoria').addEventListener('change', renderizarEjercicios);
  $('graficoTipoCampo').addEventListener('change', () => { graficoActual.campo = $('graficoTipoCampo').value; renderizarGraficoCampo(); });
  document.querySelectorAll('[data-herramienta]').forEach(btn => btn.addEventListener('click', () => seleccionarHerramienta(btn.dataset.herramienta)));
  $('btnLimpiarGrafico').addEventListener('click', () => { if (confirm('¿Quieres quitar todos los elementos del campo?')) { graficoActual.elementos = []; puntoInicialGrafico = null; renderizarGraficoCampo(); } });
  $('graficoCampo').addEventListener('pointerdown', manejarPulsacionCampo);
  $('graficoCampo').addEventListener('pointermove', evento => { moverElementoGrafico(evento); if (creandoZonaGrafico) { zonaPrevisualizacionGrafico = coordenadasCampo(evento); renderizarGraficoCampo(); } else if (puntoInicialGrafico && !arrastreGrafico) { puntoPrevisualizacionGrafico = coordenadasCampo(evento); renderizarGraficoCampo(); } });
  $('graficoCampo').addEventListener('pointerup', evento => { if (creandoZonaGrafico) finalizarCreacionZona(evento); else terminarArrastreGrafico(evento); });
  $('graficoCampo').addEventListener('pointercancel', evento => { creandoZonaGrafico = null; zonaPrevisualizacionGrafico = null; terminarArrastreGrafico(evento); renderizarGraficoCampo(); });
  document.querySelectorAll('[data-cerrar]').forEach(btn => btn.addEventListener('click', () => cerrarModal(btn.dataset.cerrar)));
  document.querySelectorAll('.superposicion').forEach(modal => modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(modal.id); }));
  try {
    await cargarTemporada();
    await Promise.all([cargarJugadores(), cargarEjercicios()]);
    await cargarSemana();
  } catch (error) {
    console.error(error);
    mostrarNotificacion('No se pudo iniciar Entrenamientos. Comprueba que has ejecutado el SQL de configuración.', 'error');
  }
})();

function cambiarVista(vista) {
  $('zonaListado').classList.remove('oculto');
  $('vista-detalle-sesion').classList.add('oculto');
  document.querySelectorAll('.tab-entrenamiento').forEach(btn => btn.classList.toggle('activa', btn.dataset.vista === vista));
  $('vista-planificacion').classList.toggle('oculto', vista !== 'planificacion');
  $('vista-biblioteca').classList.toggle('oculto', vista !== 'biblioteca');
}
function fechaISO(fecha) { const d = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
function lunesDe(fecha) { const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()); const dia = d.getDay() || 7; d.setDate(d.getDate() - dia + 1); return d; }
function formatearFecha(fecha, opciones = { day: '2-digit', month: '2-digit', year: 'numeric' }) { if (!fecha) return 'Sin fecha'; return new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', opciones); }
function rangoSemana() { const inicio = $('fechaSemana').value; if (!inicio) return null; const lunes = lunesDe(new Date(inicio + 'T12:00:00')); const desde = fechaISO(lunes); const domingo = new Date(lunes); domingo.setDate(domingo.getDate() + 6); return { desde, hasta: fechaISO(domingo) }; }
function escaparHTML(valor) { return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

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
function alternarAsistencia() {
  const abierto = $('panelAsistencia').classList.contains('oculto'); $('panelAsistencia').classList.toggle('oculto', !abierto); $('btnAlternarAsistencia').setAttribute('aria-expanded', String(abierto)); $('btnAlternarAsistencia').querySelector('.asistencia-icono').textContent = abierto ? '−' : '＋'; $('btnAlternarAsistencia').querySelector('.asistencia-chevron').textContent = abierto ? '⌃' : '⌄';
}
function renderizarAsistencia() {
  const cont = $('listaAsistencia');
  if (!jugadoresEntrenamiento.length) { cont.innerHTML = '<p class="texto-secundario">No hay jugadores activos en la plantilla.</p>'; actualizarContadorAsistencia(); return; }
  cont.innerHTML = '';
  jugadoresEntrenamiento.forEach(j => {
    const estado = estadosAsistencia.get(j.id) || { estado: 'presente', justificada: false, minutos_retraso: 0 };
    const fila = document.createElement('div'); fila.className = 'fila-asistencia'; const nombre = document.createElement('div'); nombre.className = 'nombre-asistencia';
    nombre.innerHTML = `${j.dorsal != null ? `<small>#${escaparHTML(j.dorsal)}</small>` : '<small>Jugador</small>'}${escaparHTML(j.nombre)}`;
    const controles = document.createElement('div'); controles.className = 'controles-asistencia';
    [['presente', 'Presente'], ['ausente', 'Ausente'], ['retraso', 'Retraso']].forEach(([valor, texto]) => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = `opcion-asistencia ${estado.estado === valor ? 'seleccionada' : ''}`; btn.dataset.estado = valor; btn.textContent = texto;
      btn.addEventListener('click', () => { const actual = estadosAsistencia.get(j.id); actual.estado = valor; if (valor !== 'retraso') actual.minutos_retraso = 0; if (valor !== 'ausente') actual.justificada = false; estadosAsistencia.set(j.id, actual); renderizarAsistencia(); }); controles.appendChild(btn);
    });
    if (estado.estado === 'retraso') { const minutos = document.createElement('input'); minutos.type = 'number'; minutos.min = '1'; minutos.max = '180'; minutos.className = 'retraso-minutos'; minutos.setAttribute('aria-label', `Minutos de retraso de ${j.nombre}`); minutos.placeholder = 'Min'; minutos.value = estado.minutos_retraso || ''; minutos.addEventListener('change', () => { const actual = estadosAsistencia.get(j.id); actual.minutos_retraso = Math.min(180, Math.max(1, Number(minutos.value || 1))); estadosAsistencia.set(j.id, actual); actualizarContadorAsistencia(); }); controles.appendChild(minutos); }
    if (estado.estado === 'ausente') { const label = document.createElement('label'); label.className = 'justificada-control'; const check = document.createElement('input'); check.type = 'checkbox'; check.checked = estado.justificada; check.addEventListener('change', () => { const actual = estadosAsistencia.get(j.id); actual.justificada = check.checked; estadosAsistencia.set(j.id, actual); }); label.append(check, document.createTextNode('Justificada')); controles.appendChild(label); }
    fila.append(nombre, controles); cont.appendChild(fila);
  }); actualizarContadorAsistencia();
}
function actualizarContadorAsistencia() {
  let presentes = 0, ausentes = 0, retrasos = 0;
  estadosAsistencia.forEach(a => { if (a.estado === 'presente') presentes++; else if (a.estado === 'ausente') ausentes++; else retrasos++; });
  const resumen = `${presentes} presentes · ${retrasos} retrasos · ${ausentes} ausentes`;
  $('contadorAsistencia').textContent = `${presentes}P · ${retrasos}R · ${ausentes}A`; $('resumenAsistencia').textContent = resumen; actualizarEstadoAsistencia();
}
function actualizarEstadoAsistencia() {
  const confirmado = Boolean(sesionActual?.asistencia_confirmada || $('asistenciaConfirmada')?.checked);
  $('detalleEstadoAsistencia').textContent = confirmado ? 'Asistencia revisada' : 'Asistencia pendiente'; $('detalleEstadoAsistencia').classList.toggle('confirmada', confirmado); $('detalleEstadoAsistencia').classList.toggle('pendiente', !confirmado);
}
function filasAsistencia(sesionId) { return jugadoresEntrenamiento.map(j => { const a = estadosAsistencia.get(j.id) || { estado: 'presente', justificada: false, minutos_retraso: 0 }; return { sesion_id: sesionId, jugador_id: j.id, estado: a.estado, justificada: a.estado === 'ausente' ? Boolean(a.justificada) : false, minutos_retraso: a.estado === 'retraso' ? Math.min(180, Math.max(1, Number(a.minutos_retraso || 1))) : 0 }; }); }
async function guardarAsistencia() {
  if (!sesionActual?.id) return;
  const btn = $('btnGuardarAsistencia'); btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    const filas = filasAsistencia(sesionActual.id);
    if (filas.length) { const { error } = await supabaseClient.from('entrenamientos_asistencia').upsert(filas, { onConflict: 'sesion_id,jugador_id' }); if (error) throw error; }
    const confirmado = $('asistenciaConfirmada').checked;
    const { error: errorSesion } = await supabaseClient.from('entrenamientos_sesiones').update({ asistencia_confirmada: confirmado }).eq('id', sesionActual.id); if (errorSesion) throw errorSesion;
    sesionActual.asistencia_confirmada = confirmado; actualizarEstadoAsistencia(); await cargarSemana(); mostrarNotificacion('Asistencia guardada.', 'exito');
  } catch (error) { console.error(error); mostrarNotificacion('No se pudo guardar la asistencia. Revisa Supabase.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Guardar asistencia'; }
}
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
async function guardarAsistenciaSilenciosa() {
  const filas = filasAsistencia(sesionActual.id);
  if (filas.length) { const { error } = await supabaseClient.from('entrenamientos_asistencia').upsert(filas, { onConflict: 'sesion_id,jugador_id' }); if (error) throw error; }
}

function actualizarSelectorEjercicios() {
  const cont = $('resultadosEjerciciosSesion'); if (!cont) return;
  const buscar = ($('buscarEjercicioSesion')?.value || '').trim().toLocaleLowerCase('es');
  let lista = ejerciciosBiblioteca.filter(e => !buscar || `${e.nombre} ${e.categoria || ''} ${e.objetivo || ''} ${e.descripcion || ''}`.toLocaleLowerCase('es').includes(buscar));
  lista = lista.slice(0, 8);
  if (!lista.length) { cont.innerHTML = `<div class="resultado-ejercicio-vacio">${buscar ? 'No hay coincidencias. Prueba con otra búsqueda o crea un ejercicio.' : 'Empieza a escribir para buscar entre los ejercicios disponibles.'}</div>`; return; }
  cont.innerHTML = lista.map(e => `<button type="button" class="resultado-ejercicio-sesion" role="option" data-anadir-ejercicio="${escaparHTML(e.id)}"><span class="resultado-ejercicio-icono">＋</span><span class="resultado-ejercicio-info"><strong>${escaparHTML(e.nombre)}</strong><small>${escaparHTML(e.categoria || 'Otros')} · ${Number(e.duracion_min || 0)} min${e.objetivo ? ` · ${escaparHTML(e.objetivo)}` : ''}</small></span><span class="resultado-ejercicio-accion">Añadir</span></button>`).join('');
  cont.querySelectorAll('[data-anadir-ejercicio]').forEach(btn => btn.addEventListener('click', () => anadirEjercicioASesion(btn.dataset.anadirEjercicio)));
}
function renderizarEjerciciosSesion() {
  const cont = $('ejerciciosDeSesion'); if (!cont) return;
  if (!ejerciciosSesion.length) { cont.innerHTML = '<div class="tarjeta estado-vacio">Todavía no has añadido ejercicios. Selecciona uno de la biblioteca o créalo desde la pestaña Biblioteca de ejercicios.</div>'; return; }
  cont.innerHTML = '';
  ejerciciosSesion.forEach((item, index) => {
    const articulo = document.createElement('article'); articulo.className = 'tarjeta ejercicio-sesion-detalle'; articulo.draggable = true; articulo.dataset.ordenId = item.id; articulo.title = 'Arrastra para cambiar el orden';
    articulo.addEventListener('dragstart', ev => { ejercicioArrastradoId = item.id; articulo.classList.add('arrastrando-ejercicio'); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(item.id)); });
    articulo.addEventListener('dragend', () => { ejercicioArrastradoId = null; cont.querySelectorAll('.arrastrando-ejercicio,.destino-arrastre-ejercicio').forEach(el => el.classList.remove('arrastrando-ejercicio', 'destino-arrastre-ejercicio')); });
    articulo.addEventListener('dragover', ev => { ev.preventDefault(); if (ejercicioArrastradoId && ejercicioArrastradoId !== item.id) articulo.classList.add('destino-arrastre-ejercicio'); });
    articulo.addEventListener('dragleave', () => articulo.classList.remove('destino-arrastre-ejercicio'));
    articulo.addEventListener('drop', async ev => { ev.preventDefault(); articulo.classList.remove('destino-arrastre-ejercicio'); const fromId = ejercicioArrastradoId || ev.dataTransfer.getData('text/plain'); if (!fromId || fromId === item.id) return; const arr = [...ejerciciosSesion]; const from = arr.findIndex(x => String(x.id) === String(fromId)); const to = arr.findIndex(x => String(x.id) === String(item.id)); if (from < 0 || to < 0) return; const [moved] = arr.splice(from, 1); arr.splice(to, 0, moved); await guardarOrdenEjercicios(arr); });
    const grafico = normalizarGrafico(item.grafico_snapshot);
    articulo.innerHTML = `<div class="ejercicio-sesion-detalle-cabecera"><div class="numero-ejercicio">${index + 1}</div><div class="ejercicio-sesion-titulo"><h4>${escaparHTML(item.nombre_snapshot || 'Ejercicio')}</h4><div class="sesion-meta"><span class="pildora">${Number(item.duracion_prevista || 0)} min</span><span class="ejercicio-categoria">${escaparHTML(item.categoria_snapshot || 'Otros')}</span></div></div><button type="button" class="boton-mini peligro" data-quitar="${escaparHTML(item.id)}">Quitar</button></div>
      <div class="ejercicio-sesion-contenido"><div class="grafico-miniatura">${crearSVGGrafico(grafico, `ejercicio-${index}`)}</div><div class="ejercicio-sesion-texto">${item.objetivo_snapshot ? `<p><strong>Objetivo:</strong> ${escaparHTML(item.objetivo_snapshot)}</p>` : ''}<p class="descripcion-ejercicio-sesion">${escaparHTML(item.descripcion_snapshot || 'Sin descripción añadida.')}</p>${item.material_snapshot ? `<p class="texto-secundario"><strong>Material:</strong> ${escaparHTML(item.material_snapshot)}</p>` : ''}<label for="duracion-real-${escaparHTML(item.id)}">Duración real (min)</label><input type="number" min="0" max="240" id="duracion-real-${escaparHTML(item.id)}" class="duracion-real-ejercicio" value="${item.duracion_real ?? ''}" placeholder="Sin registrar" data-duracion-real="${escaparHTML(item.id)}"><label for="observaciones-ejercicio-${escaparHTML(item.id)}">Notas de la tarea</label><textarea rows="2" id="observaciones-ejercicio-${escaparHTML(item.id)}" data-observaciones-ejercicio="${escaparHTML(item.id)}" placeholder="Correcciones o ajustes realizados">${escaparHTML(item.observaciones || '')}</textarea><button type="button" class="boton-mini" data-guardar-ejercicio="${escaparHTML(item.id)}">Guardar datos de la tarea</button></div></div>`;
    articulo.querySelector('[data-quitar]').addEventListener('click', async () => {
      if (!confirm(`¿Quitar «${item.nombre_snapshot}» de esta sesión?`)) return;
      const { error } = await supabaseClient.from('entrenamientos_sesion_ejercicios').delete().eq('id', item.id); if (error) { console.error(error); mostrarNotificacion('No se pudo quitar el ejercicio.', 'error'); return; }
      ejerciciosSesion = ejerciciosSesion.filter(x => x.id !== item.id); renderizarEjerciciosSesion();
    });
    articulo.querySelector('[data-guardar-ejercicio]').addEventListener('click', async () => {
      const duracionInput = articulo.querySelector(`[data-duracion-real="${item.id}"]`); const obsInput = articulo.querySelector(`[data-observaciones-ejercicio="${item.id}"]`);
      const raw = duracionInput.value; const payload = { duracion_real: raw === '' ? null : Number(raw), observaciones: obsInput.value.trim() };
      if (payload.duracion_real !== null && (!Number.isFinite(payload.duracion_real) || payload.duracion_real < 0 || payload.duracion_real > 240)) { mostrarNotificacion('La duración real debe estar entre 0 y 240 minutos.', 'error'); return; }
      const { data, error } = await supabaseClient.from('entrenamientos_sesion_ejercicios').update(payload).eq('id', item.id).select('*').single(); if (error) { console.error(error); mostrarNotificacion('No se pudieron guardar los datos de la tarea.', 'error'); return; }
      ejerciciosSesion = ejerciciosSesion.map(x => x.id === item.id ? data : x); mostrarNotificacion('Datos de la tarea guardados.', 'exito');
    });
    cont.appendChild(articulo);
  });
  actualizarSelectorEjercicios();
}
async function guardarOrdenEjercicios(lista) {
  const cont = $('ejerciciosDeSesion'); cont?.querySelectorAll('.ejercicio-sesion-detalle').forEach(el => el.classList.add('guardando-orden-ejercicios'));
  try {
    for (let i = 0; i < lista.length; i++) { const { error } = await supabaseClient.from('entrenamientos_sesion_ejercicios').update({ orden: i }).eq('id', lista[i].id); if (error) throw error; }
    ejerciciosSesion = lista.map((x, i) => ({ ...x, orden: i })); renderizarEjerciciosSesion(); mostrarNotificacion('Orden de ejercicios actualizado.', 'exito');
  } catch (error) { console.error(error); mostrarNotificacion('No se pudo guardar el nuevo orden de ejercicios.', 'error'); }
}

async function anadirEjercicioASesion(ejercicioId) {
  if (!sesionActual?.id) return;
  const ejercicio = ejerciciosBiblioteca.find(e => e.id === ejercicioId); if (!ejercicio) { mostrarNotificacion('Selecciona un ejercicio de la biblioteca.', 'error'); return; }
  const snapshot = { sesion_id: sesionActual.id, ejercicio_id: ejercicio.id, orden: ejerciciosSesion.length, nombre_snapshot: ejercicio.nombre, categoria_snapshot: ejercicio.categoria || 'Otros', objetivo_snapshot: ejercicio.objetivo || '', descripcion_snapshot: ejercicio.descripcion || '', material_snapshot: ejercicio.material || '', duracion_prevista: Number(ejercicio.duracion_min || 12), grafico_snapshot: normalizarGrafico(ejercicio.grafico_json) };
  const { data, error } = await supabaseClient.from('entrenamientos_sesion_ejercicios').insert(snapshot).select('*').single();
  if (error) { console.error(error); mostrarNotificacion('No se pudo añadir el ejercicio.', 'error'); return; }
  ejerciciosSesion.push(data); $('buscarEjercicioSesion').value = ''; actualizarSelectorEjercicios(); renderizarEjerciciosSesion(); mostrarNotificacion('Ejercicio añadido a la sesión.', 'exito');
}

async function cargarEjercicios() {
  const { data, error } = await supabaseClient.from('entrenamientos_ejercicios').select('*').eq('temporada_id', temporadaEntrenamientosId).order('nombre');
  if (error) throw error; ejerciciosBiblioteca = data || []; renderizarEjercicios(); actualizarSelectorEjercicios();
}
function renderizarEjercicios() {
  if (!$('listaEjercicios')) return;
  const buscar = ($('buscarEjercicio')?.value || '').trim().toLocaleLowerCase('es'); const categoria = $('filtroCategoria')?.value || '';
  const lista = ejerciciosBiblioteca.filter(e => (!categoria || e.categoria === categoria) && (!buscar || `${e.nombre} ${e.objetivo || ''} ${e.descripcion || ''}`.toLocaleLowerCase('es').includes(buscar)));
  const cont = $('listaEjercicios');
  if (!lista.length) { cont.innerHTML = '<div class="tarjeta estado-vacio">No hay ejercicios que coincidan. Crea uno nuevo para empezar la biblioteca.</div>'; return; }
  cont.innerHTML = '';
  lista.forEach(e => {
    const card = document.createElement('article'); card.className = 'tarjeta tarjeta-ejercicio'; const grafico = normalizarGrafico(e.grafico_json);
    card.innerHTML = `
      <div class="ejercicio-cabecera">
        <h3>${escaparHTML(e.nombre)}</h3>
        <div class="ejercicio-acciones">
          <button class="boton-mini" data-editar="${escaparHTML(e.id)}">Editar</button>
          <button class="boton-mini peligro" data-borrar="${escaparHTML(e.id)}">Borrar</button>
        </div>
      </div>
      <div class="categoria-pildora">
        <span class="ejercicio-categoria">${escaparHTML(e.categoria || 'Otros')}</span>
        <span class="pildora">${Number(e.duracion_min || 0)} min</span>
      </div>
      
      <div class="grafico-miniatura biblioteca-grafico">${crearSVGGrafico(grafico, `biblioteca-${e.id}`)}</div>${e.objetivo ? `<p><strong>Objetivo:</strong> ${escaparHTML(e.objetivo)}</p>` : ''}<p class="texto-secundario descripcion-biblioteca">${escaparHTML(e.descripcion || 'Sin descripción añadida.')}</p>${e.material ? `<p class="texto-secundario"><strong>Material:</strong> ${escaparHTML(e.material)}</p>` : ''}`;
    card.querySelector('[data-editar]').addEventListener('click', () => abrirModalEjercicio(e)); card.querySelector('[data-borrar]').addEventListener('click', () => eliminarEjercicio(e)); cont.appendChild(card);
  });
}
function abrirModalEjercicio(ejercicio = null) {
  $('tituloModalEjercicio').textContent = ejercicio ? 'Editar ejercicio' : 'Nuevo ejercicio'; $('ejercicioId').value = ejercicio?.id || ''; $('ejercicioNombre').value = ejercicio?.nombre || ''; $('ejercicioCategoria').value = ejercicio?.categoria || 'Posesiones'; $('ejercicioDuracion').value = ejercicio?.duracion_min ?? 12; $('ejercicioObjetivo').value = ejercicio?.objetivo || ''; $('ejercicioDescripcion').value = ejercicio?.descripcion || ''; $('ejercicioMaterial').value = ejercicio?.material || '';
  graficoActual = normalizarGrafico(ejercicio?.grafico_json); elementoGraficoSeleccionado = null; arrastreGrafico = null; creandoZonaGrafico = null; zonaPrevisualizacionGrafico = null; puntoInicialGrafico = null; puntoPrevisualizacionGrafico = null; $('graficoTipoCampo').value = graficoActual.campo; seleccionarHerramienta('seleccionar'); renderizarGraficoCampo(); $('modalEjercicio').classList.remove('oculto');
}
async function guardarEjercicio() {
  const nombre = $('ejercicioNombre').value.trim(); const duracion = Number($('ejercicioDuracion').value);
  if (!nombre || !Number.isFinite(duracion) || duracion < 1) { mostrarNotificacion('Indica un nombre y una duración válida.', 'error'); return; }
  const payload = { temporada_id: temporadaEntrenamientosId, nombre, categoria: $('ejercicioCategoria').value, duracion_min: duracion, objetivo: $('ejercicioObjetivo').value.trim(), descripcion: $('ejercicioDescripcion').value.trim(), material: $('ejercicioMaterial').value.trim(), grafico_json: normalizarGrafico(graficoActual) };
  const id = $('ejercicioId').value; const btn = $('btnGuardarEjercicio'); btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    const result = id ? await supabaseClient.from('entrenamientos_ejercicios').update(payload).eq('id', id) : await supabaseClient.from('entrenamientos_ejercicios').insert(payload);
    if (result.error) throw result.error; cerrarModal('modalEjercicio'); await cargarEjercicios(); mostrarNotificacion('Ejercicio guardado en la biblioteca.', 'exito');
  } catch (error) { console.error(error); mostrarNotificacion('No se pudo guardar el ejercicio. Comprueba que la tabla tiene la columna grafico_json.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Guardar ejercicio'; }
}
async function eliminarEjercicio(ejercicio) {
  if (!confirm(`¿Eliminar el ejercicio «${ejercicio.nombre}» de la biblioteca?`)) return;
  const { error } = await supabaseClient.from('entrenamientos_ejercicios').delete().eq('id', ejercicio.id); if (error) { console.error(error); mostrarNotificacion('No se pudo eliminar. Puede estar vinculado a una sesión.', 'error'); return; }
  await cargarEjercicios(); mostrarNotificacion('Ejercicio eliminado.', 'exito');
}
function cerrarModal(id) { $(id)?.classList.add('oculto'); }

// Editor gráfico del ejercicio: SVG responsive con coordenadas normalizadas 0–1000 × 0–600.
function normalizarGrafico(grafico) {
  let g = grafico;
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = null; } }
  if (!g || typeof g !== 'object') g = { version: 1, campo: 'entero', elementos: [] };
  return { version: 1, campo: g.campo === 'medio' ? 'medio' : 'entero', elementos: Array.isArray(g.elementos) ? g.elementos.map((e, i) => ({ ...e, id: e.id || `el-${i}-${Math.round((Number(e.x) || 0) * 10)}` })) : [] };
}
function seleccionarHerramienta(herramienta) {
  herramientaGrafico = herramienta; puntoInicialGrafico = null; puntoPrevisualizacionGrafico = null; creandoZonaGrafico = null; zonaPrevisualizacionGrafico = null;
  document.querySelectorAll('[data-herramienta]').forEach(btn => btn.classList.toggle('activa', btn.dataset.herramienta === herramienta));
  $('estadoHerramienta').textContent = `Herramienta: ${NOMBRES_HERRAMIENTAS[herramienta] || herramienta}`;
  $('graficoCampo').style.cursor = herramienta === 'seleccionar' ? 'grab' : herramienta === 'borrar' ? 'not-allowed' : 'crosshair';
}
function renderizarGraficoCampo() {
  const svg = $('graficoCampo'); if (!svg) return;
  let preview = '';
  if (puntoInicialGrafico && puntoPrevisualizacionGrafico) preview += dibujarElemento({ id: 'previsualizacion', tipo: herramientaGrafico, x: puntoInicialGrafico.x, y: puntoInicialGrafico.y, puntos: [puntoInicialGrafico, puntoPrevisualizacionGrafico], color: $('graficoColor')?.value || '#facc15', discontinua: $('graficoDiscontinua')?.checked }, false).replace('<g ', '<g opacity=".65" ');
  if (creandoZonaGrafico && zonaPrevisualizacionGrafico) { const a = creandoZonaGrafico, b = zonaPrevisualizacionGrafico; preview += dibujarElemento({ id: 'zona-preview', tipo: 'zona', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: Math.max(30, Math.abs(b.x - a.x)), h: Math.max(30, Math.abs(b.y - a.y)), color: $('graficoColor')?.value || '#facc15', discontinua: $('graficoDiscontinua')?.checked, etiqueta: 'Zona' }, false).replace('<g ', '<g opacity=".65" '); }
  svg.innerHTML = dibujoBaseCampo(graficoActual.campo) + graficoActual.elementos.map(elemento => dibujarElemento(elemento, true)).join('') + preview;
  const selected = graficoActual.elementos.find(e => String(e.id) === String(elementoGraficoSeleccionado));
  if (selected && ['linea', 'flecha', 'zona'].includes(selected.tipo)) {
    let handles = '';
    if (selected.tipo === 'zona') { const w = Number(selected.w) || 150, h = Number(selected.h) || 110; handles = `<rect x="${selected.x - w / 2 - 6}" y="${selected.y - h / 2 - 6}" width="${w + 12}" height="${h + 12}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 4" pointer-events="none"/><circle data-resize-zona="se" cx="${selected.x + w / 2}" cy="${selected.y + h / 2}" r="10" fill="#fff" stroke="#111827" stroke-width="3"/>`; }
    else { (selected.puntos || []).slice(0, 2).forEach((p, i) => { handles += `<circle data-punto-linea="${i}" cx="${p.x}" cy="${p.y}" r="10" fill="#fff" stroke="#111827" stroke-width="3"/>`; }); }
    svg.insertAdjacentHTML('beforeend', `<g data-elemento-id="${escaparHTML(selected.id)}" class="controles-elemento-seleccionado">${handles}</g>`);
  }
}
function crearSVGGrafico(grafico, sufijo = 'preview') { const g = normalizarGrafico(grafico); return `<svg class="campo-svg-lectura" viewBox="0 0 1000 600" role="img" aria-label="Campo gráfico del ejercicio ${escaparHTML(sufijo)}">${dibujoBaseCampo(g.campo)}${g.elementos.map(e => dibujarElemento(e, false)).join('')}</svg>`; }
function dibujoBaseCampo(tipo) {
  const base = `<rect x="0" y="0" width="1000" height="600" rx="2" fill="#438b42"/>`;
  let franjas = ''; for (let i = 0; i < 10; i++) franjas += `<rect x="${i * 100}" y="0" width="100" height="600" fill="${i % 2 ? '#438b42' : '#4b9849'}"/>`;
  if (tipo === 'medio') return `${base}${franjas}<g fill="none" stroke="#fff" stroke-width="4"><rect x="12" y="12" width="976" height="576"/><line x1="12" y1="588" x2="988" y2="588"/><rect x="330" y="12" width="340" height="155"/><rect x="405" y="12" width="190" height="72"/><path d="M 390 167 A 110 110 0 0 0 610 167"/><circle cx="500" cy="167" r="4" fill="#fff"/></g><g fill="none" stroke="#fff" stroke-width="5"><path d="M 445 12 L 445 3 L 555 3 L 555 12"/><path d="M 12 588 L 988 588" stroke-width="3"/></g>`;
  return `${base}${franjas}<g fill="none" stroke="#fff" stroke-width="4"><rect x="12" y="12" width="976" height="576"/><line x1="500" y1="12" x2="500" y2="588"/><circle cx="500" cy="300" r="82"/><circle cx="500" cy="300" r="4" fill="#fff"/><rect x="12" y="180" width="170" height="240"/><rect x="12" y="235" width="70" height="130"/><rect x="818" y="180" width="170" height="240"/><rect x="918" y="235" width="70" height="130"/><path d="M 182 230 A 90 90 0 0 1 182 370"/><path d="M 818 230 A 90 90 0 0 0 818 370"/></g>`;
}
function dibujarElemento(e, interactivo) {
  const id = escaparHTML(e.id || ''); const x = clamp(Number(e.x) || 0, 0, 1000); const y = clamp(Number(e.y) || 0, 0, 600); const data = interactivo ? `data-elemento-id="${id}"` : '';
  if (e.tipo === 'jugador') { const equipoB = e.equipo === 'B'; const comodin = e.equipo === 'C'; const fill = comodin ? '#38bdf8' : equipoB ? '#f8fafc' : '#facc15'; const stroke = comodin ? '#075985' : equipoB ? '#1f2937' : '#111827'; return `<g ${data} transform="translate(${x} ${y})" class="${interactivo ? 'elemento-arrastrable' : ''}"><circle r="21" fill="${fill}" stroke="${stroke}" stroke-width="3"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-size="${String(e.etiqueta || '').length > 2 ? 12 : 16}" font-weight="800" fill="#111827" pointer-events="none">${escaparHTML(e.etiqueta || (comodin ? 'C' : equipoB ? 'B' : 'A'))}</text></g>`; }
  if (e.tipo === 'cono') return `<g ${data} transform="translate(${x} ${y})" class="${interactivo ? 'elemento-arrastrable' : ''}"><path d="M -15 13 L 0 -18 L 15 13 Z" fill="#f97316" stroke="#7c2d12" stroke-width="2"/><ellipse cx="0" cy="13" rx="17" ry="5" fill="#fdba74" stroke="#7c2d12" stroke-width="2"/></g>`;
  if (e.tipo === 'porteria') return `<g ${data} transform="translate(${x} ${y})" class="${interactivo ? 'elemento-arrastrable' : ''}" fill="none" stroke="#fff" stroke-width="4"><path d="M-34 18 L-34 -20 Q-34 -25 -29 -25 L29 -25 Q34 -25 34 -20 L34 18" stroke="#111827" stroke-width="8" opacity=".35"/><path d="M-34 18 L-34 -20 Q-34 -25 -29 -25 L29 -25 Q34 -25 34 -20 L34 18"/><path d="M-34 -4 L34 -4 M-34 7 L34 7 M-17 -25 L-17 18 M0 -25 L0 18 M17 -25 L17 18" stroke-width="1.4" opacity=".85"/><path d="M-34 18 L34 18" stroke-width="5"/></g>`;
  if (e.tipo === 'zona') { const w = Number(e.w) || 150, h = Number(e.h) || 110; return `<g ${data} class="${interactivo ? 'elemento-arrastrable' : ''}"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${escaparHTML(e.color || '#facc15')}" fill-opacity=".18" stroke="${escaparHTML(e.color || '#facc15')}" stroke-width="3" stroke-dasharray="${e.discontinua === false ? 'none' : '8 5'}"/></g>`; }
  if (e.tipo === 'flecha' || e.tipo === 'linea') { const p = Array.isArray(e.puntos) && e.puntos.length >= 2 ? e.puntos : [{ x, y }, { x: Math.min(1000, x + 100), y }]; const p1 = p[0], p2 = p[1]; const color = e.color || (e.equipo === 'B' ? '#ffffff' : '#facc15'); const marcador = e.tipo === 'flecha' ? `marker-end="url(#flecha-${id})"` : ''; return `<g ${data} class="${interactivo ? 'elemento-arrastrable' : ''}"><defs><marker id="flecha-${id}" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="${escaparHTML(color)}"/></marker></defs><line x1="${clamp(Number(p1.x) || 0, 0, 1000)}" y1="${clamp(Number(p1.y) || 0, 0, 600)}" x2="${clamp(Number(p2.x) || 0, 0, 1000)}" y2="${clamp(Number(p2.y) || 0, 0, 600)}" stroke="${escaparHTML(color)}" stroke-width="6" stroke-linecap="round" ${e.discontinua ? 'stroke-dasharray="12 9"' : ''} ${marcador}/><line x1="${clamp(Number(p1.x) || 0, 0, 1000)}" y1="${clamp(Number(p1.y) || 0, 0, 600)}" x2="${clamp(Number(p2.x) || 0, 0, 1000)}" y2="${clamp(Number(p2.y) || 0, 0, 600)}" stroke="transparent" stroke-width="22"/></g>`; }
  return '';
}
function actualizarEstiloSeleccionadoEnVivo() {
  const el = graficoActual.elementos.find(e => String(e.id) === String(elementoGraficoSeleccionado));
  if (!el || !['linea', 'flecha', 'zona'].includes(el.tipo)) return;
  el.color = $('graficoColor').value || '#facc21'; el.discontinua = $('graficoDiscontinua').checked;
  renderizarGraficoCampo();
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function coordenadasCampo(evento) { const svg = $('graficoCampo'); const rect = svg.getBoundingClientRect(); return { x: clamp((evento.clientX - rect.left) / rect.width * 1000, 0, 1000), y: clamp((evento.clientY - rect.top) / rect.height * 600, 0, 600) }; }
function manejarPulsacionCampo(evento) {
  const svg = $('graficoCampo'); const grupo = evento.target.closest('[data-elemento-id]');
  if (herramientaGrafico === 'seleccionar' && grupo) {
    const id = grupo.getAttribute('data-elemento-id'); const el = graficoActual.elementos.find(x => String(x.id) === id); if (!el) return;
    const handlePunto = evento.target.closest('[data-punto-linea]'); const handleZona = evento.target.closest('[data-resize-zona]');
    elementoGraficoSeleccionado = id; cargarControlesElemento(el);
    if (el.tipo === 'jugador' && evento.detail >= 2) { $('graficoEtiquetaJugador').focus(); $('graficoEtiquetaJugador').select(); return; }
    if (handlePunto) arrastreGrafico = { id, modo: 'punto', indice: Number(handlePunto.dataset.puntoLinea), pointerId: evento.pointerId };
    else if (handleZona) arrastreGrafico = { id, modo: 'resize-zona', pointerId: evento.pointerId };
    else arrastreGrafico = { id, modo: 'mover', pointerId: evento.pointerId, ultimo: coordenadasCampo(evento) };
    svg.setPointerCapture?.(evento.pointerId); svg.style.cursor = 'grabbing'; evento.preventDefault(); renderizarGraficoCampo(); return;
  }
  const punto = coordenadasCampo(evento);
  if (herramientaGrafico === 'seleccionar') { elementoGraficoSeleccionado = null; actualizarAyudaElemento(); renderizarGraficoCampo(); return; }
  if (herramientaGrafico === 'borrar') { if (grupo) { const id = grupo.getAttribute('data-elemento-id'); graficoActual.elementos = graficoActual.elementos.filter(e => String(e.id) !== id); if (String(elementoGraficoSeleccionado) === String(id)) elementoGraficoSeleccionado = null; renderizarGraficoCampo(); } return; }
  if (herramientaGrafico === 'flecha' || herramientaGrafico === 'linea') {
    if (!puntoInicialGrafico) { puntoInicialGrafico = punto; puntoPrevisualizacionGrafico = punto; $('estadoHerramienta').textContent = `Herramienta: ${NOMBRES_HERRAMIENTAS[herramientaGrafico]} · marca el punto final`; renderizarGraficoCampo(); return; }
    const nuevo = { id: crearIdGrafico(), tipo: herramientaGrafico, x: puntoInicialGrafico.x, y: puntoInicialGrafico.y, puntos: [puntoInicialGrafico, punto], color: $('graficoColor').value || '#facc15', discontinua: $('graficoDiscontinua').checked };
    graficoActual.elementos.push(nuevo); elementoGraficoSeleccionado = nuevo.id; puntoInicialGrafico = null; puntoPrevisualizacionGrafico = null; cargarControlesElemento(nuevo); seleccionarHerramienta('seleccionar'); renderizarGraficoCampo(); $('estadoHerramienta').textContent = 'Elemento creado. Arrastra sus extremos para ajustar la línea.'; return;
  }
  if (herramientaGrafico === 'zona') { creandoZonaGrafico = punto; zonaPrevisualizacionGrafico = punto; svg.setPointerCapture?.(evento.pointerId); evento.preventDefault(); return; }
  if (herramientaGrafico === 'jugadorA' || herramientaGrafico === 'jugadorB' || herramientaGrafico === 'comodin') {
    const equipo = herramientaGrafico === 'jugadorA' ? 'A' : herramientaGrafico === 'jugadorB' ? 'B' : 'C'; const numeros = graficoActual.elementos.filter(e => e.tipo === 'jugador' && e.equipo === equipo).map(e => parseInt(e.etiqueta, 10)).filter(Number.isFinite); const etiqueta = equipo === 'C' ? 'C' : String((numeros.length ? Math.max(...numeros) : 0) + 1);
    graficoActual.elementos.push({ id: crearIdGrafico(), tipo: 'jugador', equipo, x: punto.x, y: punto.y, etiqueta });
  } else if (herramientaGrafico === 'cono') graficoActual.elementos.push({ id: crearIdGrafico(), tipo: 'cono', x: punto.x, y: punto.y });
  else if (herramientaGrafico === 'porteria') graficoActual.elementos.push({ id: crearIdGrafico(), tipo: 'porteria', x: punto.x, y: punto.y });
  renderizarGraficoCampo();
}
function finalizarCreacionZona(evento) {
  if (!creandoZonaGrafico) return; const fin = coordenadasCampo(evento); const inicio = creandoZonaGrafico; const w = Math.max(30, Math.abs(fin.x - inicio.x)), h = Math.max(30, Math.abs(fin.y - inicio.y));
  const nueva = { id: crearIdGrafico(), tipo: 'zona', x: (inicio.x + fin.x) / 2, y: (inicio.y + fin.y) / 2, w: clamp(w, 30, 950), h: clamp(h, 30, 550), etiqueta: '', color: $('graficoColor')?.value || '#facc21', discontinua: $('graficoDiscontinua')?.checked };
  graficoActual.elementos.push(nueva); elementoGraficoSeleccionado = nueva.id; creandoZonaGrafico = null; zonaPrevisualizacionGrafico = null; cargarControlesElemento(nueva); seleccionarHerramienta('seleccionar'); renderizarGraficoCampo(); $('estadoHerramienta').textContent = 'Zona creada. Arrastra la esquina para cambiar su tamaño.';
}
function cargarControlesElemento(el) {
  if (el.color) $('graficoColor').value = el.color;
  $('graficoDiscontinua').checked = !!el.discontinua;
  const esJugador = el.tipo === 'jugador';
  $('graficoEtiquetaJugador').classList.toggle('oculto', !esJugador); $('graficoEtiquetaJugadorLabel').classList.toggle('oculto', !esJugador);
  if (esJugador) $('graficoEtiquetaJugador').value = el.etiqueta || '';
  actualizarAyudaElemento(el);
}
function actualizarEtiquetaJugadorSeleccionado() {
  const el = graficoActual.elementos.find(e => String(e.id) === String(elementoGraficoSeleccionado));
  if (!el || el.tipo !== 'jugador') return;
  el.etiqueta = $('graficoEtiquetaJugador').value.trim().slice(0, 3);
  renderizarGraficoCampo();
}
function actualizarAyudaElemento(el) {
  el = el || graficoActual.elementos.find(e => String(e.id) === String(elementoGraficoSeleccionado));
  const ayuda = $('ayudaElementoSeleccionado'); if (!ayuda) return;
  const esJugador = el?.tipo === 'jugador';
  $('graficoEtiquetaJugador').classList.toggle('oculto', !esJugador); $('graficoEtiquetaJugadorLabel').classList.toggle('oculto', !esJugador);
  ayuda.textContent = !el ? 'Selecciona una línea, flecha o zona para editarla. Para cambiar el número, selecciona un jugador.' : el.tipo === 'jugador' ? 'Jugador seleccionado: cambia su número o etiqueta en el campo de texto.' : el.tipo === 'zona' ? 'Zona seleccionada: arrastra la esquina para cambiar el tamaño; color y estilo se actualizan automáticamente.' : (['linea', 'flecha'].includes(el.tipo) ? `${el.tipo === 'flecha' ? 'Flecha' : 'Línea'} seleccionada: arrastra los extremos para editar su recorrido; color y estilo se actualizan automáticamente.` : 'Elemento seleccionado.');
}
function moverElementoGrafico(evento) {
  if (!arrastreGrafico) return; const punto = coordenadasCampo(evento); const el = graficoActual.elementos.find(x => String(x.id) === arrastreGrafico.id); if (!el) return;
  if (arrastreGrafico.modo === 'punto' && (el.tipo === 'flecha' || el.tipo === 'linea')) { el.puntos[arrastreGrafico.indice] = { x: punto.x, y: punto.y }; el.x = el.puntos[0].x; el.y = el.puntos[0].y; }
  else if (arrastreGrafico.modo === 'resize-zona' && el.tipo === 'zona') { el.w = clamp(Math.abs(punto.x - el.x) * 2, 30, 950); el.h = clamp(Math.abs(punto.y - el.y) * 2, 30, 550); }
  else { const anterior = arrastreGrafico.ultimo || punto; const dx = punto.x - anterior.x, dy = punto.y - anterior.y; el.x = clamp((Number(el.x) || 0) + dx, 0, 1000); el.y = clamp((Number(el.y) || 0) + dy, 0, 600); if (el.tipo === 'flecha' || el.tipo === 'linea') el.puntos = (el.puntos || []).map(p => ({ x: clamp(Number(p.x) + dx, 0, 1000), y: clamp(Number(p.y) + dy, 0, 600) })); arrastreGrafico.ultimo = punto; }
  arrastreGrafico.moved = true; renderizarGraficoCampo();
}
function terminarArrastreGrafico() { if (arrastreGrafico) { arrastreGrafico = null; $('graficoCampo').style.cursor = herramientaGrafico === 'seleccionar' ? 'grab' : 'crosshair'; } }
function crearIdGrafico() { return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
