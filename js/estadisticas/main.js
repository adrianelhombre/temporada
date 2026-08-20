let filtroActual = 'todos';

document.addEventListener('DOMContentLoaded', () => {
  const btnEquipo = document.getElementById('btnEquipo');
  const btnJugadores = document.getElementById('btnJugadores');
  const vistaEquipo = document.getElementById('vistaEquipo');
  const vistaJugadores = document.getElementById('vistaJugadores');

  // ===== EVENTOS DE FILTROS =====
  document.querySelectorAll('.btn-equipo[data-tipo]').forEach(btn => {
    btn.addEventListener('click', () => {
      aplicarFiltro(btn.dataset.tipo);
    });
  });

  // Cambiar a vista de equipo
  btnEquipo.addEventListener('click', () => {
    btnEquipo.classList.add('activo');
    btnJugadores.classList.remove('activo');
    vistaEquipo.style.display = 'block';
    vistaJugadores.style.display = 'none';
    if (typeof cargarEstadisticasEquipo === 'function') {
      cargarEstadisticasEquipo(filtroActual);
    }
  });

  // Cambiar a vista de jugadores
  btnJugadores.addEventListener('click', () => {
    btnJugadores.classList.add('activo');
    btnEquipo.classList.remove('activo');
    vistaJugadores.style.display = 'block';
    vistaEquipo.style.display = 'none';
    if (typeof cargarEstadisticasJugadores === 'function') {
      cargarEstadisticasJugadores(filtroActual);
    }
  });

  // Cargar vista inicial (jugadores) con filtro 'todos'
  if (typeof cargarEstadisticasJugadores === 'function') {
    cargarEstadisticasJugadores('todos');
  }
});

function aplicarFiltro(tipo) {
  filtroActual = tipo;
  
  // Actualizar botones usando clases btn-equipo y activo
  document.querySelectorAll('.btn-equipo[data-tipo]').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.tipo === tipo);
  });
  
  // Recargar según la vista actual
  const vistaEquipo = document.getElementById('vistaEquipo');
  const vistaJugadores = document.getElementById('vistaJugadores');
  
  if (vistaEquipo.style.display !== 'none') {
    if (typeof cargarEstadisticasEquipo === 'function') {
      cargarEstadisticasEquipo(tipo);
    }
  } else {
    if (typeof cargarEstadisticasJugadores === 'function') {
      cargarEstadisticasJugadores(tipo);
    }
  }
}