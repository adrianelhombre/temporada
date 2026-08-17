// ---------- Construcción de líneas y renderizado ----------

const ICONOS_EVENTO = {
  gol: "⚽",
  asistencia: "🅰️",
  amarilla: "🟨",
  roja: "🟥",
  cambio: "🔄",
  tiro_puerta_favor: "🎯",
  tiro_puerta_contra: "🎯",
  tiro_fuera_favor: "❌",
  tiro_fuera_contra: "❌",
  corner_favor: "📐",
  corner_contra: "📐",
  falta_favor: "⚠️",
  falta_contra: "⚠️",
  fuera_juego_favor: "🚩",
  fuera_juego_contra: "🚩",
};

const ETIQUETAS_EVENTO = {
  gol: "Gol",
  asistencia: "Asistencia",
  amarilla: "Tarjeta amarilla",
  roja: "Tarjeta roja",
  cambio: "Cambios",
  tiro_puerta_favor: "Tiro a puerta",
  tiro_puerta_contra: "Tiro a puerta",
  tiro_fuera_favor: "Tiro fuera",
  tiro_fuera_contra: "Tiro fuera",
  corner_favor: "Córner",
  corner_contra: "Córner",
  falta_favor: "Falta",
  falta_contra: "Falta",
  fuera_juego_favor: "Fuera de juego",
  fuera_juego_contra: "Fuera de juego",
};

function construirLineasHistorial() {
  const lineas = [];

  // --- Cambios agrupados por bloque ---
  const bloques = {};
  sustituciones.forEach(s => {
    if (!bloques[s.bloque_id]) bloques[s.bloque_id] = [];
    bloques[s.bloque_id].push(s);
  });

  for (const [bloqueId, sustitucionesBloque] of Object.entries(bloques)) {
    sustitucionesBloque.sort((a, b) => a.bloque_orden - b.bloque_orden);
    const primera = sustitucionesBloque[0];
    const parte = primera.parte;
    const segundo = primera.segundo;

    const eventoSale = eventosPartido.find(e =>
      e.tipo === "sale" &&
      e.jugador_id === primera.jugador_sale &&
      e.parte === parte
    );

    const momento = eventoSale ? eventoSale.momento : new Date().toISOString();

    const parejas = sustitucionesBloque.map(s => ({
      sale: jugadorPorId(s.jugador_sale),
      entra: jugadorPorId(s.jugador_entra)
    }));

    lineas.push({
      momento: momento,
      parte: parte,
      tipo: "cambio",
      editable: true,
      id: bloqueId,
      origen: "propio",
      parejas: parejas,
      bloqueId: bloqueId,
      segundoOriginal: segundo,
      momentoOriginal: momento
    });
  }

  // --- Eventos propios (excluyendo sale/entra) ---
  eventosPartido.forEach(e => {
    if (e.tipo === "sale" || e.tipo === "entra") return;
    
    if (e.tipo && (e.tipo.includes('_favor') || e.tipo.includes('_contra'))) {
      const labels = {
        'tiro_puerta': 'Tiro a puerta',
        'tiro_fuera': 'Tiro fuera',
        'corner': 'Córner',
        'falta': 'Falta',
        'fuera_juego': 'Fuera de juego'
      };
      const tipoBase = e.tipo.replace('_favor', '').replace('_contra', '');
      const nombreEvento = labels[tipoBase] || tipoBase;
      
      let textoCompleto = nombreEvento;
      if (e.jugador_id) {
        const j = jugadorPorId(e.jugador_id);
        if (j) {
          textoCompleto = `${j.dorsal} - ${j.nombre}`;
        }
      }
      
      lineas.push({
        momento: e.momento,
        parte: e.parte,
        tipo: e.tipo,
        editable: true,
        id: e.id,
        origen: "propio",
        texto: textoCompleto,
      });
      return;
    }
    
    const j = jugadorPorId(e.jugador_id);
    lineas.push({
      momento: e.momento,
      parte: e.parte,
      tipo: e.tipo,
      editable: true,
      id: e.id,
      origen: "propio",
      jugadorId: e.jugador_id,
      texto: j ? `${j.dorsal} - ${j.nombre}` : "Jugador",
    });
  });

  // --- Eventos rival ---
  eventosRival.forEach(e => {
    if (e.tipo && (e.tipo.includes('_favor') || e.tipo.includes('_contra'))) {
      const labels = {
        'tiro_puerta': 'Tiro a puerta',
        'tiro_fuera': 'Tiro fuera',
        'corner': 'Córner',
        'falta': 'Falta',
        'fuera_juego': 'Fuera de juego'
      };
      const tipoBase = e.tipo.replace('_favor', '').replace('_contra', '');
      const nombreEvento = labels[tipoBase] || tipoBase;
      
      let textoCompleto = nombreEvento;
      if (e.dorsal) {
        textoCompleto = `${e.dorsal} - Rival`;
      }
      
      lineas.push({
        momento: e.momento,
        parte: e.parte,
        tipo: e.tipo,
        editable: true,
        id: e.id,
        origen: "rival",
        texto: textoCompleto,
      });
      return;
    }
    
    lineas.push({
      momento: e.momento,
      parte: e.parte,
      tipo: e.tipo,
      editable: true,
      id: e.id,
      origen: "rival",
      dorsal: e.dorsal,
      texto: `${e.dorsal || "?"} - Rival`,
    });
  });

  return lineas.sort((a, b) => {
    const diffA = minutoTotalPartido(a.momento, a.parte);
    const diffB = minutoTotalPartido(b.momento, b.parte);
    return diffA !== diffB ? diffA - diffB : new Date(a.momento) - new Date(b.momento);
  });
}

