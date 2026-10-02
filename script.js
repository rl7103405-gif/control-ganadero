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
  ['#f-cabezas', '#f-lugar', '#f-nombre'].forEach((id) => marcarInvalido(id, false));

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
  if (!cabezasValidas) invalidos.push({ id: '#f-cabezas', mensaje: null });
  if (!datos.lugar) invalidos.push({ id: '#f-lugar', mensaje: 'el municipio y estado' });
  if (!datos.nombre) invalidos.push({ id: '#f-nombre', mensaje: 'tu nombre' });

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
const enCelular = window.matchMedia('(max-width: 860px)');
if (pasos.length && enCelular.matches) {
  // CELULAR: la mitad de arriba la ocupa el teléfono fijo. Manda el último paso
  // cuyo título ya subió a la zona de lectura (debajo del teléfono). Así la
  // pantalla cambia justo cuando llega el texto nuevo, no cuando el viejo ya se escondió.
  let turno = false;
  const elegir = () => {
    turno = false;
    const linea = window.innerHeight * 0.84;
    let n = 0;
    pasos.forEach((p, i) => { if (p.querySelector('h3').getBoundingClientRect().top <= linea) n = i; });
    activar(n);
  };
  window.addEventListener('scroll', () => { if (!turno) { turno = true; requestAnimationFrame(elegir); } }, { passive: true });
  elegir();
} else if ('IntersectionObserver' in window && pasos.length) {
  const vigia = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => { if (en.isIntersecting) activar(Number(en.target.dataset.pantalla)); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  pasos.forEach((p) => vigia.observe(p));
  activar(0);
} else {
  pasos.forEach((p) => p.classList.add('activo'));
}

// Animaciones (02/10/2026): quien la usa tiene unos 60 años y el scroll que movía
// cosas confundía. Por decisión de Beto solo quedan dos: el teléfono de "Qué hace"
// que cambia de pantalla al bajar, y el confeti al pasar a anual (precios.js).
const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  if (marco) marco.style.transform = '';   // la demo va a tamaño real dentro de una ventana ancha (estilos.css)
}

if (probar && figura && pantalla) {
  const imagenOriginal = pantalla.querySelector('img');
  let cerrar = null;

  function cerrarDemo() {
    pantalla.textContent = '';
    if (imagenOriginal) pantalla.appendChild(imagenOriginal);
    figura.classList.remove('viva');
    probar.focus();                         // el foco vuelve a quien abrió
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && figura.classList.contains('viva')) cerrarDemo(); });

  probar.addEventListener('click', (e) => {
    if (!ancha.matches) return;             // en celular: que siga la liga (la demo trae su "Volver")
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    // La barra de la ventana lleva el aviso y el botón de cerrar POR FUERA de
    // la demo: así no tapan contenido y el cerrar siempre queda a la vista.
    const barra = document.createElement('div'); barra.className = 'ventana-barra';
    const puntos = document.createElement('span'); puntos.className = 'ventana-puntos'; puntos.setAttribute('aria-hidden', 'true');
    const titulo = document.createElement('span'); titulo.className = 'ventana-titulo'; titulo.textContent = 'Demostración · rancho ficticio, datos inventados';
    const cerrar = document.createElement('button'); cerrar.type = 'button'; cerrar.className = 'ventana-cerrar'; cerrar.textContent = 'Cerrar ✕';
    cerrar.addEventListener('click', cerrarDemo);
    // La misma salida a ventas que trae la demo en celular: cierra y lleva al formulario.
    const quiero = document.createElement('a'); quiero.className = 'ventana-quiero'; quiero.href = '#contacto'; quiero.textContent = 'Quiero esto para mi rancho';
    quiero.addEventListener('click', () => { cerrarDemo(); });
    barra.append(puntos, titulo, quiero, cerrar);

    const marco = document.createElement('iframe');
    marco.src = probar.href.split('#')[0] + '#/rancho';   // la misma liga del botón, sirva desde donde sirva
    marco.title = 'Demostración de la aplicación con un rancho ficticio';
    marco.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads');
    marco.setAttribute('referrerpolicy', 'no-referrer');
    marco.addEventListener('load', () => {
      marco.focus();
      // Con el foco dentro de la demo, Escape se teclea ALLÁ: se escucha también ahí.
      try { marco.contentWindow.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') cerrarDemo(); }); } catch (err) { /* sin acceso: queda el botón */ }
    });
    pantalla.textContent = '';
    pantalla.append(barra, marco);
    figura.classList.add('viva');
    window.scrollTo({ top: figura.getBoundingClientRect().top + window.scrollY - 88, behavior: quieto ? 'auto' : 'smooth' });
  });
  window.addEventListener('resize', escalarDemo);
}

