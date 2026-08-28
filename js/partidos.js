let partidoPendienteEliminar = null;
let partidoAcciones = null;
let partidoEnEdicion = null;
let jugadores = [];
let convocados = new Set();
let convocadosEditando = new Set();

function pintarMensajeVacio(contenedor, texto) {
  const mensaje = document.createElement("p");
  mensaje.style.color = "var(--texto-secundario)";
  mensaje.textContent = texto;
  contenedor.appendChild(mensaje);
}

function crearFilaPartido(partido, marcador, finalizado) {
  const fila = document.createElement("div");
  fila.className = "item";

  const jornadaDatos = document.createElement("div")
  jornadaDatos.classList.add("jornada-datos")

  // Jornada en grande a la izquierda
  const jornadaDiv = document.createElement("div");
  jornadaDiv.classList = "jornada-div"
  const jornadaDivH3 = document.createElement("h3");
  jornadaDivH3.classList = "jornada-div-h3"
  jornadaDivH3.textContent = partido.jornada || '—';

  jornadaDiv.append(jornadaDivH3)

  const datos = document.createElement("div");
  
  // Contenedor para el nombre del rival + indicador (L/V)
  const headerRival = document.createElement("div");
  headerRival.style.cssText = "display:flex; align-items:center; gap:10px;";
  
  const rival = document.createElement("h3");
  rival.textContent = partido.rival;
  rival.classList.add("rival-partidos");
  rival.style.cssText = "margin:0;";
  
  // Indicador de local/visitante (estilo neutro, sin verde/rojo)
  const indicador = document.createElement("span");
  indicador.classList.add("rival-partidos-campo")
  indicador.textContent = partido.condicion === 'local' ? '(L)' : '(V)';
  
  headerRival.appendChild(rival);
  headerRival.appendChild(indicador);
  
  const detalle = document.createElement("div");
  detalle.style.cssText = "font-size:.8rem;color:var(--texto-secundario);";
  
  const tipo = partido.tipo_partido || 'Liga';
  detalle.textContent = `${tipo} · ${formatoFecha(partido.fecha)}`;
  
  datos.append(headerRival, detalle);

  jornadaDatos.append(jornadaDiv, datos)

  const resultadoPartido = document.createElement("div")
  resultadoPartido.classList.add("resultado-partido")
  if (finalizado) {
      const resultado = document.createElement("span");
      resultado.className = "estado-finalizado";
      resultado.textContent = `${marcador.propios} - ${marcador.rival}`;
      resultadoPartido.appendChild(resultado);
    }

  const acciones = document.createElement("div");
  acciones.classList.add("acciones-partidos")
  
  // Determinar el texto y la clase del botón
  let textoBoton = "Iniciar";
  let claseBoton = "primario";
  
  if (finalizado) {
    textoBoton = "Ver";
    claseBoton = "primario";
  } else if (partido.estado === "en_juego") {
    textoBoton = "Entrar";
    claseBoton = "primario en-juego"; // Clase adicional para partidos en juego
  } else {
    textoBoton = "Iniciar";
    claseBoton = "primario";
  }

  const abrir = document.createElement("button");
  abrir.className = claseBoton;
  abrir.type = "button";
  abrir.textContent = textoBoton;
  abrir.addEventListener("click", () => { location.href = `partido.html?id=${partido.id}`; });

  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = "pequeno-accion";
  menu.setAttribute("aria-label", `Más acciones para el partido contra ${partido.rival}`);
  menu.setAttribute("aria-haspopup", "dialog");
  menu.textContent = "⋯";
  menu.addEventListener("click", () => abrirAcciones(partido));
  acciones.append(abrir, menu);
  
  // Orden: jornada | datos | resultado | acciones
  fila.append(jornadaDatos, resultadoPartido, acciones);
  return fila;
}

function abrirConfirmacionEliminar(partido) {
  partidoPendienteEliminar = partido;
  document.getElementById("textoEliminarPartido").textContent =
    `Vas a eliminar el partido contra ${partido.rival} y todos sus eventos. Esta acción no se puede deshacer.`;
  document.getElementById("modalEliminarPartido").classList.remove("oculto");
}

