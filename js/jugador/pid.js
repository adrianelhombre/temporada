// ============================================================
// JUGADOR - PID (Plan Individual de Desarrollo)
// ============================================================

let historicoAbierto = false;

// ---------- RENDERIZAR PID ----------
function renderizarPID() {
  const objetivos = window.__jugador.getObjetivos();
  const objetivosActivos = objetivos.filter(o => o.estado === 'activo');
  const objetivosConseguidos = objetivos.filter(o => o.estado === 'conseguido');
  const objetivosCancelados = objetivos.filter(o => o.estado === 'cancelado');

  let html = `
    <h2 style="margin-top:2rem;border:none;padding:0;">Plan Individual de Desarrollo</h2>
    <button class="btn-nuevo-objetivo" id="btnNuevoObjetivo">+ Nuevo objetivo</button>

    <div class="form-nuevo-objetivo" id="formNuevoObjetivo">
      <div class="fila-campos">
        <div class="campo-completo">
          <label for="objTitulo">Título del objetivo *</label>
          <input type="text" id="objTitulo" placeholder="Ej: Mejorar el perfil corporal antes de recibir" />
        </div>
        <div>
          <label for="objCategoria">Categoría *</label>
          <select id="objCategoria">
            <option value="tecnica">Técnica</option>
            <option value="tactica">Táctica</option>
            <option value="fisica">Física</option>
            <option value="psicologica">Psicológica</option>
            <option value="personal">Personal</option>
          </select>
        </div>
        <div>
          <label for="objFechaInicio">Fecha inicio *</label>
          <input type="date" id="objFechaInicio" />
        </div>
        <div>
          <label for="objFechaRevision">Fecha revisión</label>
          <input type="date" id="objFechaRevision" />
        </div>
        <div class="campo-completo">
          <label for="objDescripcion">Descripción</label>
          <textarea id="objDescripcion" placeholder="Describe el objetivo en detalle..."></textarea>
        </div>
      </div>
      <div class="acciones-form">
        <button class="guardar" id="btnGuardarObjetivo">Crear objetivo</button>
        <button class="cancelar" id="btnCancelarObjetivo">Cancelar</button>
      </div>
    </div>

    <div class="grid-objetivos">
  `;

  if (objetivosActivos.length === 0) {
    html += `
      <div style="grid-column:1/-1;text-align:center;padding:1.5rem;color:var(--texto-secundario);background:var(--gris-100);border-radius:var(--radio);">
        No hay objetivos activos. Crea uno nuevo para empezar.
      </div>
    `;
  } else {
    objetivosActivos.forEach(obj => {
      html += renderizarTarjetaObjetivo(obj, false);
    });
  }

  html += `</div>`;

  // Histórico
  const historico = [...objetivosConseguidos, ...objetivosCancelados];
  if (historico.length > 0) {
    const claseContenido = historicoAbierto ? 'contenido abierto' : 'contenido';
    const icono = historicoAbierto ? '▲' : '▼';

    html += `
      <div class="historico-objetivos">
        <div class="titulo" id="btnToggleHistorico">
          <span>📜 Histórico (${historico.length})</span>
          <span>${icono}</span>
        </div>
        <div class="${claseContenido}" id="contenidoHistorico">
          <div class="grid-objetivos">
    `;
    historico.forEach(obj => {
      html += renderizarTarjetaObjetivo(obj, true);
    });
    html += `
          </div>
        </div>
      </div>
    `;
  }

  return html;
}

