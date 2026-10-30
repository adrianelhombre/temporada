// Punto de entrada de Entrenamientos: estado compartido, inicio y utilidades comunes.

let temporadaEntrenamientosId = null;
let jugadoresEntrenamiento = [];
let sesionesSemana = [];
let semanasEntrenamiento = [];
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
let canalRealtimeEntrenamientos = null;
let temporizadorRealtimeEntrenamientos = null;
let asistenciaLocalModificada = false;

const $ = (id) => document.getElementById(id);
const CATEGORIAS_EJERCICIOS = ['Posesiones', 'Finalizaciones', 'Transiciones', 'Defensa', 'Físico', 'Partidos', 'Técnica', 'Otros'];
const NOMBRES_HERRAMIENTAS = { seleccionar: 'Mover / editar', jugadorA: 'Añadir jugador A', jugadorB: 'Añadir jugador B', jugadorC: 'Añadir jugador C', comodin: 'Añadir comodín', portero: 'Añadir portero', pelota: 'Añadir pelota', flecha: 'Dibujar flecha (marca dos puntos)', linea: 'Dibujar línea (marca dos puntos)', cono: 'Añadir cono', porteria: 'Añadir portería', zona: 'Añadir zona', borrar: 'Borrar elemento' };

(async function iniciarEntrenamientos() {
  if (!await exigirSesion()) return;
  const pagina = document.body.dataset.paginaEntrenamientos || 'planificacion';
  $('botonCerrarSesion')?.addEventListener('click', cerrarSesion);
  try {
    await cargarTemporada();
    if (pagina === 'planificacion') {
      $('selectorSemana').addEventListener('change', cargarSemana);
      $('btnNuevaSemana').addEventListener('click', () => abrirModalSemana(false));
      $('btnEditarSemana').addEventListener('click', () => abrirModalSemana(true));
      $('btnGuardarSemana').addEventListener('click', crearSemana);
      $('tipoSemana').addEventListener('change', actualizarCamposTipoSemana);
      $('semanaFechaInicio').addEventListener('change', actualizarRangoSemanaPreview);
      $('btnNuevaSesion').addEventListener('click', () => abrirModalSesion());
      $('btnGuardarSesion').addEventListener('click', crearSesion);
      $('btnNuevoEjercicio')?.addEventListener('click', () => { window.location.href = 'ejercicio.html?return=biblioteca-ejercicios.html'; });
      document.querySelectorAll('[data-cerrar]').forEach(btn => btn.addEventListener('click', () => cerrarModal(btn.dataset.cerrar)));
      document.querySelectorAll('.superposicion').forEach(modal => modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(modal.id); }));
      await cargarSemanas();
      iniciarRealtimeEntrenamientos(pagina);
    } else if (pagina === 'biblioteca') {
      $('buscarEjercicio').addEventListener('input', renderizarEjercicios);
      $('filtroCategoria').addEventListener('change', renderizarEjercicios);
      $('btnNuevoEjercicio').addEventListener('click', () => { window.location.href = 'ejercicio.html?return=biblioteca-ejercicios.html'; });
      await cargarEjercicios();
      iniciarRealtimeEntrenamientos(pagina);
    } else if (pagina === 'sesion') {
      await Promise.all([cargarJugadores(), cargarEjercicios()]);
      $('btnGuardarDetalleAbajo').addEventListener('click', guardarDetalleSesion);
      $('btnGuardarAsistencia').addEventListener('click', guardarAsistencia);
      $('usarTresEquipos').addEventListener('change', renderizarOpcionesEquiposSesion);
      $('btnGuardarEquipos').addEventListener('click', guardarEquiposSesion);
      $('buscarEjercicioSesion').addEventListener('input', actualizarSelectorEjercicios);
      $('btnCrearEjercicioDesdeSesion').addEventListener('click', () => {
        window.location.href = `ejercicio.html?return=${encodeURIComponent('sesion.html?id=' + encodeURIComponent(new URLSearchParams(location.search).get('id') || ''))}`;
      });
      document.querySelectorAll('[data-panel-plegable]').forEach(btn => btn.addEventListener('click', () => alternarPanelPlegable(btn)));
      document.querySelectorAll('[data-panel-seccion]').forEach(seccion => seccion.addEventListener('click', evento => {
        if (evento.target.closest('button, input, textarea, select, a, label, .distribucion-equipos, .ejercicio-sesion-detalle, .fila-asistencia')) return;
        const control = seccion.querySelector(':scope > [data-control-seccion]');
        if (control) alternarPanelPlegable(control);
      }));
      document.querySelectorAll('.distribucion-equipos').forEach(distribucion => distribucion.addEventListener('click', evento => {
        if (evento.target.closest('button, input, textarea, select, a, label')) return;
        const control = distribucion.querySelector('.boton-alternar-distribucion');
        if (control) alternarPanelPlegable(control);
      }));
      const idSesion = new URLSearchParams(location.search).get('id');
      if (!idSesion) { mostrarNotificacion('No se ha indicado qué entrenamiento abrir.', 'error'); return; }
      const { data, error } = await supabaseClient.from('entrenamientos_sesiones').select('*').eq('id', idSesion).single();
      if (error || !data) throw error || new Error('No se encuentra la sesión.');
      await abrirDetalleSesion(data);
      iniciarRealtimeEntrenamientos(pagina, idSesion);
    } else if (pagina === 'ejercicio') {
      vincularEditorGrafico();
      $('btnGuardarEjercicio').addEventListener('click', guardarEjercicio);
      const idEjercicio = new URLSearchParams(location.search).get('id');
      if (idEjercicio) {
        const { data, error } = await supabaseClient.from('entrenamientos_ejercicios').select('*').eq('id', idEjercicio).single();
        if (error || !data) throw error || new Error('No se encuentra el ejercicio.');
        prepararEditorEjercicio(data);
      } else prepararEditorEjercicio();
      iniciarRealtimeEntrenamientos(pagina, idEjercicio);
      const cancel = $('btnCancelarEjercicio');
      if (cancel) {
        const destino = 'biblioteca-ejercicios.html';
        cancel.href = destino;
        cancel.addEventListener('click', evento => { evento.preventDefault(); window.location.href = destino; });
      }
    }
  } catch (error) {
    console.error(error);
    mostrarNotificacion('No se pudo iniciar Entrenamientos. Comprueba que has ejecutado el SQL de configuración.', 'error');
  }
})();


