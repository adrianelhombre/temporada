// Punto de entrada de Entrenamientos: estado compartido, inicio y utilidades comunes.

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
const NOMBRES_HERRAMIENTAS = { seleccionar: 'Mover / editar', jugadorA: 'Añadir jugador A', jugadorB: 'Añadir jugador B', jugadorC: 'Añadir jugador C', comodin: 'Añadir comodín', portero: 'Añadir portero', pelota: 'Añadir pelota', flecha: 'Dibujar flecha (marca dos puntos)', linea: 'Dibujar línea (marca dos puntos)', cono: 'Añadir cono', porteria: 'Añadir portería', zona: 'Añadir zona', borrar: 'Borrar elemento' };

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
  $('usarTresEquipos').addEventListener('change', renderizarOpcionesEquiposSesion);
  document.querySelectorAll('[data-alternar-distribucion]').forEach(btn => btn.addEventListener('click', () => alternarDistribucionEquipos(btn)));
  $('btnGuardarEquipos').addEventListener('click', guardarEquiposSesion);
  $('btnAlternarAsistencia').addEventListener('click', alternarAsistencia);
  $('btnCrearEjercicioDesdeSesion').addEventListener('click', () => abrirModalEjercicio());
  $('btnNuevoEjercicio').addEventListener('click', () => abrirModalEjercicio());
  $('btnGuardarEjercicio').addEventListener('click', guardarEjercicio);
  $('buscarEjercicio').addEventListener('input', renderizarEjercicios);
  $('buscarEjercicioSesion').addEventListener('input', actualizarSelectorEjercicios);
  $('btnAlternarEjerciciosDisponibles').addEventListener('click', alternarEjerciciosDisponibles);
  $('btnAlternarDetallesEntrenamiento').addEventListener('click', alternarDetallesEntrenamiento);
  ['graficoColor','graficoDiscontinua'].forEach(id => { $(id).addEventListener('input', actualizarEstiloSeleccionadoEnVivo); $(id).addEventListener('change', actualizarEstiloSeleccionadoEnVivo); });
  $('graficoEtiquetaJugador').addEventListener('input', actualizarEtiquetaJugadorSeleccionado);
  $('filtroCategoria').addEventListener('change', renderizarEjercicios);
  $('graficoTipoCampo').addEventListener('change', () => { graficoActual.campo = $('graficoTipoCampo').value; renderizarGraficoCampo(); });
  document.querySelectorAll('[data-herramienta]').forEach(btn => btn.addEventListener('click', () => seleccionarHerramienta(btn.dataset.herramienta)));
  $('btnLimpiarGrafico').addEventListener('click', () => { if (confirm('¿Quieres quitar todos los elementos del campo?')) { graficoActual.elementos = []; puntoInicialGrafico = null; renderizarGraficoCampo(); } });
  $('graficoCampo').addEventListener('pointerdown', manejarPulsacionCampo);
  $('graficoCampo').addEventListener('pointermove', evento => { moverElementoGrafico(evento); if (creandoZonaGrafico) { zonaPrevisualizacionGrafico = coordenadasCampo(evento); renderizarGraficoCampo(); } else if (puntoInicialGrafico && !arrastreGrafico) { puntoPrevisualizacionGrafico = coordenadasCampo(evento); renderizarGraficoCampo(); } });
  $('graficoCampo').addEventListener('pointerup', evento => { if (creandoZonaGrafico) finalizarCreacionZona(evento); else terminarArrastreGrafico(evento); });
  $('graficoCampo').addEventListener('pointercancel', evento => { creandoZonaGrafico=null; zonaPrevisualizacionGrafico=null; terminarArrastreGrafico(evento); renderizarGraficoCampo(); });
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

function alternarDistribucionEquipos(boton) {
  const panel = $(boton.getAttribute('aria-controls'));
  if (!panel) return;
  const mostrar = panel.classList.contains('oculto');
  panel.classList.toggle('oculto', !mostrar);
  boton.setAttribute('aria-expanded', String(mostrar));
  boton.innerHTML = `<span aria-hidden="true">${mostrar ? '▾' : '▸'}</span> ${mostrar ? 'Ocultar distribución' : 'Mostrar distribución'}`;
  boton.closest('.distribucion-equipos')?.classList.toggle('distribucion-contraida', !mostrar);
}

function alternarDetallesEntrenamiento() {
  const panel = $('gridDetallesEntrenamiento');
  const boton = $('btnAlternarDetallesEntrenamiento');
  if (!panel || !boton) return;
  const mostrar = panel.classList.contains('oculto');
  panel.classList.toggle('oculto', !mostrar);
  boton.setAttribute('aria-expanded', String(mostrar));
  boton.innerHTML = `<span aria-hidden="true">${mostrar ? '▾' : '▸'}</span> ${mostrar ? 'Ocultar detalles' : 'Mostrar detalles'}`;
}

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
function escaparHTML(valor) { return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
