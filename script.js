/* ============================================================
   CONFIGURACIÓN — lo único que hay que tocar
   ============================================================ */
const CONFIG = {
  // 52 + lada + número, sin espacios. Mientras esté vacío, el formulario
  // avisa que falta en vez de abrir un WhatsApp roto.
  whatsapp: '522216675776',
};

/* ============================================================
   SEGURIDAD
   - Todo lo que escribe el visitante se trata como texto: se pinta con
     textContent y viaja dentro de la URL con encodeURIComponent. Nunca
     innerHTML con datos de alguien (misma regla que Entre Líneas).
   - La política de contenido (CSP, en index.html) restringe script-src a
     'self': solo corren scripts servidos desde este mismo sitio, ninguno
     de fuera.
   - Nada se guarda: ni servidor, ni localStorage, ni cookies.
   ============================================================ */

// Defensa contra clickjacking: frame-ancestors de la CSP solo funciona como
// cabecera HTTP, no puesto por <meta> (GitHub Pages no deja mandar
// cabeceras). Si alguien nos mete en un iframe de otro sitio, intentamos
// sacar la ventana de arriba a esta misma URL; si el otro origen lo
// bloquea (try/catch), ocultamos la página en vez de dejarla operar
// disfrazada dentro de un sitio ajeno.
if (window.top !== window.self) {
  try {
    window.top.location = window.self.location.href;
  } catch (err) {
    document.documentElement.style.display = 'none';
  }
}

document.documentElement.classList.add('js');

const $ = (s) => document.querySelector(s);
const numero = String(CONFIG.whatsapp).replace(/\D/g, '');
const hayNumero = /^52\d{10}$/.test(numero);

function ligaWhatsApp(texto) {
  return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
}

// Botón flotante: si ya hay número, va directo a WhatsApp.
if (hayNumero) {
  const flotante = $('#flotante');
  flotante.href = ligaWhatsApp('Hola, quiero informes del control ganadero.');
  flotante.target = '_blank';
  flotante.rel = 'noopener noreferrer';
}

$('#anio').textContent = String(new Date().getFullYear());

/* ---------- Formulario → mensaje de WhatsApp ---------- */
const formulario = $('#formulario');
const error = $('#error');
const botonEnviar = formulario.querySelector('button[type="submit"]');
const respaldo = $('#respaldo');

// Recorta por PUNTOS DE CÓDIGO, no por unidades UTF-16: un .slice a ciegas
// puede partir a la mitad un emoji o un carácter fuera del plano básico y
// dejar un sustituto suelto, que más abajo hace tronar encodeURIComponent.
function recortarTexto(s, n) {
  return Array.from(s).slice(0, n).join('');
}

function limpio(id, tope) {
  // Quita espacios de más y caracteres de control; recorta al tope.
  return recortarTexto($(id).value.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim(), tope);
}

// Marca (o quita) el error accesible en un campo: aria-invalid avisa al
// lector de pantalla que el valor no pasó, y aria-describedby lo liga al
// mensaje de #error.
function marcarInvalido(id, invalido) {
  const campo = $(id);
  if (invalido) {
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', 'error');
  } else {
    campo.removeAttribute('aria-invalid');
    campo.removeAttribute('aria-describedby');
  }
}

let enviando = false;