// ---------- RENDERIZAR TARJETA OBJETIVO ----------
function renderizarTarjetaObjetivo(obj, esHistorico = false) {
  const isActivo = obj.estado === 'activo';
  const progreso = obj.progreso || 0;
  const claseEstado = obj.estado;

  let ultimaObs = 'Sin seguimiento aún';
  let ultimaFecha = '';
  if (obj.seguimientos && obj.seguimientos.length > 0) {
    const ultimo = obj.seguimientos[obj.seguimientos.length - 1];
    ultimaObs = ultimo.observaciones || 'Sin observaciones';
    ultimaFecha = formatoFecha(ultimo.fecha);
  }

  const categoriaLabel = {
    tecnica: 'Técnica',
    tactica: 'Táctica',
    fisica: 'Física',
    psicologica: 'Psicológica',
    personal: 'Personal'
  };

  let html = `
    <div class="tarjeta-objetivo ${claseEstado}">
      <div class="cabecera-obj">
        <span class="titulo">${escaparHTML(obj.titulo)}</span>
        <span class="categoria-tag ${obj.categoria}">${categoriaLabel[obj.categoria] || obj.categoria}</span>
      </div>
      ${obj.descripcion ? `<div class="descripcion">${escaparHTML(obj.descripcion)}</div>` : ''}
      <div class="fechas">
        <span>📅 Inicio: ${formatoFecha(obj.fecha_inicio)}</span>
        ${obj.fecha_revision ? `<span>🔍 Revisión: ${formatoFecha(obj.fecha_revision)}</span>` : ''}
      </div>
      <div class="progreso-wrapper">
        <div class="barra">
          <div class="relleno ${progreso === 100 ? 'completado' : ''}" style="width:${progreso}%"></div>
        </div>
        <div class="texto-progreso">
          <span>${progreso}% completado</span>
          <span>${isActivo ? '🟡 Activo' : (obj.estado === 'conseguido' ? '✅ Conseguido' : '❌ Cancelado')}</span>
        </div>
      </div>
      <div class="observacion-obj">📝 ${escaparHTML(ultimaObs)}${ultimaFecha ? ` (${ultimaFecha})` : ''}</div>
  `;

  if (isActivo) {
    html += `
      <div class="acciones-obj">
        <button class="primario" data-action="seguimiento" data-id="${obj.id}">Actualizar</button>
        <button class="completar" data-action="abrir-modal-completar" data-id="${obj.id}">Completar</button>
        <button class="cancelar-obj" data-action="abrir-modal-cancelar" data-id="${obj.id}">Cancelar</button>
      </div>
      <div class="form-seguimiento" id="formSeguimiento_${obj.id}">
        <div class="fila">
          <label for="segProgreso_${obj.id}">Progreso %</label>
          <div class="slider-progreso-wrapper">
            <input type="range" 
              id="segProgreso_${obj.id}" 
              min="0" 
              max="100" 
              step="5" 
              value="${progreso}" 
              class="slider-progreso"
            />
            <span class="valor-progreso" id="segProgresoValor_${obj.id}">${progreso}%</span>
          </div>
          <label for="segObs_${obj.id}">Observación</label>
          <textarea id="segObs_${obj.id}" placeholder="¿Cómo ha progresado?"></textarea>
        </div>
        <div class="acciones">
          <button class="guardar" data-action="guardar-seguimiento" data-id="${obj.id}">Guardar</button>
          <button data-action="cancelar-seguimiento" data-id="${obj.id}">Cancelar</button>
        </div>
      </div>
    `;
  } else if (esHistorico) {
    html += `
      <div class="acciones-obj">
        <button class="eliminar-historico" data-action="eliminar" data-id="${obj.id}">🗑️ Eliminar</button>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

// ---------- CREAR OBJETIVO ----------
async function crearObjetivo() {
  const titulo = document.getElementById('objTitulo').value.trim();
  const categoria = document.getElementById('objCategoria').value;
  const fechaInicio = document.getElementById('objFechaInicio').value;
  const fechaRevision = document.getElementById('objFechaRevision').value || null;
  const descripcion = document.getElementById('objDescripcion').value.trim();

  if (!titulo || !fechaInicio) {
    mostrarNotificacion('El título y la fecha de inicio son obligatorios.', 'error');
    return;
  }

  const jugador = window.__jugador.getActual();
  const temporada = window.__jugador.getTemporada();

  const resultado = await crearObjetivoCompleto(
    jugador.id,
    temporada.id,
    categoria,
    titulo,
    descripcion,
    fechaInicio,
    fechaRevision
  );

  if (resultado.success) {
    mostrarNotificacion('Objetivo creado correctamente.', 'exito');
    document.getElementById('formNuevoObjetivo').classList.remove('abierto');
    document.getElementById('objTitulo').value = '';
    document.getElementById('objDescripcion').value = '';
    await window.__recargarTodo();
  } else {
    mostrarNotificacion(resultado.error || 'Error al crear el objetivo.', 'error');
  }
}

// ---------- GUARDAR SEGUIMIENTO ----------
async function guardarSeguimiento(objetivoId) {
  const progresoInput = document.getElementById(`segProgreso_${objetivoId}`);
  const obsInput = document.getElementById(`segObs_${objetivoId}`);

  const progreso = parseInt(progresoInput.value);
  const observaciones = obsInput.value.trim();

  if (isNaN(progreso) || progreso < 0 || progreso > 100) {
    mostrarNotificacion('El progreso debe ser un número entre 0 y 100.', 'error');
    return;
  }

  const fecha = new Date().toISOString().split('T')[0];
  const resultado = await guardarSeguimientoCompleto(objetivoId, progreso, observaciones, fecha);

  if (resultado.success) {
    mostrarNotificacion('Seguimiento guardado correctamente.', 'exito');
    const form = document.getElementById(`formSeguimiento_${objetivoId}`);
    if (form) form.classList.remove('abierto');
    await window.__recargarTodo();
  } else {
    mostrarNotificacion(resultado.error || 'Error al guardar el seguimiento.', 'error');
  }
}

// ---------- ACTUALIZAR ESTADO OBJETIVO ----------
async function actualizarEstadoObjetivo(objetivoId, nuevoEstado) {
  const resultado = await actualizarEstadoObjetivoCompleto(objetivoId, nuevoEstado);
  if (resultado.success) {
    mostrarNotificacion(`Objetivo ${nuevoEstado === 'conseguido' ? 'completado' : 'cancelado'}.`, 'exito');
    
    // Recargar datos y re-renderizar
    if (typeof window.__recargarTodo === 'function') {
      await window.__recargarTodo();
    } else {
      // Fallback: recarga dura de la página
      location.reload();
    }
  } else {
    mostrarNotificacion(resultado.error || 'Error al actualizar el objetivo.', 'error');
  }
}

// ---------- ELIMINAR OBJETIVO ----------
async function eliminarObjetivo(objetivoId) {
  const resultado = await eliminarObjetivoCompleto(objetivoId);
  if (resultado.success) {
    mostrarNotificacion('Objetivo eliminado del histórico.', 'exito');
    if (typeof window.__recargarTodo === 'function') {
      await window.__recargarTodo();
    }
  } else {
    mostrarNotificacion(resultado.error || 'Error al eliminar el objetivo.', 'error');
  }
}

// ---------- ABRIR MODAL DE CONFIRMACIÓN ----------
function abrirModalConfirmacion(titulo, mensaje, accion, objetivoId) {
  let modal = document.getElementById('modalConfirmacionPID');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalConfirmacionPID';
    modal.className = 'superposicion oculto';
    modal.innerHTML = `
      <div class="hoja-modal">
        <p id="modalPIDTitulo" style="font-weight:700;font-size:1.1rem;margin-bottom:0.5rem;"></p>
        <p id="modalPIDMensaje" style="color:var(--texto-secundario);margin-bottom:1rem;"></p>
        <div class="fila-botones">
          <button class="ancho confirmar" id="modalPIDConfirmar">Confirmar</button>
          <button class="ancho cancelar" id="modalPIDCancelar">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('modalPIDTitulo').textContent = titulo;
  document.getElementById('modalPIDMensaje').textContent = mensaje;
  
  const btnConfirmar = document.getElementById('modalPIDConfirmar');
  const btnCancelar = document.getElementById('modalPIDCancelar');

  // Limpiar eventos anteriores
  const nuevoConfirmar = btnConfirmar.cloneNode(true);
  const nuevoCancelar = btnCancelar.cloneNode(true);
  btnConfirmar.parentNode.replaceChild(nuevoConfirmar, btnConfirmar);
  btnCancelar.parentNode.replaceChild(nuevoCancelar, btnCancelar);

  nuevoConfirmar.dataset.objetivoId = objetivoId;
  nuevoConfirmar.dataset.accion = accion;
  
  nuevoConfirmar.addEventListener('click', async function() {
    const id = this.dataset.objetivoId;
    const accion = this.dataset.accion;
    
    cerrarModalConfirmacionPID();
    
    if (accion === 'completar') {
      await actualizarEstadoObjetivo(id, 'conseguido');
    } else if (accion === 'cancelar') {
      await actualizarEstadoObjetivo(id, 'cancelado');
    } else if (accion === 'eliminar') {
      await eliminarObjetivo(id);
    }
  });

  nuevoCancelar.addEventListener('click', cerrarModalConfirmacionPID);

  modal.addEventListener('click', function(e) {
    if (e.target === this) {
      cerrarModalConfirmacionPID();
    }
  });

  modal.classList.remove('oculto');
}

function cerrarModalConfirmacionPID() {
  const modal = document.getElementById('modalConfirmacionPID');
  if (modal) {
    modal.classList.add('oculto');
  }
}

// ---------- INICIALIZAR EVENTOS PID ----------
function inicializarEventosPID() {
  document.getElementById('btnNuevoObjetivo')?.addEventListener('click', () => {
    const form = document.getElementById('formNuevoObjetivo');
    form.classList.toggle('abierto');
    if (form.classList.contains('abierto')) {
      document.getElementById('objFechaInicio').value = new Date().toISOString().split('T')[0];
    }
  });

  document.getElementById('btnCancelarObjetivo')?.addEventListener('click', () => {
    document.getElementById('formNuevoObjetivo').classList.remove('abierto');
  });

  document.getElementById('btnGuardarObjetivo')?.addEventListener('click', crearObjetivo);

  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('slider-progreso')) {
      const id = e.target.id;
      const valorSpan = document.getElementById(id.replace('segProgreso_', 'segProgresoValor_'));
      if (valorSpan) {
        valorSpan.textContent = e.target.value + '%';
      }
    }
  });

  // Eventos para objetivos activos
  document.querySelector('.grid-objetivos')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const accion = btn.dataset.action;
    const id = btn.dataset.id;

    if (accion === 'seguimiento') {
      const form = document.getElementById(`formSeguimiento_${id}`);
      if (form) form.classList.toggle('abierto');
    } else if (accion === 'guardar-seguimiento') {
      await guardarSeguimiento(id);
    } else if (accion === 'cancelar-seguimiento') {
      const form = document.getElementById(`formSeguimiento_${id}`);
      if (form) form.classList.remove('abierto');
    } else if (accion === 'abrir-modal-completar') {
      abrirModalConfirmacion(
        '✅ Completar objetivo',
        '¿Has conseguido este objetivo? Se moverá al histórico.',
        'completar',
        id
      );
    } else if (accion === 'abrir-modal-cancelar') {
      abrirModalConfirmacion(
        '❌ Cancelar objetivo',
        '¿Seguro que quieres cancelar este objetivo? Se moverá al histórico.',
        'cancelar',
        id
      );
    }
  });

  // Eventos para el histórico
  document.getElementById('contenidoHistorico')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const accion = btn.dataset.action;
    const id = btn.dataset.id;

    if (accion === 'eliminar') {
      abrirModalConfirmacion(
        '🗑️ Eliminar objetivo',
        '¿Seguro que quieres eliminar este objetivo del histórico? Esta acción no se puede deshacer.',
        'eliminar',
        id
      );
    }
  });

  // Toggle histórico
  document.getElementById('btnToggleHistorico')?.addEventListener('click', () => {
    const contenido = document.getElementById('contenidoHistorico');
    contenido.classList.toggle('abierto');
    historicoAbierto = contenido.classList.contains('abierto');
    const span = document.querySelector('#btnToggleHistorico span:last-child');
    if (span) span.textContent = historicoAbierto ? '▲' : '▼';
  });
}

// ---------- EXPORTAR ----------
window.__pid = {
  renderizarPID,
  inicializarEventosPID,
  crearObjetivo,
  guardarSeguimiento,
  actualizarEstadoObjetivo,
  eliminarObjetivo,
  abrirModalConfirmacion,
  cerrarModalConfirmacionPID
};