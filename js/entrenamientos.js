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
    } else if (pagina === 'biblioteca') {
      $('buscarEjercicio').addEventListener('input', renderizarEjercicios);
      $('filtroCategoria').addEventListener('change', renderizarEjercicios);
      $('btnNuevoEjercicio').addEventListener('click', () => { window.location.href = 'ejercicio.html?return=biblioteca-ejercicios.html'; });
      await cargarEjercicios();
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
    } else if (pagina === 'ejercicio') {
      vincularEditorGrafico();
      $('btnGuardarEjercicio').addEventListener('click', guardarEjercicio);
      const idEjercicio = new URLSearchParams(location.search).get('id');
      if (idEjercicio) {
        const { data, error } = await supabaseClient.from('entrenamientos_ejercicios').select('*').eq('id', idEjercicio).single();
        if (error || !data) throw error || new Error('No se encuentra el ejercicio.');
        prepararEditorEjercicio(data);
      } else prepararEditorEjercicio();
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
