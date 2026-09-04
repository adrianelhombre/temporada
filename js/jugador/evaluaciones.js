// ============================================================
// JUGADOR - EVALUACIONES
// ============================================================

// ---------- CALCULAR MEDIA GLOBAL ----------
function calcularMediaGlobal(notas) {
  if (!notas || notas.length === 0) return null;
  const sum = notas.reduce((acc, n) => acc + n.valor, 0);
  return sum / notas.length;
}

// ---------- RENDERIZAR EVALUACIONES ----------
function renderizarEvaluaciones() {
  const evaluaciones = window.__jugador.getEvaluaciones();
  const temporada = window.__jugador.getTemporada();

  const trimestres = [
    { num: 1, nombre: 'Septiembre'},
    { num: 2, nombre: 'Diciembre'},
    { num: 3, nombre: 'Marzo'},
    { num: 4, nombre: 'Junio'}
  ];

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
      <h2 style="margin:0;border:none;padding:0;">Evaluaciones</h2>
      <span style="font-size:0.75rem;color:var(--texto-secundario);">${temporada ? temporada.nombre : ''}</span>
    </div>
    <div class="grid-evaluaciones">
  `;

  trimestres.forEach(t => {
    const evalExistente = evaluaciones.find(e => e.trimestre === t.num);
    const tieneNotas = evalExistente && evalExistente.notas && evalExistente.notas.length > 0;
    const mediaGlobal = tieneNotas ? calcularMediaGlobal(evalExistente.notas) : null;

    let diferencia = null;
    if (tieneNotas && t.num > 1) {
      const evalAnterior = evaluaciones.find(e => e.trimestre === t.num - 1);
      if (evalAnterior && evalAnterior.notas && evalAnterior.notas.length > 0) {
        const mediaAnterior = calcularMediaGlobal(evalAnterior.notas);
        if (mediaAnterior !== null && mediaGlobal !== null) {
          diferencia = mediaGlobal - mediaAnterior;
        }
      }
    }

    const claseCompletada = tieneNotas ? 'completada' : '';

    html += `
      <div class="tarjeta-evaluacion ${claseCompletada}" data-trimestre="${t.num}">
        <div class="cabecera-eval">
          <span class="trimestre">${t.nombre}</span>
          <span class="fecha">${tieneNotas ? formatoFecha(evalExistente.fecha_evaluacion) : 'Pendiente'}</span>
        </div>
    `;

    if (tieneNotas) {
      const mediasBloque = calcularMediasPorBloque(evalExistente.notas);
      html += `
        <div class="media-global">${mediaGlobal !== null ? mediaGlobal.toFixed(1) : '--'}</div>
        <div class="medias-bloque">
          ${Object.entries(mediasBloque).map(([key, val]) => `
            <div class="bloque">
              <span class="nombre">${getNombreCategoria(key)}</span>
              <span class="nota">${val !== null ? val.toFixed(1) : '--'}</span>
            </div>
          `).join('')}
        </div>
      `;

      if (diferencia !== null) {
        const claseDiff = diferencia > 0 ? 'positiva' : (diferencia < 0 ? 'negativa' : 'neutral');
        const signo = diferencia > 0 ? '+' : '';
        html += `
          <div class="diferencia ${claseDiff}">
            ${signo}${diferencia.toFixed(1)} respecto a ${getNombreTrimestre(t.num - 1)}
          </div>
        `;
      }

      html += `
        <div class="acciones-eval">
          <button class="ver" data-action="ver" data-trimestre="${t.num}">Ver</button>
          <button class="primario" data-action="editar" data-trimestre="${t.num}">Editar</button>
        </div>
      `;
    } else {
      html += `
        <div class="media-global"><span class="sin-evaluar">Sin evaluar</span></div>
        <div class="acciones-eval">
          <button class="primario" data-action="evaluar" data-trimestre="${t.num}">+ Evaluar</button>
        </div>
      `;
    }

    html += `
        <div class="detalle-evaluacion" id="detalleEval_${t.num}"></div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

// ---------- CALCULAR MEDIAS POR BLOQUE ----------
function calcularMediasPorBloque(notas) {
  const criteriosMap = window.__jugador.getCriteriosMap();
  const categorias = ['tecnica', 'tactica', 'fisica', 'psicologica', 'personal'];
  const resultado = {};

  const criteriosPorCat = {};
  Object.entries(criteriosMap).forEach(([cat, crits]) => {
    criteriosPorCat[cat] = crits.map(c => c.id);
  });

  categorias.forEach(cat => {
    const ids = criteriosPorCat[cat] || [];
    const notasCat = notas.filter(n => ids.includes(n.criterio_id));
    if (notasCat.length === 0) {
      resultado[cat] = null;
    } else {
      const sum = notasCat.reduce((acc, n) => acc + n.valor, 0);
      resultado[cat] = sum / notasCat.length;
    }
  });

  return resultado;
}

// ---------- CALCULAR MEDIA DE BLOQUE ----------
function calcularMediaBloque(evaluacion, categoria, criteriosCat) {
  if (!evaluacion || !evaluacion.notas || evaluacion.notas.length === 0) return '--';
  const ids = criteriosCat.map(c => c.id);
  const notas = evaluacion.notas.filter(n => ids.includes(n.criterio_id));
  if (notas.length === 0) return '--';
  const sum = notas.reduce((acc, n) => acc + n.valor, 0);
  return (sum / notas.length).toFixed(1);
}

// ---------- OBTENER CRITERIOS PARA EVALUACIÓN ----------
function obtenerCriteriosParaEvaluacion() {
  return window.__jugador.getCriteriosMap();
}

// ---------- ABRIR DETALLE EVALUACIÓN ----------
async function abrirDetalleEvaluacion(trimestre, editable = false, soloLectura = false) {
  const detalleContainer = document.getElementById(`detalleEval_${trimestre}`);
  if (!detalleContainer) {
    console.warn('No se encontró el contenedor para el trimestre', trimestre);
    return;
  }

  // Si ya está abierto y no es solo lectura, lo cerramos
  if (detalleContainer.classList.contains('abierto') && !soloLectura) {
    detalleContainer.classList.remove('abierto');
    detalleContainer.innerHTML = '';
    return;
  }

  // Si es solo lectura y está abierto, lo cerramos
  if (soloLectura && detalleContainer.classList.contains('abierto')) {
    detalleContainer.classList.remove('abierto');
    detalleContainer.innerHTML = '';
    return;
  }

  const evaluaciones = window.__jugador.getEvaluaciones();
  const evalExistente = evaluaciones.find(e => e.trimestre === trimestre);
  const tieneNotas = evalExistente && evalExistente.notas && evalExistente.notas.length > 0;

  // Si no hay evaluación y no estamos en modo edición/evaluación, no hacemos nada
  if (!tieneNotas && !editable && !soloLectura) {
    mostrarNotificacion('No hay evaluación para este trimestre.', 'error');
    return;
  }

  // Si es solo lectura y no hay notas, no hacemos nada
  if (soloLectura && !tieneNotas) {
    mostrarNotificacion('No hay evaluación para mostrar.', 'error');
    return;
  }

  detalleContainer.classList.add('abierto');
  const criterios = obtenerCriteriosParaEvaluacion();

  let html = '';

  // Si hay evaluación previa, mostrar comparativa
  if (tieneNotas && trimestre > 1) {
    const evalAnterior = evaluaciones.find(e => e.trimestre === trimestre - 1);
    if (evalAnterior && evalAnterior.notas && evalAnterior.notas.length > 0) {
      html += renderizarComparativa(evalAnterior.notas, evalExistente.notas, criterios);
    }
  }

  // Mostrar criterios por bloque
  const categorias = ['tecnica', 'tactica', 'fisica', 'psicologica', 'personal'];
  const nombresCategoria = {
    tecnica: 'TÉCNICA',
    tactica: 'TÁCTICA',
    fisica: 'FÍSICA',
    psicologica: 'PSICOLÓGICA',
    personal: 'PERSONAL'
  };

  categorias.forEach(cat => {
    // Obtener criterios de esta categoría y separar comunes vs específicos
    const criteriosCat = criterios[cat] || [];
    
    // Separar comunes y específicos
    const comunes = criteriosCat.filter(c => c.es_comun === true);
    const especificos = criteriosCat.filter(c => c.es_comun === false);
    
    // Ordenar: primero comunes, luego específicos
    const criteriosOrdenados = [...comunes, ...especificos];
    
    if (criteriosOrdenados.length === 0) return;

    const notasMap = {};
    if (tieneNotas) {
      evalExistente.notas.forEach(n => {
        notasMap[n.criterio_id] = n.valor;
      });
    }

    html += `
      <div class="bloque-criterios">
        <div class="titulo-bloque">
          <span>${nombresCategoria[cat]}</span>
          <span class="media-bloque">
            Media: ${calcularMediaBloque(evalExistente, cat, criteriosOrdenados)}
          </span>
        </div>
    `;

    criteriosOrdenados.forEach(c => {
      const valor = notasMap[c.id] || '';
      const valorMostrar = valor !== '' ? valor.toFixed(1) : '--';
      const valorSlider = valor !== '' ? valor : 1;
      
      // Determinar si es específico (no común)
      const esEspecifico = c.es_comun === false;

      html += `
        <div class="fila-criterio ${soloLectura ? 'lectura' : ''} ${esEspecifico ? 'fila-especifico' : ''}">
          <span class="nombre">${escaparHTML(c.nombre)}</span>
          <div class="slider-wrapper">
            <input type="range" min="4" max="10" step="0.5" 
              value="${valorSlider}" 
              data-criterio="${c.id}"
              data-trimestre="${trimestre}"
              ${soloLectura ? 'disabled' : ''}
              ${!editable && !soloLectura ? 'disabled' : ''}
            />
            <span class="valor-num ${valor === '' ? 'sin-nota' : ''}">${valorMostrar}</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  // Observaciones
  const obsValue = tieneNotas ? (evalExistente.observaciones || '') : '';
  html += `
    <div class="observaciones-eval">
      <label for="obsEval_${trimestre}">Observaciones</label>
      <textarea id="obsEval_${trimestre}" ${soloLectura ? 'disabled' : ''} ${!editable && !soloLectura ? 'disabled' : ''}>${escaparHTML(obsValue)}</textarea>
    </div>
  `;

  // Acciones del detalle
  if (!soloLectura) {
    html += `
      <div class="acciones-detalle">
        <button class="guardar" data-action="guardar-evaluacion" data-trimestre="${trimestre}">${tieneNotas ? 'Guardar cambios' : 'Guardar evaluación'}</button>
        <button class="cancelar" data-action="cerrar-detalle" data-trimestre="${trimestre}">Cerrar</button>
      </div>
    `;
  } else {
    html += `
      <div class="acciones-detalle">
        <button class="cancelar" data-action="cerrar-detalle" data-trimestre="${trimestre}">Cerrar</button>
      </div>
    `;
  }

  detalleContainer.innerHTML = html;
  inicializarEventosDetalle(trimestre, detalleContainer);
}

// ---------- INICIALIZAR EVENTOS DEL DETALLE ----------
function inicializarEventosDetalle(trimestre, container) {
  // Función para recalcular todas las medias del bloque
  function recalcularMedias(container) {
    const bloques = container.querySelectorAll('.bloque-criterios');
    bloques.forEach(bloque => {
      const sliders = bloque.querySelectorAll('input[type="range"]');
      const mediaSpan = bloque.querySelector('.media-bloque');
      if (!mediaSpan) return;

      let suma = 0;
      let count = 0;
      sliders.forEach(slider => {
        const val = parseFloat(slider.value);
        if (!isNaN(val) && val >= 1 && val <= 10) {
          suma += val;
          count++;
        }
      });

      const media = count > 0 ? (suma / count) : 0;
      mediaSpan.textContent = `Media: ${media > 0 ? media.toFixed(1) : '--'}`;
    });

    // Recalcular media global y actualizar tarjeta
    actualizarMediaTarjeta(container);
  }

  // Eventos de los sliders (mostrar valor + recalcular media)
  container.querySelectorAll('input[type="range"]').forEach(slider => {
    const valorSpan = slider.parentElement.querySelector('.valor-num');
    
    slider.addEventListener('input', function() {
      const val = parseFloat(this.value);
      valorSpan.textContent = val.toFixed(1);
      valorSpan.classList.remove('sin-nota');
      
      // Recalcular medias en tiempo real
      recalcularMedias(container);
    });
  });

  // Botón guardar
  const btnGuardar = container.querySelector('[data-action="guardar-evaluacion"]');
  if (btnGuardar) {
    btnGuardar.addEventListener('click', async function() {
      const trimestreVal = parseInt(this.dataset.trimestre);
      await guardarEvaluacion(trimestreVal, container);
    });
  }

  // Botón cerrar
  const btnCerrar = container.querySelector('[data-action="cerrar-detalle"]');
  if (btnCerrar) {
    btnCerrar.addEventListener('click', function() {
      const cont = this.closest('.detalle-evaluacion');
      if (cont) {
        cont.classList.remove('abierto');
        cont.innerHTML = '';
      }
    });
  }

  // Calcular medias iniciales al abrir
  recalcularMedias(container);
}

// ---------- ACTUALIZAR MEDIA EN TARJETA ----------
function actualizarMediaTarjeta(container) {
  const tarjeta = container.closest('.tarjeta-evaluacion');
  if (!tarjeta) return;

  const sliders = container.querySelectorAll('input[type="range"]');
  let suma = 0;
  let count = 0;
  sliders.forEach(slider => {
    const val = parseFloat(slider.value);
    if (!isNaN(val) && val >= 1 && val <= 10) {
      suma += val;
      count++;
    }
  });

  const mediaGlobal = count > 0 ? (suma / count) : null;
  const mediaGlobalElement = tarjeta.querySelector('.media-global');
  if (mediaGlobalElement) {
    if (mediaGlobal !== null) {
      mediaGlobalElement.textContent = mediaGlobal.toFixed(1);
      mediaGlobalElement.className = 'media-global';
    } else {
      mediaGlobalElement.innerHTML = '<span class="sin-evaluar">Sin evaluar</span>';
    }
  }

  // Actualizar también el resumen rápido si existe
  const resumenContainer = document.querySelector('.resumen-rapido');
  if (resumenContainer) {
    const items = resumenContainer.querySelectorAll('.item');
    if (items.length > 0) {
      const mediaItem = items[0];
      const valorSpan = mediaItem.querySelector('.valor');
      if (valorSpan) {
        if (mediaGlobal !== null) {
          valorSpan.textContent = mediaGlobal.toFixed(1);
          valorSpan.className = 'valor';
        } else {
          valorSpan.textContent = '--';
          valorSpan.className = 'valor texto-secundario';
        }
      }
    }
  }
}

// ---------- GUARDAR EVALUACIÓN ----------
async function guardarEvaluacion(trimestre, container) {
  const sliders = container.querySelectorAll('input[type="range"]');
  const notas = [];
  sliders.forEach(slider => {
    const valor = parseFloat(slider.value);
    if (!isNaN(valor) && valor >= 1 && valor <= 10) {
      notas.push({
        criterio_id: slider.dataset.criterio,
        valor: valor
      });
    }
  });

  const observaciones = container.querySelector(`#obsEval_${trimestre}`)?.value || '';

  if (notas.length === 0) {
    mostrarNotificacion('No hay notas para guardar.', 'error');
    return;
  }

  const jugador = window.__jugador.getActual();
  const temporada = window.__jugador.getTemporada();
  const fecha = new Date().toISOString().split('T')[0];

  const resultado = await guardarEvaluacionCompleta(
    jugador.id,
    temporada.id,
    trimestre,
    fecha,
    observaciones,
    notas
  );

  if (resultado.success) {
    mostrarNotificacion('Evaluación guardada correctamente.', 'exito');
    await window.__recargarTodo();
  } else {
    mostrarNotificacion(resultado.error || 'Error al guardar la evaluación.', 'error');
  }
}

// ---------- RENDERIZAR COMPARATIVA ----------
function renderizarComparativa(notasAnteriores, notasActuales, criterios) {
  const mapAnterior = {};
  notasAnteriores.forEach(n => { mapAnterior[n.criterio_id] = n.valor; });
  const mapActual = {};
  notasActuales.forEach(n => { mapActual[n.criterio_id] = n.valor; });

  const todosIds = new Set([...Object.keys(mapAnterior), ...Object.keys(mapActual)]);

  const nombreMap = {};
  Object.values(criterios).flat().forEach(c => {
    nombreMap[c.id] = c.nombre;
  });

  const sortedIds = Array.from(todosIds).sort((a, b) => {
    const na = nombreMap[a] || a;
    const nb = nombreMap[b] || b;
    return na.localeCompare(nb);
  });

  let html = `
    <div class="comparativa-eval">
      <div class="titulo">📊 Comparativa con evaluación anterior</div>
      <table>
        <thead>
          <tr>
            <th>Criterio</th>
            <th>Anterior</th>
            <th>Actual</th>
            <th>Dif.</th>
          </tr>
        </thead>
        <tbody>
  `;

  sortedIds.forEach(id => {
    const anterior = mapAnterior[id];
    const actual = mapActual[id];
    if (anterior === undefined && actual === undefined) return;

    const nombre = nombreMap[id] || id;
    const diff = (actual !== undefined && anterior !== undefined) ? actual - anterior : null;
    const claseDiff = diff !== null ? (diff > 0 ? 'positiva' : (diff < 0 ? 'negativa' : '')) : '';
    const signo = diff !== null && diff > 0 ? '+' : '';

    html += `
      <tr>
        <td>${escaparHTML(nombre)}</td>
        <td>${anterior !== undefined ? anterior.toFixed(1) : '--'}</td>
        <td>${actual !== undefined ? actual.toFixed(1) : '--'}</td>
        <td class="diferencia ${claseDiff}">${diff !== null ? signo + diff.toFixed(1) : '--'}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

// ---------- FUNCIONES AUXILIARES ----------
function getNombreCategoria(key) {
  const nombres = {
    tecnica: 'Técnica',
    tactica: 'Táctica',
    fisica: 'Física',
    psicologica: 'Psicológica',
    personal: 'Personal'
  };
  return nombres[key] || key;
}

function getNombreTrimestre(num) {
  const nombres = ['', 'Septiembre', 'Diciembre', 'Marzo', 'Junio'];
  return nombres[num] || num;
}

// ---------- EXPORTAR ----------
window.__eval = {
  renderizarEvaluaciones,
  abrirDetalleEvaluacion,
  guardarEvaluacion,
  calcularMediaGlobal,
  calcularMediasPorBloque,
  renderizarComparativa,
  actualizarMediaTarjeta
};