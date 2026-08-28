// ============================================================
// JUGADOR - RENDERIZADO
// ============================================================

// ---------- RENDERIZAR FICHA ----------
function renderizarFicha() {
  const jugador = window.__jugador.getActual();
  if (!jugador) {
    console.warn('No hay jugador para renderizar');
    return;
  }

  const container = document.getElementById('contenidoJugador');
  if (!container) {
    console.error('No se encontró el contenedor');
    return;
  }

  const posicionPrincipal = jugador.posicion || 'Sin posición';

  let html = renderizarCabecera(jugador, posicionPrincipal);

  if (!jugador.posicion) {
    html += renderizarSinPosicion();
    container.innerHTML = html;
    return;
  }

  const criterios = window.__jugador.getCriteriosMap();
  if (!criterios || Object.keys(criterios).length === 0) {
    html += renderizarSinCriterios(posicionPrincipal);
    container.innerHTML = html;
    return;
  }

  const resumen = calcularResumen();
  html += renderizarResumen(resumen);
  html += renderizarTabs();

  // Panel Desarrollo
  const evalHtml = (typeof window.__eval !== 'undefined' && window.__eval.renderizarEvaluaciones) 
    ? window.__eval.renderizarEvaluaciones() 
    : '<p style="color:var(--rojo);">Error cargando evaluaciones</p>';
  
  const pidHtml = (typeof window.__pid !== 'undefined' && window.__pid.renderizarPID) 
    ? window.__pid.renderizarPID() 
    : '<p style="color:var(--rojo);">Error cargando PID</p>';

  html += `
    <div class="panel-jugador activo" id="panelDesarrollo">
      ${evalHtml}
      ${pidHtml}
    </div>
  `;

  container.innerHTML = html;

  // Inicializar eventos
  if (typeof window.__eventos !== 'undefined' && window.__eventos.inicializarEventos) {
    window.__eventos.inicializarEventos();
  }
}

// ---------- RENDERIZAR CABECERA ----------
function renderizarCabecera(jugador, posicionPrincipal) {
  return `
    <div class="cabecera-jugador">
      <div class="avatar">${jugador.dorsal}</div>
      <div class="info">
        <div class="nombre">${escaparHTML(jugador.nombre)}</div>
        <div class="detalles">
          <span>#${jugador.dorsal}</span>
          <span class="posicion-tag">${posicionPrincipal}</span>
          ${jugador.posiciones_secundarias && jugador.posiciones_secundarias.length > 0 
            ? `<span style="font-size:0.7rem;color:var(--gris-500);">+ ${jugador.posiciones_secundarias.join(', ')}</span>` 
            : ''}
        </div>
      </div>
    </div>
  `;
}

// ---------- RENDERIZAR MENSAJES DE ERROR ----------
function renderizarSinPosicion() {
  return `
    <div class="tarjeta" style="background:var(--amarillo-claro);border-color:var(--amarillo);text-align:center;padding:1.5rem;">
      <p style="font-weight:600;margin-bottom:0.5rem;">⚠️ Este jugador no tiene una posición definida.</p>
      <p style="font-size:0.85rem;color:var(--texto-secundario);">Para poder evaluarlo, primero asigna una posición desde la <a href="plantilla.html" style="color:var(--amarillo-oscuro);font-weight:600;">plantilla</a>.</p>
    </div>
  `;
}

function renderizarSinCriterios(posicion) {
  return `
    <div class="tarjeta" style="background:var(--rojo-claro);border-color:var(--rojo);text-align:center;padding:1.5rem;">
      <p style="font-weight:600;margin-bottom:0.5rem;">❌ No hay criterios definidos para la posición "${posicion}".</p>
      <p style="font-size:0.85rem;color:var(--texto-secundario);">Contacta con el administrador para configurar los criterios.</p>
    </div>
  `;
}

// ---------- RENDERIZAR RESUMEN ----------
function renderizarResumen(resumen) {
  const objetivosActivos = window.__jugador.getObjetivos().filter(o => o.estado === 'activo').length;
  const objetivosConseguidos = window.__jugador.getObjetivos().filter(o => o.estado === 'conseguido').length;

  return `
    <div class="resumen-rapido">
      <div class="item">
        <div class="valor ${resumen.mediaGlobal !== null ? '' : 'texto-secundario'}">${resumen.mediaGlobal !== null ? resumen.mediaGlobal.toFixed(1) : '--'}</div>
        <div class="etiqueta">Media Global</div>
      </div>
      <div class="item">
        <div class="valor">${resumen.ultimaEval || '--'}</div>
        <div class="etiqueta">Última Eval</div>
      </div>
      <div class="item">
        <div class="valor ${resumen.evolucion !== null ? (resumen.evolucion >= 0 ? 'verde' : 'rojo') : ''}">${resumen.evolucion !== null ? (resumen.evolucion >= 0 ? '+' : '') + resumen.evolucion.toFixed(1) : '--'}</div>
        <div class="etiqueta">Evolución</div>
      </div>
      <div class="item">
        <div class="valor amarillo">${objetivosActivos}</div>
        <div class="etiqueta">Obj. Activos</div>
      </div>
      <div class="item">
        <div class="valor verde">${objetivosConseguidos}</div>
        <div class="etiqueta">Obj. Conseguidos</div>
      </div>
    </div>
  `;
}

// ---------- RENDERIZAR TABS ----------
function renderizarTabs() {
  return `
    <div class="tabs-jugador">
      <button class="tab activo" data-panel="desarrollo">📈 Desarrollo</button>
    </div>
  `;
}

// ---------- CALCULAR RESUMEN ----------
function calcularResumen() {
  const evaluaciones = window.__jugador.getEvaluaciones();
  const evaluacionesConNotas = evaluaciones.filter(e => e.notas && e.notas.length > 0);
  const evalsOrdenadas = [...evaluacionesConNotas].sort((a, b) => a.trimestre - b.trimestre);

  let mediaGlobal = null;
  let ultimaEval = null;
  let evolucion = null;

  if (evalsOrdenadas.length > 0) {
    const ultima = evalsOrdenadas[evalsOrdenadas.length - 1];
    
    // Usar calcularMediaGlobal desde window.__eval
    if (typeof window.__eval !== 'undefined' && window.__eval.calcularMediaGlobal) {
      mediaGlobal = window.__eval.calcularMediaGlobal(ultima.notas);
    }
    
    ultimaEval = getNombreTrimestre(ultima.trimestre);

    if (evalsOrdenadas.length > 1) {
      const anterior = evalsOrdenadas[evalsOrdenadas.length - 2];
      
      if (typeof window.__eval !== 'undefined' && window.__eval.calcularMediaGlobal) {
        const mediaAnterior = window.__eval.calcularMediaGlobal(anterior.notas);
        if (mediaGlobal !== null && mediaAnterior !== null) {
          evolucion = mediaGlobal - mediaAnterior;
        }
      }
    }
  }

  return { mediaGlobal, ultimaEval, evolucion };
}

function getNombreTrimestre(num) {
  const nombres = ['', 'Septiembre', 'Diciembre', 'Marzo', 'Junio'];
  return nombres[num] || num;
}

// ---------- EXPORTAR ----------
window.__render = {
  renderizarFicha,
  calcularResumen,
  renderizarCabecera,
  renderizarSinPosicion,
  renderizarSinCriterios,
  renderizarResumen,
  renderizarTabs
};