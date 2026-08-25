// Devuelve la ruta correcta según si estamos en /views/ o en la raíz
function rutaRaiz(destino) {
  const enVistas = location.pathname.includes("/views/");
  return enVistas ? destino : "views/" + destino;
}

function rutaVista(destino) {
  const enVistas = location.pathname.includes("/views/");
  return enVistas ? destino : "views/" + destino;
}

async function exigirSesion() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) {
    mostrarNotificacion("No se pudo comprobar la sesión. Inténtalo de nuevo.", "error");
    return null;
  }
  if (!session) {
    const enVistas = location.pathname.includes("/views/");
    window.location.href = enVistas ? "../index.html" : "index.html";
    return null;
  }
  return session;
}

async function cerrarSesion() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    mostrarNotificacion("No se pudo cerrar la sesión. Inténtalo de nuevo.", "error");
    return;
  }
  const enVistas = location.pathname.includes("/views/");
  window.location.href = enVistas ? "../index.html" : "index.html";
}

function formatoMMSS(segundosTotales) {
  const segundos = Math.max(0, Math.floor(segundosTotales));
  const mm = Math.floor(segundos / 60).toString().padStart(2, "0");
  const ss = (segundos % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatoFecha(fechaISO) {
  const partes = fechaISO.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function parametroURL(nombre) {
  return new URLSearchParams(location.search).get(nombre);
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mostrarNotificacion(mensaje, tipo = "error") {
  let contenedor = document.getElementById("notificaciones");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "notificaciones";
    contenedor.className = "notificaciones";
    contenedor.setAttribute("aria-live", "polite");
    document.body.appendChild(contenedor);
  }

  const aviso = document.createElement("div");
  aviso.className = `notificacion notificacion-${tipo}`;
  aviso.setAttribute("role", "status");
  aviso.textContent = mensaje;
  contenedor.appendChild(aviso);

  window.setTimeout(() => aviso.remove(), 5000);
}

function notificarError(error, mensaje = "No se pudo completar la operación.") {
  console.error(error);
  mostrarNotificacion(mensaje, "error");
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Error al entrar en pantalla completa:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Botón en el header
document.getElementById("botonPantallaCompleta")?.addEventListener("click", toggleFullscreen);