// Gestión de asistencia, retrasos, ausencias y confirmación.

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
    [['presente','Presente'],['ausente','Ausente'],['retraso','Retraso']].forEach(([valor, texto]) => {
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
async function guardarAsistenciaSilenciosa() {
  const filas = filasAsistencia(sesionActual.id);
  if (filas.length) { const { error } = await supabaseClient.from('entrenamientos_asistencia').upsert(filas, { onConflict: 'sesion_id,jugador_id' }); if (error) throw error; }
}
