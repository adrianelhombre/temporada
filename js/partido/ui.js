// ---------- Pintado ----------

function pintarCabecera() {
  const esLocal = partido.condicion === "local";
  const nombreIzq = esLocal ? NOMBRE_EQUIPO : partido.rival;
  const nombreDer = esLocal ? partido.rival : NOMBRE_EQUIPO;
  const golesPropios = eventosPartido.filter((e) => e.tipo === "gol").length;
  const golesRival = eventosRival.filter((e) => e.tipo === "gol").length;
  const marcadorIzq = esLocal ? golesPropios : golesRival;
  const marcadorDer = esLocal ? golesRival : golesPropios;

  document.getElementById("nombreIzquierda").textContent = nombreIzq;
  document.getElementById("nombreDerecha").textContent = nombreDer;
  document.getElementById("golesIzquierda").textContent = marcadorIzq;
  document.getElementById("golesDerecha").textContent = marcadorDer;

  const enVivo = estadoDirecto.estado === "en_curso";
  const badgeLive = document.getElementById("badgeLive");
  badgeLive.classList.toggle("oculto", !enVivo);

  const etiquetaEstado = {
    no_iniciado: "Sin Empezar",
    en_curso: `${estadoDirecto.parte}ª Parte en Juego`,
    pausado: "Pausado",
    descanso: "Descanso",
    finalizado: "Partido Finalizado",
  }[estadoDirecto.estado] || "";

  document.getElementById("marcadorParte").textContent = enVivo ? `${estadoDirecto.parte}ª Parte` : etiquetaEstado;

  const segundos = segundosMarcador();
  document.getElementById("textoTiempo").textContent = formatoMMSS(segundos);
  document.getElementById("textoEstado").textContent = enVivo ? `${estadoDirecto.parte}ª Parte en Juego` : etiquetaEstado;

  pintarTarjetasCabecera(esLocal);
}

function pintarTarjetasCabecera(esLocal) {
  const propias = {};
  eventosPartido.filter((e) => e.tipo === "amarilla" || e.tipo === "roja").forEach((e) => {
    const j = jugadorPorId(e.jugador_id);
    if (!j) return;
    propias[j.dorsal] = propias[j.dorsal] || { amarillas: 0, roja: false };
    if (e.tipo === "amarilla") propias[j.dorsal].amarillas++;
    if (e.tipo === "roja") propias[j.dorsal].roja = true;
  });

  const rivales = {};
  eventosRival.filter((e) => e.tipo === "amarilla" || e.tipo === "roja").forEach((e) => {
    const d = e.dorsal || "?";
    rivales[d] = rivales[d] || { amarillas: 0, roja: false };
    if (e.tipo === "amarilla") rivales[d].amarillas++;
    if (e.tipo === "roja") rivales[d].roja = true;
  });

  const html = (grupo) => Object.entries(grupo).map(([dorsal, info]) => {
    let salida = "";
    if (info.roja) {
      salida += `<span class="chip-tarjeta chip-roja">${escaparHTML(dorsal)}</span>`;
    } else if (info.amarillas >= 2) {
      salida += `<span class="chip-tarjeta chip-doble-amarilla">${escaparHTML(dorsal)}</span>`;
    } else if (info.amarillas === 1) {
      salida += `<span class="chip-tarjeta chip-amarilla">${escaparHTML(dorsal)}</span>`;
    }
    return salida;
  }).join("");

  const propiasHTML = html(propias);
  const rivalesHTML = html(rivales);

  document.getElementById("tarjetasIzquierda").innerHTML = esLocal ? propiasHTML : rivalesHTML;
  document.getElementById("tarjetasDerecha").innerHTML = esLocal ? rivalesHTML : propiasHTML;
}

