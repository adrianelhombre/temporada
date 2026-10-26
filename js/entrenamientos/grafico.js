// Editor gráfico SVG de los ejercicios.

function normalizarGrafico(grafico) {
  let g = grafico;
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = null; } }
  if (!g || typeof g !== 'object') g = { version: 1, campo: 'entero', elementos: [] };
  return { version: 1, campo: g.campo === 'medio' ? 'medio' : 'entero', elementos: Array.isArray(g.elementos) ? g.elementos.map((e, i) => ({ ...e, id: e.id || `el-${i}-${Math.round((Number(e.x)||0)*10)}` })) : [] };
}
function seleccionarHerramienta(herramienta) {
  herramientaGrafico = herramienta; puntoInicialGrafico = null; puntoPrevisualizacionGrafico = null; creandoZonaGrafico = null; zonaPrevisualizacionGrafico = null;
  document.querySelectorAll('[data-herramienta]').forEach(btn => btn.classList.toggle('activa', btn.dataset.herramienta === herramienta));
  $('estadoHerramienta').textContent = `Herramienta: ${NOMBRES_HERRAMIENTAS[herramienta] || herramienta}`;
  $('graficoCampo').style.cursor = herramienta === 'seleccionar' ? 'grab' : herramienta === 'borrar' ? 'not-allowed' : 'crosshair';
}
function renderizarGraficoCampo() {
  const svg = $('graficoCampo'); if (!svg) return;
  let preview = '';
  if (puntoInicialGrafico && puntoPrevisualizacionGrafico) preview += dibujarElemento({id:'previsualizacion',tipo:herramientaGrafico,x:puntoInicialGrafico.x,y:puntoInicialGrafico.y,puntos:[puntoInicialGrafico,puntoPrevisualizacionGrafico],color:$('graficoColor')?.value || '#facc15',discontinua:$('graficoDiscontinua')?.checked}, false).replace('<g ', '<g opacity=".65" ');
  if (creandoZonaGrafico && zonaPrevisualizacionGrafico) { const a=creandoZonaGrafico, b=zonaPrevisualizacionGrafico; preview += dibujarElemento({id:'zona-preview',tipo:'zona',x:(a.x+b.x)/2,y:(a.y+b.y)/2,w:Math.max(30,Math.abs(b.x-a.x)),h:Math.max(30,Math.abs(b.y-a.y)),color:$('graficoColor')?.value||'#facc15',discontinua:$('graficoDiscontinua')?.checked,etiqueta:'Zona'}, false).replace('<g ', '<g opacity=".65" '); }
  svg.innerHTML = dibujoBaseCampo(graficoActual.campo) + graficoActual.elementos.map(elemento => dibujarElemento(elemento, true)).join('') + preview;
  const selected=graficoActual.elementos.find(e=>String(e.id)===String(elementoGraficoSeleccionado));
  if (selected && ['linea','flecha','zona'].includes(selected.tipo)) {
    let handles='';
    if (selected.tipo==='zona') { const w=Number(selected.w)||150,h=Number(selected.h)||110; handles=`<rect x="${selected.x-w/2-6}" y="${selected.y-h/2-6}" width="${w+12}" height="${h+12}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 4" pointer-events="none"/><circle data-resize-zona="se" cx="${selected.x+w/2}" cy="${selected.y+h/2}" r="10" fill="#fff" stroke="#111827" stroke-width="3"/>`; }
    else { (selected.puntos||[]).slice(0,2).forEach((p,i)=>{ handles+=`<circle data-punto-linea="${i}" cx="${p.x}" cy="${p.y}" r="10" fill="#fff" stroke="#111827" stroke-width="3"/>`; }); }
    svg.insertAdjacentHTML('beforeend', `<g data-elemento-id="${escaparHTML(selected.id)}" class="controles-elemento-seleccionado">${handles}</g>`);
  }
}
function crearSVGGrafico(grafico, sufijo = 'preview') { const g = normalizarGrafico(grafico); return `<svg class="campo-svg-lectura" viewBox="0 0 1000 700" role="img" aria-label="Campo gráfico del ejercicio ${escaparHTML(sufijo)}">${dibujoBaseCampo(g.campo)}${g.elementos.map(e => dibujarElemento(e, false)).join('')}</svg>`; }