function crearFilaEvento(l) {
  const minutoTotal = Math.round(minutoTotalPartido(l.momento, l.parte) / 60);
  const icono = ICONOS_EVENTO[l.tipo] || "•";
  const etiqueta = ETIQUETAS_EVENTO[l.tipo] || l.tipo;
  const lado = l.origen === "rival" ? "rival" : "propio";

  const fila = document.createElement("div");
  fila.className = `evento-fila evento-fila-${lado}`;

  const grupo = document.createElement("div");
  grupo.className = "evento-grupo";

  const tarjeta = document.createElement("div");
  
  let claseExtra = "";
  if (l.tipo && l.tipo.includes('_favor')) {
    claseExtra = "tipo-evento-favor";
  } else if (l.tipo && l.tipo.includes('_contra')) {
    claseExtra = "tipo-evento-contra";
  }
  tarjeta.className = `evento-tarjeta tipo-${l.tipo} ${claseExtra}`;

  if (l.tipo === "cambio") {
    const filasCambio = l.parejas.map((p) => `
      <div class="linea-cambio">
        <span class="cambio-sale">Sale ${nombreJugador(p.sale)}</span>
        <span class="cambio-separador">·</span>
        <span class="cambio-entra">Entra ${nombreJugador(p.entra)}</span>
      </div>`).join("");
    tarjeta.innerHTML = `
      <span class="evento-icono">${icono}</span>
      <div class="evento-cuerpo">
        <span class="evento-minuto">${minutoTotal}' <strong>${etiqueta}:</strong></span>
        ${filasCambio}
      </div>`;
  } else {
    const textoEvento = lado === "rival"
      ? `${escaparHTML(l.texto)} : <strong>${etiqueta}</strong>`
      : `<strong>${etiqueta}:</strong> ${escaparHTML(l.texto)}`;
    tarjeta.innerHTML = `
      <span class="evento-icono">${icono}</span>
      <span class="evento-minuto">${minutoTotal}'</span>
      <span class="evento-texto">${textoEvento}</span>`;
  }
  grupo.appendChild(tarjeta);
  fila.appendChild(grupo);

  if (l.editable) {
    const grupoId = `grupo-evento-${l.id}`;
    grupo.id = grupoId;
    tarjeta.classList.add("es-pulsable");
    tarjeta.dataset.toggleGrupo = grupoId;

    const menu = document.createElement("div");
    menu.className = "menu-evento-lateral";

    if (l.tipo === "cambio") {
      menu.innerHTML = `
        <button type="button" title="Borrar" class="peligro" 
                data-borrar-bloque="${l.bloqueId}" 
                data-momento="${l.momentoOriginal || ''}">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" fill="transparent"/>
            <path d="M5 7.5H19L18 21H6L5 7.5Z" stroke="#ef4444" stroke-linejoin="round"/>
            <path d="M15.5 9.5L15 19" stroke="#ef4444" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 9.5V19" stroke="#ef4444" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8.5 9.5L9 19" stroke="#ef4444" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 5H19C20.1046 5 21 5.89543 21 7V7.5H3V7C3 5.89543 3.89543 5 5 5H8M16 5L15 3H9L8 5M16 5H8" stroke="#ef4444" stroke-linejoin="round"/>
          </svg>
        </button>
      `;
    } else {
      menu.innerHTML = `
        <button type="button" title="Editar" class="editar" 
                data-editar-evento="${l.id}" data-origen="${l.origen}">
          <svg fill="#eab308" version="1.1" viewBox="0 0 72 72" width="24px" height="24px">
            <path d="M67.982,14.221c-0.148-2.527-1.26-5.003-3.049-6.792l-0.436-0.435c-1.881-1.882-4.354-2.918-6.961-2.918
              c-2.465,0-4.764,0.941-6.475,2.652L10.94,46.85c-3.097,3.096-6.277,15.676-6.883,18.166c-0.165,0.68,0.035,1.395,0.529,1.889
              l0.435,0.434c0.379,0.381,0.89,0.586,1.414,0.586c0.143,0,0.287-0.014,0.43-0.047c2.541-0.559,15.373-3.506,18.484-6.617
              l40.125-40.121C67.25,19.364,68.141,16.907,67.982,14.221z M49.908,18.983c0.195,0.195,0.451,0.293,0.707,0.293
              s0.512-0.098,0.707-0.293l3.016-3.016l1.896,1.895L21.247,52.849l-1.895-1.895l29.076-29.075c0.391-0.391,0.391-1.023,0-1.414
              s-1.023-0.391-1.414,0L17.938,49.54l-2.016-2.017l34.986-34.985l2.016,2.015l-3.016,3.016C49.518,17.96,49.518,18.592,49.908,18.983
              z M24.675,56.277l-2.015-2.015l34.987-34.986l2.016,2.015L24.675,56.277z M10.28,57.71l4.087,4.088
              c-1.894,0.567-3.892,1.106-5.755,1.565C9.105,61.533,9.68,59.57,10.28,57.71z M16.52,61.123l-5.529-5.53
              c0.991-2.821,1.994-5.133,2.777-5.915l0.74-0.74l2.722,2.722c0,0.001,0,0.001,0.001,0.002s0.001,0.001,0.002,0.001l6.028,6.029
              l-0.74,0.74C21.742,59.211,19.393,60.18,16.52,61.123z M62.645,18.31l-1.568,1.568l-6.03-6.03c0,0-0.001-0.001-0.001-0.001
              s-0.001,0-0.002-0.001l-2.721-2.721l1.568-1.568c0.955-0.955,2.25-1.48,3.646-1.48c1.539,0,3.007,0.62,4.133,1.746l0.435,0.435
              c1.107,1.105,1.793,2.636,1.885,4.199C64.079,15.984,63.602,17.353,62.645,18.31z"/>
          </svg>
        </button>
        <button type="button" title="Borrar" class="peligro" 
                data-borrar-evento="${l.id}" data-origen="${l.origen}">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" fill="transparent"/>
            <path d="M5 7.5H19L18 21H6L5 7.5Z" stroke="#ef4444" stroke-linejoin="round"/>
            <path d="M15.5 9.5L15 19" stroke="#ef4444" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 9.5V19" stroke="#ef4444" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8.5 9.5L9 19" stroke="#ef4444" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 5H19C20.1046 5 21 5.89543 21 7V7.5H3V7C3 5.89543 3.89543 5 5 5H8M16 5L15 3H9L8 5M16 5H8" stroke="#ef4444" stroke-linejoin="round"/>
          </svg>
        </button>
      `;
    }

    if (lado === "rival") {
      grupo.insertBefore(menu, tarjeta);
    } else {
      grupo.appendChild(menu);
    }
  }

  return fila;
}

