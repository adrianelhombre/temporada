document.addEventListener('DOMContentLoaded', () => {
  const btnEquipo = document.getElementById('btnEquipo');
  const btnJugadores = document.getElementById('btnJugadores');
  const vistaEquipo = document.getElementById('vistaEquipo');
  const vistaJugadores = document.getElementById('vistaJugadores');

  // Cambiar a vista de equipo
  btnEquipo.addEventListener('click', () => {
    btnEquipo.classList.add('activo');
    btnJugadores.classList.remove('activo');
    vistaEquipo.style.display = 'block';
    vistaJugadores.style.display = 'none';
    if (typeof cargarEstadisticasEquipo === 'function') {
      cargarEstadisticasEquipo();
    }
  });

  // Cambiar a vista de jugadores
  btnJugadores.addEventListener('click', () => {
    btnJugadores.classList.add('activo');
    btnEquipo.classList.remove('activo');
    vistaJugadores.style.display = 'block';
    vistaEquipo.style.display = 'none';
    if (typeof cargarEstadisticasJugadores === 'function') {
      cargarEstadisticasJugadores();
    }
  });

  // Cargar vista inicial (jugadores)
  if (typeof cargarEstadisticasJugadores === 'function') {
    cargarEstadisticasJugadores();
  }
});