function abrirAcciones(partido) {
  partidoAcciones = partido;
  document.getElementById("tituloAccionesPartido").textContent = `¿Que quieres hacer con el partido vs ${partido.rival}?`;
  document.getElementById("modalAccionesPartido").classList.remove("oculto");
}

function cerrarAcciones() {
  partidoAcciones = null;
  document.getElementById("modalAccionesPartido").classList.add("oculto");
}

function cerrarConfirmacionEliminar() {
  partidoPendienteEliminar = null;
  document.getElementById("modalEliminarPartido").classList.add("oculto");
}

// ===== JORNADA =====
function generarOpcionesJornada(tipo) {
  const select = document.getElementById('jornadaPartido');
  select.innerHTML = '';
  
  let opciones = [];
  
  switch(tipo) {
    case 'Liga':
      // J1 a J30
      for (let i = 1; i <= 30; i++) {
        opciones.push({ value: `J${i}`, label: `J${i}` });
      }
      break;
    case 'Amistoso':
      opciones.push({ value: 'A', label: 'A' });
      break;
    case 'Copa':
      opciones.push(
        { value: 'J1', label: 'J1' },
        { value: 'J2', label: 'J2' },
        { value: 'J3', label: 'J3' },
        { value: 'QF', label: 'QF' },
        { value: 'SF', label: 'SF' },
        { value: 'FN', label: 'FN' }
      );
      break;
    case 'Torneo':
      opciones.push({ value: 'T', label: 'T' });
      break;
    default:
      opciones.push({ value: 'A', label: 'A' });
  }
  
  opciones.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
}

// ===== CONVOCATORIA =====
async function cargarJugadoresParaConvocatoria() {
  try {
    const { data, error } = await supabaseClient
      .from("jugadores")
      .select("*")
      .order("dorsal");

    if (error) throw error;
    jugadores = data || [];
  } catch (error) {
    console.error('Error cargando jugadores:', error);
    notificarError(error, "No se pudieron cargar los jugadores.");
  }
}

function renderizarConvocatoria(contenedor, convocadosSet, modoEdicion = false) {
  if (!contenedor) return;
  contenedor.innerHTML = '';

  jugadores.forEach(j => {
    const estaConvocado = convocadosSet.has(j.id);
    
    const div = document.createElement('div');
    div.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 4px;
      cursor: pointer;
      position: relative;
      width: 55px;
      transition: transform 0.15s;
    `;
    div.title = `${j.nombre} (Dorsal ${j.dorsal}) - ${estaConvocado ? 'Convocado' : 'Desconvocado'}`;
    
    // Círculo del jugador - Fondo AMARILLO
    const circulo = document.createElement('div');
    circulo.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #FFC107;
      color: #333;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1rem;
      position: relative;
      border: 2px solid ${estaConvocado ? '#4CAF50' : '#F44336'};
      transition: border-color 0.2s;
    `;
    circulo.textContent = j.dorsal;
    
    // Indicador de convocatoria (esquina superior derecha)
    const indicador = document.createElement('div');
    indicador.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      font-weight: bold;
      border: 2px solid white;
      background: ${estaConvocado ? '#4CAF50' : '#F44336'};
      color: white;
      transition: all 0.2s;
    `;
    indicador.textContent = estaConvocado ? '✓' : '✕';
    
    circulo.appendChild(indicador);
    div.appendChild(circulo);
    
    // Nombre del jugador
    const nombre = document.createElement('span');
    nombre.style.cssText = `
      font-size: 0.6rem;
      text-align: center;
      font-weight: bold;
      color: var(--texto-primario);
      max-width: 55px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    nombre.textContent = j.nombre;
    div.appendChild(nombre);
    
    div.addEventListener('click', () => {
      if (convocadosSet.has(j.id)) {
        convocadosSet.delete(j.id);
      } else {
        convocadosSet.add(j.id);
      }
      renderizarConvocatoria(contenedor, convocadosSet, modoEdicion);
      actualizarContadorConvocados(convocadosSet);
    });
    
    contenedor.appendChild(div);
  });

  actualizarContadorConvocados(convocadosSet);
}

