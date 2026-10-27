// Biblioteca de ejercicios y asociación de tareas a una sesión.

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
    articulo.addEventListener('dragend', () => { ejercicioArrastradoId = null; cont.querySelectorAll('.arrastrando-ejercicio,.destino-arrastre-ejercicio').forEach(el => el.classList.remove('arrastrando-ejercicio','destino-arrastre-ejercicio')); });
    articulo.addEventListener('dragover', ev => { ev.preventDefault(); if (ejercicioArrastradoId && ejercicioArrastradoId !== item.id) articulo.classList.add('destino-arrastre-ejercicio'); });
    articulo.addEventListener('dragleave', () => articulo.classList.remove('destino-arrastre-ejercicio'));
    articulo.addEventListener('drop', async ev => { ev.preventDefault(); articulo.classList.remove('destino-arrastre-ejercicio'); const fromId = ejercicioArrastradoId || ev.dataTransfer.getData('text/plain'); if (!fromId || fromId === item.id) return; const arr = [...ejerciciosSesion]; const from = arr.findIndex(x => String(x.id) === String(fromId)); const to = arr.findIndex(x => String(x.id) === String(item.id)); if (from < 0 || to < 0) return; const [moved] = arr.splice(from,1); arr.splice(to,0,moved); await guardarOrdenEjercicios(arr); });
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
    for (let i=0; i<lista.length; i++) { const { error } = await supabaseClient.from('entrenamientos_sesion_ejercicios').update({ orden:i }).eq('id', lista[i].id); if (error) throw error; }
    ejerciciosSesion = lista.map((x,i) => ({...x, orden:i})); renderizarEjerciciosSesion(); mostrarNotificacion('Orden de ejercicios actualizado.', 'exito');
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
    card.innerHTML = `<div class="ejercicio-cabecera">
    <h3>${escaparHTML(e.nombre)}</h3><div class="ejercicio-acciones"><button class="boton-mini" data-editar="${escaparHTML(e.id)}">Editar</button><button class="boton-mini peligro" data-borrar="${escaparHTML(e.id)}">Borrar</button></div></div>
    
    <div>
      <span class="ejercicio-categoria">${escaparHTML(e.categoria || 'Otros')}</span>
      <span class="pildora">${Number(e.duracion_min || 0)} min</span>
    </div>
    
    <div class="grafico-miniatura biblioteca-grafico">${crearSVGGrafico(grafico, `biblioteca-${e.id}`)}</div>${e.objetivo ? `<p><strong>Objetivo:</strong> ${escaparHTML(e.objetivo)}</p>` : ''}<p class="texto-secundario descripcion-biblioteca">${escaparHTML(e.descripcion || 'Sin descripción añadida.')}</p>${e.material ? `<p class="texto-secundario"><strong>Material:</strong> ${escaparHTML(e.material)}</p>` : ''}`;
    card.querySelector('[data-editar]').addEventListener('click', () => abrirModalEjercicio(e)); card.querySelector('[data-borrar]').addEventListener('click', () => eliminarEjercicio(e)); cont.appendChild(card);
  });
}

function abrirModalEjercicio(ejercicio = null) {
  $('tituloModalEjercicio').textContent = ejercicio ? 'Editar ejercicio' : 'Nuevo ejercicio'; $('ejercicioId').value = ejercicio?.id || ''; $('ejercicioNombre').value = ejercicio?.nombre || ''; $('ejercicioCategoria').value = ejercicio?.categoria || 'Posesiones'; $('ejercicioDuracion').value = ejercicio?.duracion_min ?? 12; $('ejercicioObjetivo').value = ejercicio?.objetivo || ''; $('ejercicioDescripcion').value = ejercicio?.descripcion || ''; $('ejercicioMaterial').value = ejercicio?.material || '';
  graficoActual = normalizarGrafico(ejercicio?.grafico_json); elementoGraficoSeleccionado=null; arrastreGrafico=null; creandoZonaGrafico=null; zonaPrevisualizacionGrafico=null; puntoInicialGrafico=null; puntoPrevisualizacionGrafico=null; $('graficoTipoCampo').value = graficoActual.campo; seleccionarHerramienta('seleccionar'); renderizarGraficoCampo(); $('modalEjercicio').classList.remove('oculto');
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