function dibujoBaseCampo(tipo) {
  const base = `<rect x="0" y="0" width="1000" height="700" rx="2" fill="#438b42"/>`;

  let franjas = '';
  for (let i = 0; i < 10; i++) {
    franjas += `<rect x="${i * 100}" y="0" width="100" height="700" fill="${i % 2 ? '#438b42' : '#4b9849'}"/>`;
  }

  // MEDIO CAMPO
  if (tipo === 'medio') {
    return `${base}${franjas}
      <g fill="none" stroke="#fff" stroke-width="4">

        <!-- Límites del medio campo -->
        <rect x="12" y="12" width="976" height="676"/>

        <!-- Área grande: más alta -->
        <rect x="225" y="12" width="550" height="230"/>

        <!-- Área pequeña: más alta -->
        <rect x="375" y="12" width="250" height="105"/>

        <!-- Punto de penalti -->
        <circle cx="500" cy="180" r="4" fill="#fff"/>
      </g>

      <!-- Portería -->
      <g fill="none" stroke="#fff" stroke-width="5">
        <path d="M 450 12 L 450 3 L 550 3 L 550 12"/>
      </g>`;
  }

  // CAMPO ENTERO
  return `${base}${franjas}
    <g fill="none" stroke="#fff" stroke-width="4">

      <!-- Límites del terreno -->
      <rect x="12" y="12" width="976" height="676"/>

      <!-- Línea central -->
      <line x1="500" y1="12" x2="500" y2="688"/>

      <!-- Círculo central -->
      <circle cx="500" cy="350" r="82"/>
      <circle cx="500" cy="350" r="4" fill="#fff"/>

      <!-- Área grande izquierda: más alta arriba y abajo -->
      <rect x="12" y="150" width="170" height="400"/>

      <!-- Área pequeña izquierda: más alta arriba y abajo -->
      <rect x="12" y="245" width="70" height="210"/>

      <!-- Área grande derecha: más alta arriba y abajo -->
      <rect x="818" y="150" width="170" height="400"/>

      <!-- Área pequeña derecha: más alta arriba y abajo -->
      <rect x="918" y="245" width="70" height="210"/>

  

    </g>`;
}