function actualizarContadorConvocados(convocadosSet) {
  const contador = document.getElementById('contadorConvocados');
  if (contador) {
    contador.textContent = `${convocadosSet.size} / ${jugadores.length}`;
  }
}

// ===== FORMULARIO EN MODAL =====
function abrirModalFormulario() {
  document.getElementById("modalFormularioPartido").classList.remove("oculto");
}

function cerrarModalFormulario() {
  document.getElementById("modalFormularioPartido").classList.add("oculto");
  partidoEnEdicion = null;
  document.getElementById("formularioPartido").reset();
}

function abrirFormularioEdicion(partido) {
  partidoEnEdicion = partido;
  const soloMetadatos = partido.estado !== "pendiente";
  
  document.getElementById("tituloFormularioPartido").textContent = "Editar partido";
  document.getElementById("botonCrearPartido").textContent = "Guardar cambios";
  
  document.getElementById("tipoPartido").value = partido.tipo_partido || 'Liga';
  document.getElementById("fechaPartido").value = partido.fecha;
  document.getElementById("rivalPartido").value = partido.rival;
  document.getElementById("condicionPartido").value = partido.condicion;
  document.getElementById("duracionPartido").value = partido.duracion_parte_minutos || 35;
  document.getElementById("formacionPartido").value = partido.formacion || "4-3-3";
  
  // Generar opciones de jornada según el tipo y seleccionar la guardada
  generarOpcionesJornada(partido.tipo_partido || 'Liga');
  document.getElementById("jornadaPartido").value = partido.jornada || '';
  
  convocadosEditando = new Set(partido.convocados || []);
  
  const contenedor = document.getElementById('listaConvocados');
  renderizarConvocatoria(contenedor, convocadosEditando, true);
  
  document.getElementById("duracionPartido").disabled = soloMetadatos;
  document.getElementById("formacionPartido").disabled = soloMetadatos;
  
  const convocadosContainer = document.getElementById('listaConvocados');
  if (soloMetadatos) {
    convocadosContainer.style.opacity = '0.5';
    convocadosContainer.style.pointerEvents = 'none';
  } else {
    convocadosContainer.style.opacity = '1';
    convocadosContainer.style.pointerEvents = 'auto';
  }
  
  const aviso = document.getElementById("avisoEdicionPartido");
  aviso.textContent = soloMetadatos ? "En partidos iniciados o finalizados solo pueden modificarse fecha, rival y condición para preservar el acta." : "";
  aviso.classList.toggle("oculto", !soloMetadatos);
  
  abrirModalFormulario();
  document.getElementById("rivalPartido").focus();
}

function prepararNuevoPartido() {
  partidoEnEdicion = null;
  
  document.getElementById("tituloFormularioPartido").textContent = "Nuevo partido";
  document.getElementById("botonCrearPartido").textContent = "Crear";
  document.getElementById("avisoEdicionPartido").classList.add("oculto");
  document.getElementById("duracionPartido").disabled = false;
  document.getElementById("formacionPartido").disabled = false;
  
  convocados = new Set();
  jugadores.forEach(j => convocados.add(j.id));
  
  const contenedor = document.getElementById('listaConvocados');
  contenedor.style.opacity = '1';
  contenedor.style.pointerEvents = 'auto';
  renderizarConvocatoria(contenedor, convocados, false);
  
  const formulario = document.getElementById("formularioPartido");
  formulario.reset();
  document.getElementById("fechaPartido").value = new Date().toISOString().slice(0, 10);
  document.getElementById("tipoPartido").value = 'Liga';
  document.getElementById("duracionPartido").value = '35'; // Select con valor 35
  
  // Generar jornada inicial
  generarOpcionesJornada('Liga');
  
  abrirModalFormulario();
}

// ===== ELIMINAR =====
async function eliminarPartido() {
  if (!partidoPendienteEliminar) return;
  const boton = document.getElementById("botonConfirmarEliminar");
  boton.disabled = true;
  
  const id = partidoPendienteEliminar.id;
  await supabaseClient.from("eventos_partido").delete().eq("partido_id", id);
  await supabaseClient.from("eventos_rival").delete().eq("partido_id", id);
  
  const { error } = await supabaseClient.from("partidos").delete().eq("id", id);
  boton.disabled = false;
  
  if (error) {
    notificarError(error, "No se pudo eliminar el partido.");
    return;
  }
  cerrarConfirmacionEliminar();
  mostrarNotificacion("Partido eliminado correctamente.", "exito");
  await cargarPartidos();
}

// ===== FILTROS =====
let filtroActual = 'todos';

function aplicarFiltro(tipo) {
  filtroActual = tipo;
  
  // Actualizar botones usando clases btn-equipo y activo
  document.querySelectorAll('.btn-equipo').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.tipo === tipo);
  });
  
  // Recargar partidos con filtro
  cargarPartidos();
}

// ===== CARGAR PARTIDOS CON FILTRO =====
async function cargarPartidos() {
  let query = supabaseClient
    .from("partidos")
    .select("id, fecha, rival, condicion, duracion_parte_minutos, formacion, estado, estado_directo, tipo_partido, jornada, convocados")
    .order("fecha", { ascending: true });
  
  // Aplicar filtro si no es 'todos'
  if (filtroActual !== 'todos') {
    query = query.eq("tipo_partido", filtroActual);
  }
  
  const { data: partidos, error: errorPartidos } = await query;
    
  if (errorPartidos) {
    notificarError(errorPartidos, "No se pudieron cargar los partidos.");
    return;
  }

  const ids = (partidos || []).map((partido) => partido.id);
  const marcadores = new Map(ids.map((id) => [id, { propios: 0, rival: 0 }]));
  
  if (ids.length) {
    const [propios, rivales] = await Promise.all([
      supabaseClient.from("eventos_partido").select("partido_id").in("partido_id", ids).eq("tipo", "gol"),
      supabaseClient.from("eventos_rival").select("partido_id").in("partido_id", ids).eq("tipo", "gol"),
    ]);
    if (propios.error || rivales.error) {
      notificarError(propios.error || rivales.error, "No se pudieron calcular los marcadores.");
    } else {
      (propios.data || []).forEach((evento) => marcadores.get(evento.partido_id).propios++);
      (rivales.data || []).forEach((evento) => marcadores.get(evento.partido_id).rival++);
    }
  }

  const pendientes = (partidos || []).filter((p) => p.estado !== "finalizado");
  const jugados = (partidos || []).filter((p) => p.estado === "finalizado");
  const listaPendientes = document.getElementById("listaPendientes");
  const listaJugados = document.getElementById("listaJugados");
  
  listaPendientes.replaceChildren();
  listaJugados.replaceChildren();
  
  if (!pendientes.length) pintarMensajeVacio(listaPendientes, "No hay partidos pendientes.");
  if (!jugados.length) pintarMensajeVacio(listaJugados, "Todavía no hay partidos jugados.");
  
  pendientes.forEach((partido) => listaPendientes.appendChild(crearFilaPartido(partido, marcadores.get(partido.id), false)));
  jugados.forEach((partido) => listaJugados.appendChild(crearFilaPartido(partido, marcadores.get(partido.id), true)));
}

