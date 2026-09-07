// ============================================
// RENDERIZADO DE UI
// ============================================

import { DOM, ESTADO, ORDEN_POSICIONES, MAPEO_POSICIONES } from './config.js';

export function formatearFecha(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function formatearRangoFechas(inicio, fin) {
    if (!inicio && !fin) return 'Fechas pendientes';
    if (!inicio) return `Hasta ${formatearFecha(fin)}`;
    if (!fin) return `Desde ${formatearFecha(inicio)}`;
    return `${formatearFecha(inicio)} – ${formatearFecha(fin)}`;
}

export function obtenerPosicionJugador(jugador) {
    return jugador.posicion || 'Sin posición';
}

// Normalizar cualquier variante de posición a categoría principal
export function normalizarPosicion(posicion) {
    if (!posicion) return 'Sin posición';
    
    const posClean = posicion.toLowerCase().trim().replace(/\./g, '');
    
    // Buscar coincidencia exacta en el mapa
    if (MAPEO_POSICIONES[posClean]) {
        return MAPEO_POSICIONES[posClean];
    }
    
    // Buscar coincidencia parcial
    for (const [key, value] of Object.entries(MAPEO_POSICIONES)) {
        if (posClean.includes(key) || key.includes(posClean)) {
            return value;
        }
    }
    
    // Si no se encuentra, devolver la posición original capitalizada
    return posicion.charAt(0).toUpperCase() + posicion.slice(1).toLowerCase();
}

export function obtenerOrdenPosicion(posicion) {
    const normalizada = normalizarPosicion(posicion);
    const index = ORDEN_POSICIONES.indexOf(normalizada);
    return index === -1 ? 999 : index;
}

export function mostrarCargando(container) {
    container.innerHTML = `
        <div class="cargando">
            <i class="fas fa-spinner"></i>
            <span>Cargando...</span>
        </div>
    `;
}

export function renderizarHistorial() {
    const container = DOM.listaSemanasContainer;
    container.innerHTML = '';

    if (ESTADO.semanas.length === 0) {
        container.innerHTML = `
            <div class="lista-vacia">
                <i class="fas fa-calendar-plus"></i>
                <p>No hay semanas creadas todavía.</p>
                <p style="font-size:0.85rem; margin-top:4px;">Pulsa "Nueva Semana" para empezar.</p>
            </div>
        `;
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'lista-semanas';

    ESTADO.semanas.forEach(semana => {
        const li = document.createElement('li');

        const info = document.createElement('div');
        info.className = 'semana-info';

        const numSpan = document.createElement('span');
        numSpan.className = 'semana-numero';
        numSpan.textContent = `Semana ${semana.numero_semana}`;

        const fechasSpan = document.createElement('span');
        fechasSpan.className = 'semana-fechas';
        fechasSpan.textContent = formatearRangoFechas(semana.fecha_inicio, semana.fecha_fin);

        const jugadoresSpan = document.createElement('span');
        jugadoresSpan.className = 'semana-jugadores';
        jugadoresSpan.textContent = `${semana.jugadores_count} jugadores`;

        info.appendChild(numSpan);
        info.appendChild(fechasSpan);
        info.appendChild(jugadoresSpan);

        const acciones = document.createElement('div');
        acciones.className = 'semana-acciones';

        const btnAbrir = document.createElement('button');
        btnAbrir.className = 'btn-abrir';
        btnAbrir.innerHTML = '<i class="fas fa-edit"></i> Abrir';
        btnAbrir.dataset.semanaId = semana.id;

        const btnPdf = document.createElement('button');
        btnPdf.className = 'btn-pdf';
        btnPdf.innerHTML = '<i class="fas fa-file-pdf"></i> PDF';
        btnPdf.dataset.semanaId = semana.id;

        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn-eliminar';
        btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
        btnEliminar.dataset.semanaId = semana.id;

        acciones.appendChild(btnAbrir);
        acciones.appendChild(btnPdf);
        acciones.appendChild(btnEliminar);

        li.appendChild(info);
        li.appendChild(acciones);
        ul.appendChild(li);
    });

    container.appendChild(ul);
}

// --- RENDERIZADO DEL EDITOR ---

export function renderizarEditor() {
    if (!ESTADO.semanaActual) return;

    const { semana, jugadores } = ESTADO.semanaActual;
    
    // Actualizar el título de la cabecera
    DOM.headerTitulo.textContent = `Semana ${semana.numero_semana}`;

    // Enriquecer jugadores con datos completos
    const jugadoresCompletos = jugadores.map(j => {
        const jugadorInfo = ESTADO.jugadoresActivos.find(ja => ja.id === j.jugador_id);
        const posicionOriginal = jugadorInfo ? obtenerPosicionJugador(jugadorInfo) : 'Sin posición';
        const posNormalizada = normalizarPosicion(posicionOriginal);
        
        return {
            ...j,
            nombre: jugadorInfo ? jugadorInfo.nombre : 'Jugador eliminado',
            apellidos: jugadorInfo ? jugadorInfo.apellidos : '',
            dorsal: jugadorInfo ? jugadorInfo.dorsal : '?',
            posicion: posicionOriginal,
            posicionNormalizada: posNormalizada,
            posicionMostrar: posNormalizada
        };
    });

    // Ordenar jugadores:
    // 1. Por posición según ORDEN_POSICIONES (Portero, Defensa, Medio, Extremo, Delantero)
    // 2. Dentro de la misma posición, por dorsal
    const jugadoresOrdenados = [...jugadoresCompletos].sort((a, b) => {
        const orderA = obtenerOrdenPosicion(a.posicion);
        const orderB = obtenerOrdenPosicion(b.posicion);
        
        if (orderA !== orderB) return orderA - orderB;
        return a.dorsal - b.dorsal;
    });

    DOM.editorContainer.innerHTML = '';

    // Grid de 3 columnas
    const grid = document.createElement('div');
    grid.className = 'editor-grid';

    jugadoresOrdenados.forEach(j => {
        const card = document.createElement('div');
        card.className = 'card-jugador-editor';

        // Header con dorsal, nombre y posición
        const header = document.createElement('div');
        header.className = 'card-header';

        const dorsalSpan = document.createElement('span');
        dorsalSpan.className = 'dorsal';
        dorsalSpan.textContent = j.dorsal;

        const nombreSpan = document.createElement('span');
        nombreSpan.className = 'nombre';
        nombreSpan.textContent = `${j.nombre} ${j.apellidos || ''}`.trim();

        const posSpan = document.createElement('span');
        posSpan.className = 'posicion-tag';
        const posOriginal = j.posicion !== 'Sin posición' ? j.posicion : '';
        posSpan.textContent = posOriginal ? `${j.posicionNormalizada} (${posOriginal})` : j.posicionNormalizada;

        header.appendChild(dorsalSpan);
        header.appendChild(nombreSpan);
        header.appendChild(posSpan);
        card.appendChild(header);

        // Cuerpo con los 3 campos
        const body = document.createElement('div');
        body.className = 'card-body';

        const campos = [
            { key: 'objetivo_1', label: 'Objetivo técnico 1', placeholder: 'Escribir objetivo...' },
            { key: 'objetivo_2', label: 'Objetivo técnico 2', placeholder: 'Escribir objetivo...' },
            { key: 'objetivo_real', label: 'Objetivo real', placeholder: 'Ej. Mínimo 3 tiros a puerta' }
        ];

        campos.forEach(campo => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'campo-container';

            const label = document.createElement('label');
            label.textContent = campo.label;

            const textarea = document.createElement('textarea');
            textarea.placeholder = campo.placeholder;
            textarea.value = j[campo.key] || '';
            textarea.dataset.jugadorId = j.id;
            textarea.dataset.campo = campo.key;
            textarea.rows = 3;

            fieldDiv.appendChild(label);
            fieldDiv.appendChild(textarea);
            body.appendChild(fieldDiv);
        });

        card.appendChild(body);
        grid.appendChild(card);
    });

    DOM.editorContainer.appendChild(grid);
}