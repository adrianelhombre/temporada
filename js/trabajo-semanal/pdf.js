// ============================================
// GENERACIÓN DE PDF
// ============================================

import { ESTADO, ORDEN_POSICIONES } from './config.js';
import { 
    formatearRangoFechas, 
    obtenerPosicionJugador, 
    normalizarPosicion, 
    obtenerOrdenPosicion 
} from './render.js';
import { fetchSemanaConJugadores, mostrarNotificacion } from './db.js';

export async function generarPdf(semanaId) {
    mostrarNotificacion('Generando PDF...', 'exito');

    const data = await fetchSemanaConJugadores(semanaId);
    if (!data) {
        mostrarNotificacion('Error al cargar la semana para el PDF.', 'error');
        return;
    }

    // Enriquecer jugadores con datos completos
    const jugadoresCompletos = data.jugadores.map(j => {
        const jugadorInfo = ESTADO.jugadoresActivos.find(ja => ja.id === j.jugador_id);
        const posicionOriginal = jugadorInfo ? obtenerPosicionJugador(jugadorInfo) : 'Sin posición';
        return {
            ...j,
            nombre: jugadorInfo ? jugadorInfo.nombre : 'Jugador eliminado',
            apellidos: jugadorInfo ? jugadorInfo.apellidos : '',
            dorsal: jugadorInfo ? jugadorInfo.dorsal : '?',
            posicion: posicionOriginal,
            posicionNormalizada: normalizarPosicion(posicionOriginal)
        };
    });

    // Ordenar por posición (Portero → Defensa → Medio → Extremo → Delantero) y luego por dorsal
    const jugadoresOrdenados = [...jugadoresCompletos].sort((a, b) => {
        const orderA = obtenerOrdenPosicion(a.posicion);
        const orderB = obtenerOrdenPosicion(b.posicion);
        if (orderA !== orderB) return orderA - orderB;
        return a.dorsal - b.dorsal;
    });

    // Construir el HTML para el PDF
    const pdfContent = document.createElement('div');
    pdfContent.style.cssText = `
        padding: 5px 10px;
        font-family: Arial, Helvetica, sans-serif;
        color: #111;
        max-width: 100%;
        background: white;
    `;

    // TÍTULO CON FECHAS EN LA MISMA LÍNEA
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 18px;
        font-weight: 700;
        text-transform: uppercase;
        text-align: center;
        padding-bottom: 4px;
        margin-bottom: 6px;
        letter-spacing: 0.5px;
    `;

    let tituloTexto = `TRABAJO SEMANAL INDIVIDUAL - SEMANA ${data.semana.numero_semana}`;

    if (data.semana.fecha_inicio || data.semana.fecha_fin) {
        const rangoFechas = formatearRangoFechas(data.semana.fecha_inicio, data.semana.fecha_fin);
        tituloTexto += `  (${rangoFechas})`;
    }

    title.textContent = tituloTexto;
    pdfContent.appendChild(title);

    // GRID DE 3 COLUMNAS
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        margin-top: 4px;
    `;

    jugadoresOrdenados.forEach(j => {
        const card = document.createElement('div');
        card.style.cssText = `
            border: 0.2px solid #bbbbbb;
            background: white;
            display: flex;
            flex-direction: column;
            min-height: 145px;
            max-height: 145px;
            height: 145px;
            page-break-inside: avoid;
            overflow: hidden;
        `;

        const nombre = document.createElement('div');
        nombre.style.cssText = `
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            padding: 3px 8px;
            margin: 0 0 4px 0;
            color: #000;
            background-color: #ffd500;
            padding-bottom: 3px;
            flex-shrink: 0;
        `;
        const nombreCompleto = `${j.nombre} ${j.apellidos || ''}`.trim();
        nombre.textContent = `${j.dorsal} · ${nombreCompleto}`;
        card.appendChild(nombre);

        const objetivosContainer = document.createElement('div');
        objetivosContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
        `;

        // OBJETIVO 1
        const obj1Wrapper = document.createElement('div');
        obj1Wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
        `;
        const obj1Contenido = document.createElement('div');
        obj1Contenido.style.cssText = `
            font-size: 11.5px;
            color: #333;
            line-height: 1.3;
            padding: 0 8px 2px 8px;
            justify-content: center;
            align-content: center;
            text-align: justify;
            flex: 1;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
        `;
        if (j.objetivo_1 && j.objetivo_1.trim()) {
            obj1Contenido.textContent = j.objetivo_1.trim();
        } else {
            obj1Contenido.innerHTML = '&nbsp;';
            obj1Contenido.style.color = '#f0f0f0';
        }
        obj1Wrapper.appendChild(obj1Contenido);
        objetivosContainer.appendChild(obj1Wrapper);

        const sep1 = document.createElement('div');
        sep1.style.cssText = `
            border-top: 1px dashed #ccc;
            margin: 1px 0 1px 0;
            flex-shrink: 0;
        `;
        objetivosContainer.appendChild(sep1);

        // OBJETIVO 2
        const obj2Wrapper = document.createElement('div');
        obj2Wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
        `;
        const obj2Contenido = document.createElement('div');
        obj2Contenido.style.cssText = `
            font-size: 11.5px;
            color: #333;
            line-height: 1.3;
            padding: 2px 8px;
            justify-content: center;
            align-content: center;
            text-align: justify;
            flex: 1;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
        `;
        if (j.objetivo_2 && j.objetivo_2.trim()) {
            obj2Contenido.textContent = j.objetivo_2.trim();
        } else {
            obj2Contenido.innerHTML = '&nbsp;';
            obj2Contenido.style.color = '#f0f0f0';
        }
        obj2Wrapper.appendChild(obj2Contenido);
        objetivosContainer.appendChild(obj2Wrapper);

        const sep2 = document.createElement('div');
        sep2.style.cssText = `
            border-top: 1px dashed #999;
            margin: 1px 0 1px 0;
            flex-shrink: 0;
        `;
        objetivosContainer.appendChild(sep2);

        // OBJETIVO REAL
        const objRealWrapper = document.createElement('div');
        objRealWrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            flex: 0.5;
            min-height: 0;
        `;
        const objRealContenido = document.createElement('div');
        objRealContenido.style.cssText = `
            font-size: 11px;
            font-weight: 700;
            color: #000;
            line-height: 1.3;
            padding: 1px 8px 0 8px;
            flex: 1;
            justify-content: center;
            align-content: center;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
        `;
        if (j.objetivo_real && j.objetivo_real.trim()) {
            objRealContenido.textContent = j.objetivo_real.trim();
        } else {
            objRealContenido.innerHTML = '&nbsp;';
            objRealContenido.style.color = '#f0f0f0';
        }
        objRealWrapper.appendChild(objRealContenido);
        objetivosContainer.appendChild(objRealWrapper);

        card.appendChild(objetivosContainer);
        grid.appendChild(card);
    });

    pdfContent.appendChild(grid);

    try {
        const opt = {
            margin: [8, 8, 8, 8],
            filename: `Trabajo_Individual_Semana_${data.semana.numero_semana}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy']
            }
        };

        await html2pdf().set(opt).from(pdfContent).save();
        mostrarNotificacion('PDF descargado correctamente.');
    } catch (e) {
        console.error('Error generando PDF:', e);
        mostrarNotificacion('Error al generar el PDF.', 'error');
    }
}