// ===== INICIO =====
(async () => {
  if (!await exigirSesion()) return;
  
  await cargarJugadoresParaConvocatoria();
  jugadores.forEach(j => convocados.add(j.id));
  
  // Cargar partidos con filtro inicial (todos)
  await cargarPartidos();

  const formulario = document.getElementById("formularioPartido");
  const contenedorConvocados = document.getElementById('listaConvocados');
  
  renderizarConvocatoria(contenedorConvocados, convocados, false);
  
  // ===== EVENTO: Cambio de tipo de partido =====
  document.getElementById("tipoPartido").addEventListener("change", function() {
    generarOpcionesJornada(this.value);
  });
  
  // ===== EVENTOS DE FILTROS =====
  document.querySelectorAll('.btn-equipo').forEach(btn => {
    btn.addEventListener('click', () => {
      aplicarFiltro(btn.dataset.tipo);
    });
  });
  
  // Botones de la modal
  document.getElementById("botonNuevoPartido").addEventListener("click", prepararNuevoPartido);
  document.getElementById("botonCancelarPartido").addEventListener("click", cerrarModalFormulario);
  document.getElementById("botonCerrarModalPartido").addEventListener("click", cerrarModalFormulario);
  
  // Cerrar modal al hacer clic fuera
  document.getElementById("modalFormularioPartido").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      cerrarModalFormulario();
    }
  });
  
  document.getElementById("botonCancelarEliminar").addEventListener("click", cerrarConfirmacionEliminar);
  document.getElementById("botonConfirmarEliminar").addEventListener("click", eliminarPartido);
  document.getElementById("botonCerrarAcciones").addEventListener("click", cerrarAcciones);
  
  document.getElementById("botonEditarPartido").addEventListener("click", () => {
    if (!partidoAcciones) return;
    const partido = partidoAcciones;
    cerrarAcciones();
    abrirFormularioEdicion(partido);
  });
  
  document.getElementById("botonEliminarDesdeMenu").addEventListener("click", () => {
    if (!partidoAcciones) return;
    const partido = partidoAcciones;
    cerrarAcciones();
    abrirConfirmacionEliminar(partido);
  });

  // SUBMIT del formulario
  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    
    const rival = document.getElementById("rivalPartido").value.trim();
    const duracion = Number.parseInt(document.getElementById("duracionPartido").value, 10);
    const tipoPartido = document.getElementById("tipoPartido").value;
    const jornada = document.getElementById("jornadaPartido").value;
    const convocadosSet = partidoEnEdicion ? convocadosEditando : convocados;
    
    if (!document.getElementById("fechaPartido").value || !rival || !Number.isInteger(duracion) || duracion < 5 || duracion > 120) {
      mostrarNotificacion("Completa los datos del partido con una duración entre 5 y 120 minutos.", "error");
      return;
    }
    
    if (convocadosSet.size < 5) {
      mostrarNotificacion("Debes convocar al menos 5 jugadores.", "error");
      return;
    }
    
    const boton = document.getElementById("botonCrearPartido");
    boton.disabled = true;
    
    const registro = {
      fecha: document.getElementById("fechaPartido").value,
      rival: rival,
      condicion: document.getElementById("condicionPartido").value,
      duracion_parte_minutos: duracion,
      formacion: document.getElementById("formacionPartido").value,
      tipo_partido: tipoPartido,
      jornada: jornada,
      convocados: Array.from(convocadosSet),
    };
    
    let data;
    let error;
    
    if (partidoEnEdicion) {
      const campos = partidoEnEdicion.estado === "pendiente"
        ? registro
        : { 
            fecha: registro.fecha, 
            rival: registro.rival, 
            condicion: registro.condicion,
            tipo_partido: registro.tipo_partido,
            jornada: registro.jornada
          };
      ({ error } = await supabaseClient.from("partidos").update(campos).eq("id", partidoEnEdicion.id));
    } else {
      ({ data, error } = await supabaseClient
        .from("partidos")
        .insert({ ...registro, estado: "pendiente", estado_directo: {} })
        .select("id")
        .single());
    }
    
    boton.disabled = false;
    
    if (error) {
      notificarError(error, partidoEnEdicion ? "No se pudo editar el partido." : "No se pudo crear el partido.");
      return;
    }
    
    if (partidoEnEdicion) {
      cerrarModalFormulario();
      partidoEnEdicion = null;
      mostrarNotificacion("Partido actualizado correctamente.", "exito");
      await cargarPartidos();
    } else {
      location.href = `partido.html?id=${data.id}`;
    }
  });
})();