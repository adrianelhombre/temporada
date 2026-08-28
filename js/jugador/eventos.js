// ============================================================
// JUGADOR - EVENTOS
// ============================================================

function inicializarEventos() {
  // Eventos de evaluación
  document.querySelectorAll('.tarjeta-evaluacion .acciones-eval button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const trimestre = parseInt(btn.dataset.trimestre);
      const accion = btn.dataset.action;

      if (accion === 'evaluar' || accion === 'editar') {
        if (typeof window.__eval !== 'undefined' && window.__eval.abrirDetalleEvaluacion) {
          await window.__eval.abrirDetalleEvaluacion(trimestre, true, false);
        }
      } else if (accion === 'ver') {
        if (typeof window.__eval !== 'undefined' && window.__eval.abrirDetalleEvaluacion) {
          await window.__eval.abrirDetalleEvaluacion(trimestre, false, true);
        }
      }
    });
  });

  // Eventos de PID
  if (typeof window.__pid !== 'undefined' && window.__pid.inicializarEventosPID) {
    window.__pid.inicializarEventosPID();
  }
}

// ---------- EXPORTAR ----------
window.__eventos = {
  inicializarEventos
};