// ============================================
// OPERACIONES CON SUPABASE
// ============================================

import { ESTADO } from './config.js';

let timeoutNotificacion = null;

export function mostrarNotificacion(mensaje, tipo = 'exito') {
    const el = document.getElementById('notificacion');
    const msg = document.getElementById('notificacion-mensaje');
    if (timeoutNotificacion) clearTimeout(timeoutNotificacion);
    msg.textContent = mensaje;
    el.className = `notificacion ${tipo}`;
    el.classList.remove('oculto');
    timeoutNotificacion = setTimeout(() => {
        el.classList.add('oculto');
    }, 3000);
}

export async function getTemporadaActiva() {
    if (ESTADO.temporadaActivaId) return ESTADO.temporadaActivaId;

    try {
        const { data, error } = await supabaseClient
            .from('temporadas')
            .select('id')
            .eq('activa', true)
            .limit(1)
            .single();

        if (error || !data) {
            const { data: all, error: err2 } = await supabaseClient
                .from('temporadas')
                .select('id')
                .limit(1)
                .single();

            if (err2 || !all) {
                mostrarNotificacion('No hay temporadas configuradas.', 'error');
                return null;
            }
            ESTADO.temporadaActivaId = all.id;
            return ESTADO.temporadaActivaId;
        }

        ESTADO.temporadaActivaId = data.id;
        return ESTADO.temporadaActivaId;
    } catch (e) {
        console.error('Error obteniendo temporada activa:', e);
        return null;
    }
}

export async function fetchJugadoresActivos() {
    try {
        const { data, error } = await supabaseClient
            .from('jugadores')
            .select('*')
            .eq('activo', true)
            .order('dorsal', { ascending: true });

        if (error) {
            console.error('Error obteniendo jugadores:', error);
            mostrarNotificacion('Error al cargar los jugadores.', 'error');
            return [];
        }
        return data || [];
    } catch (e) {
        console.error('Error en fetchJugadoresActivos:', e);
        return [];
    }
}

export async function fetchSemanas() {
    const temporadaId = await getTemporadaActiva();
    if (!temporadaId) return [];

    try {
        const { data, error } = await supabaseClient
            .from('trabajo_semanas')
            .select(`
                *,
                trabajo_semanal_jugadores ( jugador_id )
            `)
            .eq('temporada_id', temporadaId)
            .order('numero_semana', { ascending: true });

        if (error) {
            console.error('Error obteniendo semanas:', error);
            mostrarNotificacion('Error al cargar el historial.', 'error');
            return [];
        }

        return data.map(semana => ({
            ...semana,
            jugadores_count: semana.trabajo_semanal_jugadores ? semana.trabajo_semanal_jugadores.length : 0
        }));
    } catch (e) {
        console.error('Error en fetchSemanas:', e);
        return [];
    }
}

export async function fetchSemanaConJugadores(semanaId) {
    try {
        const { data: semanaData, error: semanaError } = await supabaseClient
            .from('trabajo_semanas')
            .select('*')
            .eq('id', semanaId)
            .single();

        if (semanaError) {
            console.error('Error obteniendo semana:', semanaError);
            return null;
        }

        const { data: jugadoresData, error: jugadoresError } = await supabaseClient
            .from('trabajo_semanal_jugadores')
            .select('*')
            .eq('semana_id', semanaId);

        if (jugadoresError) {
            console.error('Error obteniendo jugadores de la semana:', jugadoresError);
            return null;
        }

        return {
            semana: semanaData,
            jugadores: jugadoresData || []
        };
    } catch (e) {
        console.error('Error en fetchSemanaConJugadores:', e);
        return null;
    }
}

export async function getSiguienteNumeroSemana() {
    const temporadaId = await getTemporadaActiva();
    if (!temporadaId) return 1;

    const { data, error } = await supabaseClient
        .from('trabajo_semanas')
        .select('numero_semana')
        .eq('temporada_id', temporadaId)
        .order('numero_semana', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        return 1;
    }
    return data[0].numero_semana + 1;
}

