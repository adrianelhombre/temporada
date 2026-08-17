(async () => {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) {
    document.getElementById("errorLogin").textContent = "No se pudo comprobar la sesión.";
    document.getElementById("errorLogin").style.display = "block";
    return;
  }
  if (session) window.location.href = "views/inicio.html";
})();

document.getElementById("formularioLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorLogin = document.getElementById("errorLogin");
  errorLogin.style.display = "none";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errorLogin.textContent = "Correo o contraseña incorrectos.";
    errorLogin.style.display = "block";
    return;
  }
  window.location.href = "views/inicio.html";
});