function pintarCampo() {
  const campo = document.getElementById("campo");
  campo.querySelectorAll(".ficha-jugador").forEach((el) => el.remove());

  const slots = FORMACIONES[partido.formacion];
  const antesDeEmpezar = estadoDirecto.estado === "no_iniciado";
  const convocados = partido.convocados || [];
  const setConvocados = new Set(convocados);
  const idsEnCampo = new Set(Object.values(estadoDirecto.huecos).filter(Boolean));

  // Identificar al portero (slot "por")
  const porteroId = estadoDirecto.huecos && estadoDirecto.huecos.por ? estadoDirecto.huecos.por : null;

  slots.forEach((slot) => {
    const jugadorId = estadoDirecto.huecos[slot.id];
    const ficha = document.createElement("div");
    ficha.className = "ficha-jugador";
    ficha.style.left = slot.x + "%";
    ficha.style.top = slot.y + "%";
    ficha.dataset.slot = slot.id;

    if (jugadorId) {
      const j = jugadorPorId(jugadorId);
      const expulsado = estaExpulsado(jugadorId);
      const amarillas = eventosPartido.filter(e => e.jugador_id === jugadorId && e.tipo === "amarilla").length;
      const tieneRoja = eventosPartido.some(e => e.jugador_id === jugadorId && e.tipo === "roja");
      const expulsadoPorDobleAmarilla = expulsado && amarillas >= 2 && !tieneRoja;
      const esPortero = jugadorId === porteroId;
      
      const estaSeleccionado = seleccion && seleccion.origen === "campo" && seleccion.slotId === slot.id;
      const estaSeleccionadoBanquillo = seleccion && seleccion.origen === "banquillo" && seleccion.jugadorId === jugadorId;
      const resaltar = (modoCambio && estaSeleccionado) || (modoCambio && estaSeleccionadoBanquillo);
      
      const pendienteCambio = cambiosPendientes.some((c) => c.saleJugadorId === jugadorId);
      
      let jugadorEntra = null;
      const cambioPendiente = cambiosPendientes.find((c) => c.saleJugadorId === jugadorId);
      if (cambioPendiente) {
        jugadorEntra = jugadorPorId(cambioPendiente.entraJugadorId);
      }
      
      ficha.classList.toggle("seleccionado", resaltar);
      ficha.classList.toggle("pendiente-cambio", pendienteCambio);
      ficha.classList.toggle("expulsado", expulsado);
      if (esPortero) {
        ficha.classList.add("portero");
      }
      if (expulsadoPorDobleAmarilla) {
        ficha.classList.add("expulsado-doble-amarilla");
      }
      ficha.dataset.jugador = jugadorId;
      
      const mins = estadoDirecto.minutos[jugadorId] || 0;
      
      let botonEliminar = "";
      if (antesDeEmpezar) {
        botonEliminar = `
          <button class="btn-eliminar-jugador" data-jugador="${jugadorId}" data-slot="${slot.id}" title="Eliminar jugador del campo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        `;
      }
      
      let badgeEntra = "";
      if (jugadorEntra) {
        badgeEntra = `
          <div class="badge-entra" title="Entra ${jugadorEntra.dorsal} - ${jugadorEntra.nombre}">
            <span class="badge-entra-numero">${jugadorEntra.dorsal}</span>
          </div>
        `;
      }
      
      let badgesHTML = "";
      if (amarillas || expulsado) {
        badgesHTML = `<div class="badges-tarjetas-campo">`;
        if (expulsado) {
          badgesHTML += `<div class="badge-roja" title="Expulsado${expulsadoPorDobleAmarilla ? ' por doble amarilla' : ''}"></div>`;
        } else if (amarillas === 1) {
          badgesHTML += `<div class="badge-amarilla" title="1 tarjeta amarilla"></div>`;
        }
        badgesHTML += `</div>`;
      }
      
      ficha.innerHTML = `
        <div class="circulo" style="${expulsado ? "opacity:0.45;" : ""}">${j ? j.dorsal : "?"}</div>
        ${badgeEntra}
        ${badgesHTML}
        <div class="minutos">${formatoMMSS(mins)}</div>
        ${botonEliminar}
      `;
      ficha.style.position = "absolute";
    } else {
      const hayConvocadosDisponibles = jugadores.some(j => 
        jugadorActivo(j) && 
        !idsEnCampo.has(j.id) && 
        setConvocados.has(j.id) &&
        !estaExpulsado(j.id)
      );
      
      if (hayConvocadosDisponibles) {
        ficha.innerHTML = `<div class="circulo" style="border-style:dashed; opacity:0.7;">+</div><div class="minutos">${slot.etiqueta}</div>`;
        ficha.style.position = "absolute";
        ficha.addEventListener("click", () => manejarClicCampo(slot.id, null));
      } else {
        ficha.innerHTML = `<div class="circulo" style="border-style:dashed; opacity:0.3;">-</div><div class="minutos">${slot.etiqueta}</div>`;
        ficha.style.position = "absolute";
        ficha.style.cursor = "default";
        ficha.title = "No hay jugadores convocados disponibles";
      }
    }

    if (jugadorId && !antesDeEmpezar && !estaExpulsado(jugadorId)) {
      ficha.addEventListener("click", () => manejarClicCampo(slot.id, jugadorId));
    }

    campo.appendChild(ficha);
  });

  if (antesDeEmpezar) {
    campo.querySelectorAll(".btn-eliminar-jugador").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const jugadorId = btn.dataset.jugador;
        const slotId = btn.dataset.slot;
        eliminarJugadorDelCampo(jugadorId, slotId);
      });
    });
  }
}