// Sincronización entre dispositivos mediante Supabase Realtime.
function iniciarRealtimeEntrenamientos(pagina, id = null) {
  if (canalRealtimeEntrenamientos) supabaseClient.removeChannel(canalRealtimeEntrenamientos);
  const canal = supabaseClient.channel(`balsas-entrenamientos-${pagina}-${id || 'general'}-${Math.random().toString(36).slice(2, 8)}`);
  const escuchar = (tabla, callback, filtro = null) => {
    const config = { event: '*', schema: 'public', table: tabla };
    if (filtro) config.filter = filtro;
    canal.on('postgres_changes', config, callback);
  };
  const programar = (accion, espera = 350) => {
    clearTimeout(temporizadorRealtimeEntrenamientos);
    temporizadorRealtimeEntrenamientos = setTimeout(() => {
      Promise.resolve(accion()).catch(error => console.error('Error al sincronizar entrenamientos:', error));
    }, espera);
  };

  if (pagina === 'planificacion') {
    escuchar('entrenamientos_semanas', () => programar(async () => {
      const seleccionada = $('selectorSemana')?.value;
      await cargarSemanas();
      if (seleccionada && semanasEntrenamiento.some(s => String(s.id) === String(seleccionada))) {
        $('selectorSemana').value = seleccionada;
        await cargarSemana();
      }
    }));
    escuchar('entrenamientos_sesiones', () => programar(() => cargarSemana()));
  } else if (pagina === 'biblioteca') {
    escuchar('entrenamientos_ejercicios', () => programar(() => cargarEjercicios()));
  } else if (pagina === 'sesion' && id) {
    escuchar('entrenamientos_sesiones', payload => {
      if (String(payload.new?.id || payload.old?.id) !== String(id)) return;
      programar(async () => {
        const { data, error } = await supabaseClient.from('entrenamientos_sesiones').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data || !sesionActual) return;
        const campos = {
          titulo: 'detalleTitulo', fecha: 'detalleFecha', duracion_prevista: 'detalleDuracion',
          duracion_real: 'detalleDuracionReal', objetivo: 'detalleObjetivo', observaciones: 'detalleObservaciones'
        };
        Object.entries(campos).forEach(([campo, elementoId]) => {
          const elemento = $(elementoId);
          if (elemento && document.activeElement !== elemento) elemento.value = data[campo] ?? (campo.startsWith('duracion') ? '' : '');
        });
        $('detalleTituloCabecera').textContent = data.titulo || 'Entrenamiento';
        $('detalleFechaEtiqueta').textContent = formatearFecha(data.fecha, { day: 'numeric', month: 'long', year: 'numeric' });
        if (document.activeElement !== $('asistenciaConfirmada')) $('asistenciaConfirmada').checked = Boolean(data.asistencia_confirmada);
        if (document.activeElement !== $('usarTresEquipos') &&
            !['jugadoresEquipoA','jugadoresEquipoB','jugadoresComodines','jugadoresEquipo3A','jugadoresEquipo3B','jugadoresEquipo3C'].some(campo => document.activeElement === $(campo))) {
          cargarEquiposSesion(data);
        }
        sesionActual = { ...sesionActual, ...data };
      });
    }, `id=eq.${id}`);
    escuchar('entrenamientos_sesion_ejercicios', () => programar(async () => {
      const { data, error } = await supabaseClient.from('entrenamientos_sesion_ejercicios').select('*').eq('sesion_id', id).order('orden');
      if (error) throw error;
      ejerciciosSesion = data || [];
      renderizarEjerciciosSesion();
    }), `sesion_id=eq.${id}`);
    escuchar('entrenamientos_asistencia', () => programar(async () => {
      if (asistenciaLocalModificada || document.activeElement?.closest?.('#listaAsistencia')) return;
      const { data, error } = await supabaseClient.from('entrenamientos_asistencia').select('*').eq('sesion_id', id);
      if (error) throw error;
      estadosAsistencia = new Map();
      (data || []).forEach(a => estadosAsistencia.set(a.jugador_id, {
        estado: a.estado || 'presente', justificada: Boolean(a.justificada), minutos_retraso: Number(a.minutos_retraso || 0)
      }));
      jugadoresEntrenamiento.forEach(j => {
        if (!estadosAsistencia.has(j.id)) estadosAsistencia.set(j.id, { estado: 'presente', justificada: false, minutos_retraso: 0 });
      });
      renderizarAsistencia();
      if (sesionActual) sesionActual.asistencia_confirmada = Boolean($('asistenciaConfirmada').checked);
      actualizarEstadoAsistencia();
    }), `sesion_id=eq.${id}`);
  } else if (pagina === 'ejercicio' && id) {
    escuchar('entrenamientos_ejercicios', payload => {
      if (String(payload.new?.id || payload.old?.id) !== String(id)) return;
      programar(async () => {
        const { data, error } = await supabaseClient.from('entrenamientos_ejercicios').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return;
        const mapa = { nombre: 'ejercicioNombre', categoria: 'ejercicioCategoria', duracion_min: 'ejercicioDuracion', objetivo: 'ejercicioObjetivo', descripcion: 'ejercicioDescripcion', material: 'ejercicioMaterial' };
        Object.entries(mapa).forEach(([campo, elementoId]) => {
          const elemento = $(elementoId);
          if (elemento && document.activeElement !== elemento) elemento.value = data[campo] ?? '';
        });
        if (!arrastreGrafico && !puntoInicialGrafico && !creandoZonaGrafico && document.activeElement !== $('graficoCampo')) {
          graficoActual = normalizarGrafico(data.grafico_json);
          $('graficoTipoCampo').value = graficoActual.campo;
          renderizarGraficoCampo();
        }
      });
    }, `id=eq.${id}`);
  }

  canalRealtimeEntrenamientos = canal;
  canal.subscribe(status => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('La sincronización en tiempo real no está disponible:', status);
    }
  });
  window.addEventListener('beforeunload', () => {
    if (canalRealtimeEntrenamientos === canal) supabaseClient.removeChannel(canal);
  }, { once: true });
}