formulario.addEventListener('submit', (e) => {
  e.preventDefault();

  // Candado contra doble envío: un doble clic no debe abrir dos pestañas
  // de WhatsApp con el mismo mensaje.
  if (enviando) return;

  error.textContent = '';
  if (respaldo) respaldo.textContent = '';
  ['#f-nombre', '#f-lugar', '#f-cabezas'].forEach((id) => marcarInvalido(id, false));

  // Cabezas: solo dígitos, sin adivinar. Antes un .replace(/\D/g,'') convertía
  // "-10" en 10 y "1.5" en 15 sin avisar; ahora se aceptan espacios y comas de
  // miles (por si teclea "1,200") pero cualquier otra cosa es error explícito.
  const cabezasCrudo = limpio('#f-cabezas', 20).replace(/[ ,]/g, '');
  const cabezasValidas = /^\d{1,6}$/.test(cabezasCrudo) && Number(cabezasCrudo) > 0;

  const datos = {
    nombre: limpio('#f-nombre', 80),
    rancho: limpio('#f-rancho', 80),
    lugar: limpio('#f-lugar', 80),
    cabezas: cabezasCrudo,
    tipo: limpio('#f-tipo', 40),
    nota: recortarTexto($('#f-nota').value.replace(/[\x00-\x09\x0b-\x1f\x7f]/g, ' ').trim(), 400),
  };

  const invalidos = [];
  if (!datos.nombre) invalidos.push({ id: '#f-nombre', mensaje: 'tu nombre' });
  if (!datos.lugar) invalidos.push({ id: '#f-lugar', mensaje: 'el municipio y estado' });
  if (!cabezasValidas) invalidos.push({ id: '#f-cabezas', mensaje: null });

  if (invalidos.length) {
    invalidos.forEach((inv) => marcarInvalido(inv.id, true));
    const falta = invalidos.filter((inv) => inv.mensaje).map((inv) => inv.mensaje);
    let texto = falta.length ? 'Falta ' + falta.join(', ') + '.' : '';
    if (!cabezasValidas) {
      texto = (texto ? texto + ' ' : '') + 'Escribe cuántas cabezas tienes, solo con números.';
    }
    error.textContent = texto;
    $(invalidos[0].id).focus();
    return;
  }
  if (!hayNumero) {
    error.textContent = 'Todavía no está puesto el número de WhatsApp de esta página.';
    return;
  }

  const lineas = [
    'Hola, quiero informes del control ganadero.',
    '',
    'Nombre: ' + datos.nombre,
    datos.rancho ? 'Rancho: ' + datos.rancho : null,
    'Lugar: ' + datos.lugar,
    'Cabezas: ' + datos.cabezas,
    datos.tipo ? 'Se dedica a: ' + datos.tipo : null,
    datos.nota ? '\n' + datos.nota : null,
  ].filter((l) => l !== null);

  let liga;
  try {
    let texto = lineas.join('\n');
    // Un sustituto UTF-16 suelto (medio emoji pegado por el teclado del
    // celular, por ejemplo) hace que encodeURIComponent truene con
    // URIError. toWellFormed() lo repara si el navegador lo trae.
    if (typeof texto.toWellFormed === 'function') texto = texto.toWellFormed();
    liga = ligaWhatsApp(texto);
  } catch (err) {
    error.textContent = 'Hubo un problema con el texto del mensaje. Quita emojis o símbolos raros e intenta otra vez.';
    return;
  }

  enviando = true;
  if (botonEnviar) botonEnviar.disabled = true;
  window.open(liga, '_blank', 'noopener,noreferrer');

  // window.open con noopener siempre devuelve null: no hay forma de saber
  // si el navegador bloqueó la ventana. Por eso se deja SIEMPRE un enlace
  // visible de respaldo, en vez de adivinar si se abrió o no.
  if (respaldo) {
    respaldo.textContent = '';
    const a = document.createElement('a');
    a.href = liga;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Si no se abrió WhatsApp, toca aquí';
    respaldo.appendChild(a);
  }

  setTimeout(() => {
    enviando = false;
    if (botonEnviar) botonEnviar.disabled = false;
  }, 1500);
});

/* ---------- La barra de arriba toma fondo al bajar ---------- */
const nav = $('.nav');
const pintarNav = () => nav.classList.toggle('con-fondo', window.scrollY > 24);
pintarNav();
window.addEventListener('scroll', pintarNav, { passive: true });

/* ---------- Qué hace: el teléfono fijo cambia de pantalla ----------
   Cada paso del texto le dice al teléfono qué pantalla enseñar. En celular
   el teléfono fijo no existe (cada paso trae su foto), y esto no estorba. */