function pintarBanquillo() {
  const idsEnCampo = new Set(Object.values(estadoDirecto.huecos).filter(Boolean));
  
  const convocados = partido.convocados || [];
  const setConvocados = new Set(convocados);
  
  // Identificar al portero titular (slot "por")
  const porteroTitularId = estadoDirecto.huecos && estadoDirecto.huecos.por ? estadoDirecto.huecos.por : null;
  
  const suplentes = jugadores.filter((j) => 
    jugadorActivo(j) && 
    !idsEnCampo.has(j.id) &&
    setConvocados.has(j.id)
  );
  
  // Separar porteros y resto de jugadores
  const porteros = [];
  const resto = [];
  
  suplentes.forEach(j => {
    const posJugador = obtenerPosicionesJugador(j);
    const esPortero = posJugador.principal === "POR" || posJugador.secundarias.includes("POR");
    if (esPortero) {
      porteros.push(j);
    } else {
      resto.push(j);
    }
  });
  
  // Ordenar porteros por dorsal (para mantener consistencia)
  porteros.sort((a, b) => a.dorsal - b.dorsal);
  // Ordenar resto por dorsal
  resto.sort((a, b) => a.dorsal - b.dorsal);
  
  // Combinar: primero porteros, luego el resto
  const suplentesOrdenados = [...porteros, ...resto];
  
  const cont = document.getElementById("banquillo");
  cont.innerHTML = "";
  const antesDeEmpezar = estadoDirecto.estado === "no_iniciado";

  suplentesOrdenados.forEach((j) => {
    const ficha = document.createElement("div");
    const expulsado = estaExpulsado(j.id);
    const amarillas = eventosPartido.filter(e => e.jugador_id === j.id && e.tipo === "amarilla").length;
    const tieneRoja = eventosPartido.some(e => e.jugador_id === j.id && e.tipo === "roja");
    const expulsadoPorDobleAmarilla = expulsado && amarillas >= 2 && !tieneRoja;
    const pendienteCambio = cambiosPendientes.some((c) => c.entraJugadorId === j.id);
    
    // Verificar si este jugador es portero (tiene la posición "POR" en sus posiciones)
    const posJugador = obtenerPosicionesJugador(j);
    const esPortero = posJugador.principal === "POR" || posJugador.secundarias.includes("POR");
    
    const estaSeleccionado = seleccion && seleccion.origen === "banquillo" && seleccion.jugadorId === j.id;
    const estaSeleccionadoCampo = seleccion && seleccion.origen === "campo" && Object.values(estadoDirecto.huecos).includes(seleccion.jugadorId) && seleccion.jugadorId === j.id;
    const resaltar = (modoCambio && estaSeleccionado) || (modoCambio && estaSeleccionadoCampo);

    ficha.className = "ficha-jugador-banquillo" + (resaltar ? " seleccionado" : "");
    ficha.classList.toggle("expulsado", expulsado);
    if (esPortero) {
      ficha.classList.add("portero");
    }
    if (expulsadoPorDobleAmarilla) {
      ficha.classList.add("expulsado-doble-amarilla");
    }
    ficha.classList.toggle("pendiente-cambio", pendienteCambio);
    ficha.dataset.jugador = j.id;

    const mins = estadoDirecto.minutos[j.id] || 0;
    
    let badgesHTML = "";
    if (amarillas || expulsado) {
      badgesHTML = `<div class="badges-tarjetas-banquillo">`;
      if (expulsado) {
        badgesHTML += `<div class="badge-roja" title="Expulsado${expulsadoPorDobleAmarilla ? ' por doble amarilla' : ''}"></div>`;
      } else if (amarillas === 1) {
        badgesHTML += `<div class="badge-amarilla" title="1 tarjeta amarilla"></div>`;
      }
      badgesHTML += `</div>`;
    }
    
    ficha.innerHTML = `
      <div class="circulo" style="${expulsado ? "opacity:0.45;" : ""}">${j.dorsal}</div>
      ${badgesHTML}
      <div class="nombre-banquillo">${j.nombre}</div>
      <div class="minutos">${formatoMMSS(mins)}</div>
    `;

    if (!antesDeEmpezar) {
      ficha.addEventListener("click", () => {
        if (estaExpulsado(j.id)) {
          mostrarNotificacion("Este jugador está expulsado.", "error");
          return;
        }
        manejarClicBanquillo(j.id);
      });
    } else {
      ficha.style.cursor = "default";
      ficha.title = "Los suplentes no pueden registrar eventos antes del inicio";
    }
    cont.appendChild(ficha);
  });
}