function dibujarElemento(e, interactivo) {
  const id = escaparHTML(e.id || ''); const x = clamp(Number(e.x) || 0, 0, 1000); const y = clamp(Number(e.y) || 0, 0, 600); const data = interactivo ? `data-elemento-id="${id}"` : '';
  if (e.tipo === 'jugador') { const equipoB = e.equipo === 'B'; const comodin = e.equipo === 'C'; const fill = comodin ? '#38bdf8' : equipoB ? '#f8fafc' : '#facc15'; const stroke = comodin ? '#075985' : equipoB ? '#1f2937' : '#111827'; return `<g ${data} transform="translate(${x} ${y})" class="${interactivo?'elemento-arrastrable':''}"><circle r="21" fill="${fill}" stroke="${stroke}" stroke-width="3"/><text x="0" y="1" text-anchor="middle" dominant-baseline="middle" font-size="${String(e.etiqueta||'').length>2?12:16}" font-weight="800" fill="#111827" pointer-events="none">${escaparHTML(e.etiqueta || (comodin?'C':equipoB?'B':'A'))}</text></g>`; }
  if (e.tipo === 'cono') return `<g ${data} transform="translate(${x} ${y})" class="${interactivo?'elemento-arrastrable':''}"><path d="M -15 13 L 0 -18 L 15 13 Z" fill="#f97316" stroke="#7c2d12" stroke-width="2"/><ellipse cx="0" cy="13" rx="17" ry="5" fill="#fdba74" stroke="#7c2d12" stroke-width="2"/></g>`;
  if (e.tipo === 'porteria') return `<g ${data} transform="translate(${x} ${y})" class="${interactivo?'elemento-arrastrable':''}" fill="none" stroke="#fff" stroke-width="4"><path d="M-34 18 L-34 -20 Q-34 -25 -29 -25 L29 -25 Q34 -25 34 -20 L34 18" stroke="#111827" stroke-width="8" opacity=".35"/><path d="M-34 18 L-34 -20 Q-34 -25 -29 -25 L29 -25 Q34 -25 34 -20 L34 18"/><path d="M-34 -4 L34 -4 M-34 7 L34 7 M-17 -25 L-17 18 M0 -25 L0 18 M17 -25 L17 18" stroke-width="1.4" opacity=".85"/><path d="M-34 18 L34 18" stroke-width="5"/></g>`;
  if (e.tipo === 'zona') { const w = Number(e.w)||150, h=Number(e.h)||110; return `<g ${data} class="${interactivo?'elemento-arrastrable':''}"><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" fill="${escaparHTML(e.color||'#facc15')}" fill-opacity=".18" stroke="${escaparHTML(e.color||'#facc15')}" stroke-width="3" stroke-dasharray="${e.discontinua === false ? 'none' : '8 5'}"/></g>`; }
  if (e.tipo === 'flecha' || e.tipo === 'linea') { const p = Array.isArray(e.puntos)&&e.puntos.length>=2?e.puntos:[{x,y},{x:Math.min(1000,x+100),y}]; const p1=p[0],p2=p[1]; const color=e.color || (e.equipo==='B'?'#ffffff':'#facc15'); const marcador=e.tipo==='flecha'?`marker-end="url(#flecha-${id})"`:''; return `<g ${data} class="${interactivo?'elemento-arrastrable':''}"><defs><marker id="flecha-${id}" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="${escaparHTML(color)}"/></marker></defs><line x1="${clamp(Number(p1.x)||0,0,1000)}" y1="${clamp(Number(p1.y)||0,0,600)}" x2="${clamp(Number(p2.x)||0,0,1000)}" y2="${clamp(Number(p2.y)||0,0,600)}" stroke="${escaparHTML(color)}" stroke-width="6" stroke-linecap="round" ${e.discontinua ? 'stroke-dasharray="12 9"' : ''} ${marcador}/><line x1="${clamp(Number(p1.x)||0,0,1000)}" y1="${clamp(Number(p1.y)||0,0,600)}" x2="${clamp(Number(p2.x)||0,0,1000)}" y2="${clamp(Number(p2.y)||0,0,600)}" stroke="transparent" stroke-width="22"/></g>`; }
  return '';
}
function actualizarEstiloSeleccionadoEnVivo() {
  const el=graficoActual.elementos.find(e=>String(e.id)===String(elementoGraficoSeleccionado));
  if (!el || !['linea','flecha','zona'].includes(el.tipo)) return;
  el.color=$('graficoColor').value || '#facc21'; el.discontinua=$('graficoDiscontinua').checked;
  renderizarGraficoCampo();
}
function clamp(n,min,max) { return Math.max(min, Math.min(max, n)); }
function coordenadasCampo(evento) { const svg=$('graficoCampo'); const rect=svg.getBoundingClientRect(); return { x: clamp((evento.clientX-rect.left)/rect.width*1000,0,1000), y: clamp((evento.clientY-rect.top)/rect.height*600,0,600) }; }
function manejarPulsacionCampo(evento) {
  const svg=$('graficoCampo'); const grupo=evento.target.closest('[data-elemento-id]');
  if (herramientaGrafico === 'seleccionar' && grupo) {
    const id=grupo.getAttribute('data-elemento-id'); const el=graficoActual.elementos.find(x=>String(x.id)===id); if (!el) return;
    const handlePunto=evento.target.closest('[data-punto-linea]'); const handleZona=evento.target.closest('[data-resize-zona]');
    elementoGraficoSeleccionado=id; cargarControlesElemento(el);
    if (el.tipo==='jugador' && evento.detail>=2) { $('graficoEtiquetaJugador').focus(); $('graficoEtiquetaJugador').select(); return; }
    if (handlePunto) arrastreGrafico={id,modo:'punto',indice:Number(handlePunto.dataset.puntoLinea),pointerId:evento.pointerId};
    else if (handleZona) arrastreGrafico={id,modo:'resize-zona',pointerId:evento.pointerId};
    else arrastreGrafico={ id, modo:'mover', pointerId:evento.pointerId, ultimo:coordenadasCampo(evento) };
    svg.setPointerCapture?.(evento.pointerId); svg.style.cursor='grabbing'; evento.preventDefault(); renderizarGraficoCampo(); return;
  }
  const punto=coordenadasCampo(evento);
  if (herramientaGrafico==='seleccionar') { elementoGraficoSeleccionado=null; actualizarAyudaElemento(); renderizarGraficoCampo(); return; }
  if (herramientaGrafico==='borrar') { if (grupo) { const id=grupo.getAttribute('data-elemento-id'); graficoActual.elementos=graficoActual.elementos.filter(e=>String(e.id)!==id); if(String(elementoGraficoSeleccionado)===String(id)) elementoGraficoSeleccionado=null; renderizarGraficoCampo(); } return; }
  if (herramientaGrafico==='flecha' || herramientaGrafico==='linea') {
    if (!puntoInicialGrafico) { puntoInicialGrafico=punto; puntoPrevisualizacionGrafico=punto; $('estadoHerramienta').textContent=`Herramienta: ${NOMBRES_HERRAMIENTAS[herramientaGrafico]} · marca el punto final`; renderizarGraficoCampo(); return; }
    const nuevo={ id:crearIdGrafico(), tipo:herramientaGrafico, x:puntoInicialGrafico.x, y:puntoInicialGrafico.y, puntos:[puntoInicialGrafico,punto], color:$('graficoColor').value || '#facc15', discontinua:$('graficoDiscontinua').checked };
    graficoActual.elementos.push(nuevo); elementoGraficoSeleccionado=nuevo.id; puntoInicialGrafico=null; puntoPrevisualizacionGrafico=null; cargarControlesElemento(nuevo); seleccionarHerramienta('seleccionar'); renderizarGraficoCampo(); $('estadoHerramienta').textContent='Elemento creado. Arrastra sus extremos para ajustar la línea.'; return;
  }
  if (herramientaGrafico==='zona') { creandoZonaGrafico=punto; zonaPrevisualizacionGrafico=punto; svg.setPointerCapture?.(evento.pointerId); evento.preventDefault(); return; }
  if (herramientaGrafico==='jugadorA' || herramientaGrafico==='jugadorB' || herramientaGrafico==='comodin') {
    const equipo=herramientaGrafico==='jugadorA'?'A':herramientaGrafico==='jugadorB'?'B':'C'; const numeros=graficoActual.elementos.filter(e=>e.tipo==='jugador'&&e.equipo===equipo).map(e=>parseInt(e.etiqueta,10)).filter(Number.isFinite); const etiqueta=equipo==='C' ? 'C' : String((numeros.length?Math.max(...numeros):0)+1);
    graficoActual.elementos.push({id:crearIdGrafico(),tipo:'jugador',equipo,x:punto.x,y:punto.y,etiqueta});
  } else if (herramientaGrafico==='cono') graficoActual.elementos.push({id:crearIdGrafico(),tipo:'cono',x:punto.x,y:punto.y});
  else if (herramientaGrafico==='porteria') graficoActual.elementos.push({id:crearIdGrafico(),tipo:'porteria',x:punto.x,y:punto.y});
  renderizarGraficoCampo();
}
function finalizarCreacionZona(evento) {
  if (!creandoZonaGrafico) return; const fin=coordenadasCampo(evento); const inicio=creandoZonaGrafico; const w=Math.max(30,Math.abs(fin.x-inicio.x)), h=Math.max(30,Math.abs(fin.y-inicio.y));
  const nueva={id:crearIdGrafico(),tipo:'zona',x:(inicio.x+fin.x)/2,y:(inicio.y+fin.y)/2,w:clamp(w,30,950),h:clamp(h,30,550),etiqueta:'',color:$('graficoColor')?.value||'#facc21',discontinua:$('graficoDiscontinua')?.checked};
  graficoActual.elementos.push(nueva); elementoGraficoSeleccionado=nueva.id; creandoZonaGrafico=null; zonaPrevisualizacionGrafico=null; cargarControlesElemento(nueva); seleccionarHerramienta('seleccionar'); renderizarGraficoCampo(); $('estadoHerramienta').textContent='Zona creada. Arrastra la esquina para cambiar su tamaño.';
}
function cargarControlesElemento(el) {
  if (el.color) $('graficoColor').value=el.color;
  $('graficoDiscontinua').checked=!!el.discontinua;
  const esJugador = el.tipo === 'jugador';
  $('graficoEtiquetaJugador').classList.toggle('oculto', !esJugador); $('graficoEtiquetaJugadorLabel').classList.toggle('oculto', !esJugador);
  if (esJugador) $('graficoEtiquetaJugador').value = el.etiqueta || '';
  actualizarAyudaElemento(el);
}
function actualizarEtiquetaJugadorSeleccionado() {
  const el = graficoActual.elementos.find(e => String(e.id) === String(elementoGraficoSeleccionado));
  if (!el || el.tipo !== 'jugador') return;
  el.etiqueta = $('graficoEtiquetaJugador').value.trim().slice(0,3);
  renderizarGraficoCampo();
}
function actualizarAyudaElemento(el) {
  el=el||graficoActual.elementos.find(e=>String(e.id)===String(elementoGraficoSeleccionado));
  const ayuda=$('ayudaElementoSeleccionado'); if (!ayuda) return;
  const esJugador = el?.tipo === 'jugador';
  $('graficoEtiquetaJugador').classList.toggle('oculto', !esJugador); $('graficoEtiquetaJugadorLabel').classList.toggle('oculto', !esJugador);
  ayuda.textContent=!el?'Selecciona una línea, flecha o zona para editarla. Para cambiar el número, selecciona un jugador.':el.tipo==='jugador'?'Jugador seleccionado: cambia su número o etiqueta en el campo de texto.':el.tipo==='zona'?'Zona seleccionada: arrastra la esquina para cambiar el tamaño; color y estilo se actualizan automáticamente.':(['linea','flecha'].includes(el.tipo)?`${el.tipo==='flecha'?'Flecha':'Línea'} seleccionada: arrastra los extremos para editar su recorrido; color y estilo se actualizan automáticamente.`:'Elemento seleccionado.');
}
function moverElementoGrafico(evento) {
  if (!arrastreGrafico) return; const punto=coordenadasCampo(evento); const el=graficoActual.elementos.find(x=>String(x.id)===arrastreGrafico.id); if (!el) return;
  if (arrastreGrafico.modo==='punto' && (el.tipo==='flecha'||el.tipo==='linea')) { el.puntos[arrastreGrafico.indice]={x:punto.x,y:punto.y}; el.x=el.puntos[0].x; el.y=el.puntos[0].y; }
  else if (arrastreGrafico.modo==='resize-zona' && el.tipo==='zona') { el.w=clamp(Math.abs(punto.x-el.x)*2,30,950); el.h=clamp(Math.abs(punto.y-el.y)*2,30,550);  }
  else { const anterior=arrastreGrafico.ultimo||punto; const dx=punto.x-anterior.x,dy=punto.y-anterior.y; el.x=clamp((Number(el.x)||0)+dx,0,1000); el.y=clamp((Number(el.y)||0)+dy,0,600); if (el.tipo==='flecha'||el.tipo==='linea') el.puntos=(el.puntos||[]).map(p=>({x:clamp(Number(p.x)+dx,0,1000),y:clamp(Number(p.y)+dy,0,600)})); arrastreGrafico.ultimo=punto; }
  arrastreGrafico.moved=true; renderizarGraficoCampo();
}
function terminarArrastreGrafico() { if (arrastreGrafico) { arrastreGrafico=null; $('graficoCampo').style.cursor=herramientaGrafico==='seleccionar'?'grab':'crosshair'; } }
function crearIdGrafico() { return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }
