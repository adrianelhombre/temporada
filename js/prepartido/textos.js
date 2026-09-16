const ETIQUETAS_TEXTO = {
  resumen: "Notas del resumen",
  ataque: "Notas de ataque",
  defensa: "Notas de defensa",
  corners_favor: "Notas de córners a favor",
  corners_contra: "Notas de córners en contra"
};

function pintarTexto() {
  const txt = document.getElementById("textoAnalisis");
  txt.value = analisis.textos[tabActiva] || "";
  document.getElementById("etiquetaTexto").textContent = ETIQUETAS_TEXTO[tabActiva] || "Notas";
}

let timeoutTexto = null;
function onTextoCambia() {
  const txt = document.getElementById("textoAnalisis");
  analisis.textos[tabActiva] = txt.value;
  if (timeoutTexto) clearTimeout(timeoutTexto);
  timeoutTexto = setTimeout(() => { guardarAnalisis(); }, 600);
}