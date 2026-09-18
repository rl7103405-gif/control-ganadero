// La demo se usa de dos formas: dentro de la ventana de la página (ahí el aviso
// y el botón de cerrar van por FUERA, en la barra de la ventana, para no tapar
// contenido) o a pantalla completa en el celular (ahí la cinta trae la salida:
// sin ella la única salida visible era "Salir", que no regresa a la página).
if (window.top !== window.self) {
  document.documentElement.classList.add('enmarcada');
} else {
  var liga = document.getElementById('volver');
  try {
    if (liga && document.referrer && new URL(document.referrer).origin === location.origin) liga.href = document.referrer;
  } catch (e) { /* se queda la liga de fábrica */ }
}