function vincularEditorGrafico() {
  ['graficoColor','graficoDiscontinua'].forEach(id => { $(id).addEventListener('input', actualizarEstiloSeleccionadoEnVivo); $(id).addEventListener('change', actualizarEstiloSeleccionadoEnVivo); });
  $('graficoEtiquetaJugador').addEventListener('input', actualizarEtiquetaJugadorSeleccionado);
  $('graficoTipoCampo').addEventListener('change', () => { graficoActual.campo = $('graficoTipoCampo').value; renderizarGraficoCampo(); });
  document.querySelectorAll('[data-herramienta]').forEach(btn => btn.addEventListener('click', () => seleccionarHerramienta(btn.dataset.herramienta)));
  $('btnLimpiarGrafico').addEventListener('click', () => { if (confirm('¿Quieres quitar todos los elementos del campo?')) { graficoActual.elementos = []; puntoInicialGrafico = null; renderizarGraficoCampo(); } });
  $('graficoCampo').addEventListener('pointerdown', manejarPulsacionCampo);
  $('graficoCampo').addEventListener('pointermove', evento => { if (!arrastreGrafico) { const grupo = evento.target.closest?.('[data-elemento-id]'); const id = grupo?.getAttribute('data-elemento-id'); const elemento = graficoActual.elementos.find(e => String(e.id) === String(id)); $('graficoCampo').style.cursor = elemento?.tipo === 'jugador' && herramientaGrafico !== 'borrar' ? 'grab' : herramientaGrafico === 'seleccionar' ? 'grab' : herramientaGrafico === 'borrar' ? 'not-allowed' : 'crosshair'; } moverElementoGrafico(evento); if (creandoZonaGrafico) { zonaPrevisualizacionGrafico = coordenadasCampo(evento); renderizarGraficoCampo(); } else if (puntoInicialGrafico && !arrastreGrafico) { puntoPrevisualizacionGrafico = coordenadasCampo(evento); renderizarGraficoCampo(); } });
  $('graficoCampo').addEventListener('pointerup', evento => { if (creandoZonaGrafico) finalizarCreacionZona(evento); else terminarArrastreGrafico(evento); });
  $('graficoCampo').addEventListener('pointercancel', evento => { creandoZonaGrafico=null; zonaPrevisualizacionGrafico=null; terminarArrastreGrafico(evento); renderizarGraficoCampo(); });
}