function abrirHistorial() {
  const lineas = construirLineasHistorial();
  const cont = document.getElementById("listaHistorial");
  cont.innerHTML = "";

  if (lineas.length === 0) {
    cont.innerHTML = "<p style='color:var(--texto-secundario)'>Todavía no hay eventos.</p>";
  } else {
    // Determinar si hay eventos en descanso
    const hayDescanso = lineas.some(l => l.parte === 0);
    
    // Mostrar eventos de la primera parte
    const lineasParte1 = lineas.filter((l) => l.parte === 1);
    if (lineasParte1.length > 0) {
      const separador = document.createElement("div");
      separador.className = "separador-parte";
      separador.textContent = "Primera parte";
      cont.appendChild(separador);
      lineasParte1.forEach((l) => cont.appendChild(crearFilaEvento(l)));
    }
    
    // Mostrar eventos de descanso (parte 0)
    if (hayDescanso) {
      const lineasDescanso = lineas.filter((l) => l.parte === 0);
      const separador = document.createElement("div");
      separador.className = "separador-parte";
      separador.textContent = "Descanso";
      cont.appendChild(separador);
      lineasDescanso.forEach((l) => cont.appendChild(crearFilaEvento(l)));
    }
    
    // Mostrar eventos de la segunda parte
    const lineasParte2 = lineas.filter((l) => l.parte === 2);
    if (lineasParte2.length > 0) {
      const separador = document.createElement("div");
      separador.className = "separador-parte";
      separador.textContent = "Segunda parte";
      cont.appendChild(separador);
      lineasParte2.forEach((l) => cont.appendChild(crearFilaEvento(l)));
    }
  }

  document.getElementById("modalHistorial").classList.remove("oculto");
}

// Alterna el menú lateral
if (!window.__historialMenuListenerInstalado) {
  window.__historialMenuListenerInstalado = true;
  document.addEventListener("click", (e) => {
    const tarjeta = e.target.closest(".evento-tarjeta.es-pulsable");
    document.querySelectorAll(".evento-grupo.menu-abierto").forEach((g) => {
      if (!tarjeta || g.id !== tarjeta.dataset.toggleGrupo) g.classList.remove("menu-abierto");
    });
    if (tarjeta) {
      const grupo = document.getElementById(tarjeta.dataset.toggleGrupo);
      if (grupo) grupo.classList.toggle("menu-abierto");
    }
  });
}