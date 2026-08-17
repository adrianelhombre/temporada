(async () => {
  if (!await exigirSesion()) return;

  document.getElementById("botonCerrarSesion").addEventListener("click", cerrarSesion);

  const { data: partidoEnCurso, error } = await supabaseClient
    .from("partidos")
    .select("id")
    .eq("estado", "en_juego")
    .limit(1)
    .maybeSingle();

  if (error) {
    notificarError(error, "No se pudo comprobar si hay un partido en curso.");
    return;
  }
  if (partidoEnCurso) {
    document.getElementById("avisoPartidoEnCurso").classList.remove("oculto");
    document.getElementById("enlaceReanudar").href = `partido.html?id=${partidoEnCurso.id}`;
  }
})();