const pasos = document.querySelectorAll('.paso');
const pantallas = document.querySelectorAll('#pila img');
function activar(n) {
  pasos.forEach((p) => p.classList.toggle('activo', p.dataset.pantalla === String(n)));
  pantallas.forEach((img, i) => img.classList.toggle('activa', i === n));
}
if ('IntersectionObserver' in window && pasos.length) {
  const vigia = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => { if (en.isIntersecting) activar(Number(en.target.dataset.pantalla)); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  pasos.forEach((p) => vigia.observe(p));
  activar(0);
} else {
  pasos.forEach((p) => p.classList.add('activo'));
}

/* ---------- Aparición suave ----------
   Nunca deja nada oculto: si el observador no dispara (navegador viejo,
   captura de pantalla, impresión), a los 2.5 s se destapa todo. */
const aparecen = document.querySelectorAll('.historia h2, .pasos li, .tabla-precio, details, .mas li, .contacto > div, .formulario');
if ('IntersectionObserver' in window) {
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('visible'); observador.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  aparecen.forEach((el) => { el.classList.add('aparece'); observador.observe(el); });
  setTimeout(() => aparecen.forEach((el) => el.classList.add('visible')), 2500);
}

/* ---------- Movimiento de la portada ----------
   Barra de avance, teléfono que se inclina con el ratón (solo con ratón de
   verdad, no en táctil) y que se hunde un poco al bajar. Todo con
   requestAnimationFrame, y nada si la persona pidió reducir movimiento. */
const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const avance = $('#avance');
const telefonoPortada = $('#telefono-portada img');
const portada = $('.portada');
let inclinaX = 0, inclinaY = 0, pendiente = false;

function pintar() {
  pendiente = false;
  const alto = document.documentElement.scrollHeight - window.innerHeight;
  if (avance) avance.style.transform = 'scaleX(' + (alto > 0 ? Math.min(1, window.scrollY / alto) : 0) + ')';
  if (!quieto && telefonoPortada && telefonoPortada.isConnected && window.scrollY < window.innerHeight * 1.6) {
    const baja = Math.min(60, window.scrollY * 0.08);
    telefonoPortada.style.transform = 'translateY(' + baja + 'px) rotateX(' + inclinaY + 'deg) rotateY(' + inclinaX + 'deg)';
  }
}
function pedirPintar() { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }
window.addEventListener('scroll', pedirPintar, { passive: true });
window.addEventListener('resize', pedirPintar);
pintar();

if (!quieto && portada && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  portada.addEventListener('mousemove', (e) => {
    const r = portada.getBoundingClientRect();
    inclinaX = ((e.clientX - r.left) / r.width - 0.5) * 10;   // grados, izquierda-derecha
    inclinaY = -((e.clientY - r.top) / r.height - 0.5) * 6;   // grados, arriba-abajo
    pedirPintar();
  });
  portada.addEventListener('mouseleave', () => { inclinaX = 0; inclinaY = 0; pedirPintar(); });
}

/* ---------- El teléfono de la portada se puede probar ----------
   El botón es una liga normal a la demo (así funciona sin JavaScript y en
   celular, donde se abre completa). En pantallas anchas se intercepta y la app
   se carga DENTRO del teléfono.
   Sobre el sandbox: la demo es contenido PROPIO del mismo origen, así que el
   sandbox NO es aislamiento (con allow-scripts + allow-same-origin no puede
   serlo); solo le quita capacidades que no necesita: abrir ventanas, mandar
   formularios, navegar esta página. No se quita allow-same-origin porque la
   app carga módulos y usa almacenamiento del navegador. */
const probar = $('#probar');
const figura = $('#telefono-portada');
const pantalla = $('#pantalla');
const ancha = window.matchMedia('(min-width: 861px)');

function escalarDemo() {
  const marco = pantalla && pantalla.querySelector('iframe');
  if (marco) marco.style.transform = 'scale(' + (pantalla.clientWidth / 390) + ')';
}

if (probar && figura && pantalla) {
  const imagenOriginal = pantalla.querySelector('img');
  let cerrar = null;

  function cerrarDemo() {
    pantalla.textContent = '';
    if (imagenOriginal) pantalla.appendChild(imagenOriginal);
    figura.classList.remove('viva');
    if (cerrar) { cerrar.remove(); cerrar = null; }
    probar.focus();                         // el foco vuelve a quien abrió
  }

  probar.addEventListener('click', (e) => {
    if (!ancha.matches) return;             // en celular: que siga la liga
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;  // abrir en otra pestaña sigue funcionando
    e.preventDefault();
    const marco = document.createElement('iframe');
    marco.src = 'demo/index.html#/rancho';
    marco.title = 'Demostración de la aplicación con un rancho ficticio';
    marco.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads');
    marco.setAttribute('referrerpolicy', 'no-referrer');
    marco.addEventListener('load', () => marco.focus());   // teclado y lector de pantalla entran a la demo
    pantalla.textContent = '';
    pantalla.appendChild(marco);
    figura.classList.add('viva');
    inclinaX = 0; inclinaY = 0;
    escalarDemo();

    cerrar = document.createElement('button');
    cerrar.type = 'button'; cerrar.className = 'cerrar-demo';
    cerrar.textContent = 'Cerrar la demostración';
    cerrar.addEventListener('click', cerrarDemo);
    figura.appendChild(cerrar);
    figura.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' });
  });
  window.addEventListener('resize', escalarDemo);
}
