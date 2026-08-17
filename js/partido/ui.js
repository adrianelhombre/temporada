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
    if (info.roja) salida += `<span class="chip-tarjeta chip-roja">${escaparHTML(dorsal)}</span>`;
    if (info.amarillas > 0) {
      const doble = info.amarillas >= 2 ? " chip-doble-amarilla" : "";
      salida += `<span class="chip-tarjeta chip-amarilla${doble}">${escaparHTML(dorsal)}</span>`;
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
      const amarillas = amarillasJugador(jugadorId);
      
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
      
      ficha.innerHTML = `
        <div class="circulo" style="${expulsado ? "opacity:0.45;" : ""}">${j ? j.dorsal : "?"}</div>
        ${badgeEntra}
        ${amarillas || expulsado ? `<div class="badges-tarjetas-campo">
          ${amarillas ? `<div class="badge-amarilla"></div>` : ""}
          ${expulsado ? '<div class="badge-roja"></div>' : ""}
        </div>` : ""}
        <div class="minutos">${formatoMMSS(mins)}</div>
        ${botonEliminar}
      `;
      ficha.style.position = "absolute";
    } else {
      // Hueco vacío - verificar si hay convocados disponibles
      const hayConvocadosDisponibles = jugadores.some(j => 
        jugadorActivo(j) && 
        !idsEnCampo.has(j.id) && 
        setConvocados.has(j.id)
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
        // No añadir event listener
      }
    }

    // Solo añadir event listener si hay jugador y estamos en condiciones
    if (jugadorId && !antesDeEmpezar) {
      ficha.addEventListener("click", () => manejarClicCampo(slot.id, jugadorId));
    }

    campo.appendChild(ficha);
  });

  // Listener para botones de eliminar (event delegation)
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
  
  // Obtener los IDs de jugadores convocados (del partido)
  const convocados = partido.convocados || [];
  const setConvocados = new Set(convocados);
  
  // Filtrar: solo jugadores activos, que NO estén en campo, y que ESTÉN CONVOCADOS
  const suplentes = jugadores.filter((j) => 
    jugadorActivo(j) && 
    !idsEnCampo.has(j.id) &&
    setConvocados.has(j.id)
  );
  
  const cont = document.getElementById("banquillo");
  cont.innerHTML = "";
  const antesDeEmpezar = estadoDirecto.estado === "no_iniciado";

  suplentes.forEach((j) => {
    const ficha = document.createElement("div");
    const expulsado = estaExpulsado(j.id);
    const amarillas = amarillasJugador(j.id);
    const pendienteCambio = cambiosPendientes.some((c) => c.entraJugadorId === j.id);
    
    const estaSeleccionado = seleccion && seleccion.origen === "banquillo" && seleccion.jugadorId === j.id;
    const estaSeleccionadoCampo = seleccion && seleccion.origen === "campo" && Object.values(estadoDirecto.huecos).includes(seleccion.jugadorId) && seleccion.jugadorId === j.id;
    const resaltar = (modoCambio && estaSeleccionado) || (modoCambio && estaSeleccionadoCampo);

    ficha.className = "ficha-jugador-banquillo" + (resaltar ? " seleccionado" : "");
    ficha.classList.toggle("expulsado", expulsado);
    ficha.classList.toggle("pendiente-cambio", pendienteCambio);
    ficha.dataset.jugador = j.id;

    const mins = estadoDirecto.minutos[j.id] || 0;
    
    ficha.innerHTML = `
      <div class="circulo" style="${expulsado ? "opacity:0.45;" : ""}">${j.dorsal}</div>
      ${amarillas || expulsado ? `<div class="badges-tarjetas-banquillo">
        ${amarillas ? `<div class="badge-amarilla"></div>` : ""}
        ${expulsado ? '<div class="badge-roja"></div>' : ""}
      </div>` : ""}
      <div class="nombre-banquillo">${j.nombre}</div>
      <div class="minutos">${formatoMMSS(mins)}</div>
    `;

    if (!antesDeEmpezar) {
      ficha.addEventListener("click", () => manejarClicBanquillo(j.id));
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
  
  // Mostrar cada cambio pendiente con su botón de cancelar individual
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
  
  // Información del jugador seleccionado actualmente
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
  
  // Listeners para cancelar cambios individuales
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

  // Pausar/Reanudar
  document.getElementById("botonPausar").classList.toggle("oculto", !enCurso);
  document.getElementById("botonReanudar").classList.toggle("oculto", !pausado);

  // Lógica de botones según parte
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

  // --- DESHABILITAR ACCIONES RÁPIDAS EN DESCANSO Y AL FINALIZAR ---
  const accionesRapidas = [
    "botonTiroPuerta",
    "botonTiroFuera",
    "botonCorner",
    "botonFalta",
    "botonFueraJuego"
  ];
  
  const enDescanso = estadoDirecto.estado === "descanso";
  
  accionesRapidas.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = finalizado || enDescanso;
    }
  });

  // Modo cambio: habilitado en descanso (solo deshabilitado si no iniciado o finalizado)
  document.getElementById("botonModoCambio").disabled = finalizado || estadoDirecto.estado === "no_iniciado";
  
  // Gol rival: deshabilitado en descanso
  document.getElementById("botonGolRival").disabled = finalizado || estadoDirecto.estado === "no_iniciado" || enDescanso;
  
  // Tarjeta rival: siempre habilitada (incluso en descanso) excepto si no iniciado o finalizado
  document.getElementById("botonTarjetaRival").disabled = finalizado || estadoDirecto.estado === "no_iniciado";
  
  document.getElementById("selectFormacion").disabled = finalizado;
}

function pintarTodo() {
  pintarCabecera();
  pintarCampo();
  pintarBanquillo();
  pintarCambiosPendientes();
  pintarControles();
}