export async function crearNuevaSemanaConDatos(numeroSemana, fechaInicio, fechaFin) {
    const temporadaId = await getTemporadaActiva();
    if (!temporadaId) return null;

    // Verificar que no exista ya una semana con ese número
    const { data: existente, error: checkError } = await supabaseClient
        .from('trabajo_semanas')
        .select('id')
        .eq('temporada_id', temporadaId)
        .eq('numero_semana', numeroSemana)
        .maybeSingle();

    if (existente) {
        mostrarNotificacion(`La semana ${numeroSemana} ya existe.`, 'error');
        return null;
    }

    const jugadores = await fetchJugadoresActivos();
    if (jugadores.length === 0) {
        mostrarNotificacion('No hay jugadores activos para crear la semana.', 'error');
        return null;
    }

    // Crear la semana con los datos proporcionados
    const { data: nuevaSemana, error: semanaError } = await supabaseClient
        .from('trabajo_semanas')
        .insert({
            temporada_id: temporadaId,
            numero_semana: numeroSemana,
            fecha_inicio: fechaInicio || null,
            fecha_fin: fechaFin || null
        })
        .select()
        .single();

    if (semanaError) {
        console.error('Error creando semana:', semanaError);
        mostrarNotificacion('Error al crear la semana.', 'error');
        return null;
    }

    // Insertar jugadores con objetivos vacíos
    const jugadoresInsert = jugadores.map(j => ({
        semana_id: nuevaSemana.id,
        jugador_id: j.id,
        objetivo_1: '',
        objetivo_2: '',
        objetivo_real: ''
    }));

    const { error: insertError } = await supabaseClient
        .from('trabajo_semanal_jugadores')
        .insert(jugadoresInsert);

    if (insertError) {
        console.error('Error insertando jugadores:', insertError);
        await supabaseClient.from('trabajo_semanas').delete().eq('id', nuevaSemana.id);
        mostrarNotificacion('Error al asignar jugadores a la semana.', 'error');
        return null;
    }

    mostrarNotificacion(`Semana ${numeroSemana} creada con ${jugadores.length} jugadores.`);
    return nuevaSemana.id;
}

// Función original para compatibilidad (crea automática)
export async function crearNuevaSemana() {
    const siguienteNumero = await getSiguienteNumeroSemana();
    const hoy = new Date();
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 6);
    
    return crearNuevaSemanaConDatos(
        siguienteNumero,
        hoy.toISOString().split('T')[0],
        fin.toISOString().split('T')[0]
    );
}

export async function guardarSemana(semanaId, jugadoresData) {
    try {
        const updates = jugadoresData.map(j => ({
            semana_id: semanaId,
            jugador_id: j.jugador_id,
            objetivo_1: j.objetivo_1 || '',
            objetivo_2: j.objetivo_2 || '',
            objetivo_real: j.objetivo_real || '',
            actualizado_en: new Date().toISOString()
        }));

        const { error } = await supabaseClient
            .from('trabajo_semanal_jugadores')
            .upsert(updates, {
                onConflict: 'semana_id, jugador_id',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('Error guardando semana:', error);
            mostrarNotificacion('Error al guardar los cambios.', 'error');
            return false;
        }

        mostrarNotificacion('Cambios guardados correctamente.');
        return true;
    } catch (e) {
        console.error('Error en guardarSemana:', e);
        mostrarNotificacion('Error al guardar.', 'error');
        return false;
    }
}

export async function actualizarSemana(semanaId, numeroSemana, fechaInicio, fechaFin) {
    try {
        const temporadaId = await getTemporadaActiva();
        if (!temporadaId) return false;

        // Verificar que no exista otra semana con ese número
        const { data: existente, error: checkError } = await supabaseClient
            .from('trabajo_semanas')
            .select('id')
            .eq('temporada_id', temporadaId)
            .eq('numero_semana', numeroSemana)
            .neq('id', semanaId)
            .maybeSingle();

        if (existente) {
            mostrarNotificacion(`La semana ${numeroSemana} ya existe.`, 'error');
            return false;
        }

        const { error } = await supabaseClient
            .from('trabajo_semanas')
            .update({
                numero_semana: numeroSemana,
                fecha_inicio: fechaInicio || null,
                fecha_fin: fechaFin || null
            })
            .eq('id', semanaId);

        if (error) {
            console.error('Error actualizando semana:', error);
            mostrarNotificacion('Error al actualizar la semana.', 'error');
            return false;
        }

        mostrarNotificacion('Semana actualizada correctamente.');
        return true;
    } catch (e) {
        console.error('Error en actualizarSemana:', e);
        mostrarNotificacion('Error al actualizar.', 'error');
        return false;
    }
}

export async function eliminarSemana(semanaId) {
    try {
        const { error } = await supabaseClient
            .from('trabajo_semanas')
            .delete()
            .eq('id', semanaId);

        if (error) {
            console.error('Error eliminando semana:', error);
            mostrarNotificacion('Error al eliminar la semana.', 'error');
            return false;
        }

        mostrarNotificacion('Semana eliminada correctamente.');
        return true;
    } catch (e) {
        console.error('Error en eliminarSemana:', e);
        return false;
    }
}