function pintarCambiosPendientes() {
  const box = document.getElementById("cambiosPendientesBox");
  if (cambiosPendientes.length === 0) {
    box.classList.add("oculto");
    return;
  }
  box.classList.remove("oculto");
  
  let html = '';
  
  cambiosPendientes.forEach((c, index) => {
    const sale = jugadorPorId(c.saleJugadorId);
    const entra = jugadorPorId(c.entraJugadorId);
    html += `
      <div class="cambio-pendiente-item">
        <div class="cambio-pendiente-info">
          <span class="cambio-sale">Sale ${sale ? sale.dorsal : "?"} - ${sale ? sale.nombre : "?"}</span>
          <span class="cambio-flecha">→</span>
          <span class="cambio-entra">Entra ${entra ? entra.dorsal : "?"} - ${entra ? entra.nombre : "?"}</span>
        </div>
        <button class="btn-cancelar-cambio" data-index="${index}" title="Cancelar este cambio">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  });
  
  let infoSeleccion = "";
  if (seleccion) {
    const j = jugadorPorId(seleccion.jugadorId);
    const origen = seleccion.origen === "campo" ? "campo" : "banquillo";
    infoSeleccion = `<div class="cambio-seleccionado-info">
      Seleccionado: ${j ? `${j.dorsal} - ${j.nombre}` : "?"} (${origen})
      <span style="font-size: 0.7rem; color: var(--texto-secundario);">(pulsa otro jugador para completar el cambio)</span>
    </div>`;
  }
  
  box.innerHTML = `
    <div class="cambios-pendientes-header">
      <span>Cambios pendientes (${cambiosPendientes.length})</span>
      <button class="btn-texto" id="botonCancelarTodosCambios">Cancelar todos</button>
    </div>
    ${infoSeleccion}
    <div class="cambios-pendientes-lista">
      ${html}
    </div>
    <div class="fila-botones" style="margin-top:0.5rem;">
      <button class="primario ancho" id="botonConfirmarCambios">Confirmar cambios</button>
    </div>
  `;
  
  box.querySelectorAll('.btn-cancelar-cambio').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      cancelarCambioPendiente(index);
    });
  });
  
  document.getElementById("botonConfirmarCambios").addEventListener("click", confirmarCambios);
  document.getElementById("botonCancelarTodosCambios").addEventListener("click", cancelarTodosLosCambios);
}

function pintarControles() {
  const antes = document.getElementById("bloqueAntesEmpezar");
  const control = document.getElementById("bloqueControlParte");
  const finalizado = partido.estado === "finalizado";

  antes.classList.toggle("oculto", estadoDirecto.estado !== "no_iniciado" || finalizado);
  control.classList.toggle("oculto", estadoDirecto.estado === "no_iniciado" || finalizado);

  const enCurso = estadoDirecto.estado === "en_curso";
  const pausado = estadoDirecto.estado === "pausado";
  const descanso = estadoDirecto.estado === "descanso";
  const parte1 = estadoDirecto.parte === 1;
  const parte2 = estadoDirecto.parte === 2;

  document.getElementById("botonPausar").classList.toggle("oculto", !enCurso);
  document.getElementById("botonReanudar").classList.toggle("oculto", !pausado);

  if (enCurso) {
    if (parte1) {
      document.getElementById("botonDescanso").classList.remove("oculto");
      document.getElementById("botonFinalizarPartido").classList.add("oculto");
      document.getElementById("botonEmpezar2aParte").classList.add("oculto");
    } else if (parte2) {
      document.getElementById("botonDescanso").classList.add("oculto");
      document.getElementById("botonFinalizarPartido").classList.remove("oculto");
      document.getElementById("botonEmpezar2aParte").classList.add("oculto");
    }
  } else if (descanso) {
    document.getElementById("botonDescanso").classList.add("oculto");
    document.getElementById("botonFinalizarPartido").classList.add("oculto");
    document.getElementById("botonEmpezar2aParte").classList.remove("oculto");
  } else {
    document.getElementById("botonDescanso").classList.add("oculto");
    document.getElementById("botonFinalizarPartido").classList.add("oculto");
    document.getElementById("botonEmpezar2aParte").classList.add("oculto");
  }

  const accionesRapidas = [
    "botonCorner",
    "botonFueraJuego",
    "botonGolRival",
    "botonTarjetaRival",
    "botonTiroRival"
  ];
  
  const enDescanso = estadoDirecto.estado === "descanso";
  const noIniciado = estadoDirecto.estado === "no_iniciado";
  
  accionesRapidas.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = finalizado || enDescanso || noIniciado;
    }
  });

  document.getElementById("botonModoCambio").disabled = finalizado || estadoDirecto.estado === "no_iniciado";
  document.getElementById("selectFormacion").disabled = finalizado;
}

function pintarTodo() {
  pintarCabecera();
  pintarCampo();
  pintarBanquillo();
  pintarCambiosPendientes();
  pintarControles();
}