function alternarPanelPlegable(boton) {
  const panel = $(boton.getAttribute('aria-controls'));
  if (!panel) return;

  const mostrar = panel.classList.contains('oculto');
  panel.classList.toggle('oculto', !mostrar);
  boton.setAttribute('aria-expanded', String(mostrar));

  const icono = boton.querySelector('.icono-panel-plegable, .asistencia-icono, [aria-hidden="true"]');
  if (icono) icono.textContent = mostrar ? '−' : '+';

  const distribucion = boton.closest('.distribucion-equipos');
  if (distribucion) distribucion.classList.toggle('distribucion-contraida', !mostrar);

  if (mostrar && boton.dataset.enfocarAlAbrir) $(boton.dataset.enfocarAlAbrir)?.focus();
}

function restablecerPanelesPlegables() {
  document.querySelectorAll('[data-panel-plegable]').forEach(boton => {
    const panel = $(boton.getAttribute('aria-controls'));
    if (panel) panel.classList.add('oculto');
    boton.setAttribute('aria-expanded', 'false');
    const icono = boton.querySelector('.icono-panel-plegable, .asistencia-icono, [aria-hidden="true"]');
    if (icono) icono.textContent = '+';
    const distribucion = boton.closest('.distribucion-equipos');
    if (distribucion) distribucion.classList.add('distribucion-contraida');
  });
}

function cambiarVista(vista) { window.location.href = vista === 'biblioteca' ? 'biblioteca-ejercicios.html' : 'entrenamientos.html'; }
function fechaISO(fecha) { const d = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
function lunesDe(fecha) { const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()); const dia = d.getDay() || 7; d.setDate(d.getDate() - dia + 1); return d; }
function formatearFecha(fecha, opciones = { day: '2-digit', month: '2-digit', year: 'numeric' }) { if (!fecha) return 'Sin fecha'; return new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', opciones); }
function escaparHTML(valor) { return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
