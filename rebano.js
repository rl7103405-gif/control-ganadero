// ============================================================
// EL REBAÑO — veinte fotos que, con el scroll normal de la página, se juntan
// en línea, luego en círculo y al final se abren en arco. Idea tomada del
// "scroll-morph-hero" de 21st.dev (React + framer-motion), rehecha aquí sin
// dependencias y SIN secuestrar el scroll: no hay preventDefault en ningún
// lado; la página baja como siempre y la sección se queda fija un rato.
//
// Todo lo dicta el scroll, no un reloj: si alguien recarga a media sección,
// entra por un ancla o regresa desde abajo, cada foto está donde debe.
//
// Mejora progresiva: la clase .rebano--vivo solo se pone si esto arranca
// bien. Sin ella (sin JS, con "reducir movimiento", en pantallas muy bajas
// o si algo truena) queda la rejilla quieta de estilos.css.
// ============================================================
(() => {
  'use strict';

  const sec = document.getElementById('rebano');
  if (!sec || !('IntersectionObserver' in window) || !window.requestAnimationFrame) return;

  const escenario = sec.querySelector('.rebano__escenario');
  const intro = sec.querySelector('.rebano__intro');
  const texto = sec.querySelector('.rebano__texto');
  const todas = Array.from(sec.querySelectorAll('.rebano__carta'));
  const nav = document.querySelector('.nav');
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fino = window.matchMedia('(hover: hover) and (pointer: fine)');
  const angosta = window.matchMedia('(max-width: 767px)');   // la misma regla que estilos.css
  if (!escenario || !intro || !texto || todas.length < 2) return;

  const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mezcla = (a, b, t) => a + (b - a) * t;
  const suave = (t) => t * t * (3 - 2 * t);
  const tramo = (v, a, b) => limita((v - a) / (b - a));

  // Dónde arranca cada foto, desperdigada. Con semilla fija y no Math.random:
  // la página se ve igual cada vez que se abre.
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
  const regadas = todas.map(() => ({ x: azar() - 0.5, y: azar() - 0.5, r: (azar() - 0.5) * 180 }));

  let vivo = false, activo = false, pendiente = false, antes = 0;
  let W = 0, H = 0, VH = 0, navH = 72, ancho = 60, movil = false, cartas = [];
  // meta = lo que dicta el scroll; pinta = lo que se dibuja (va alcanzando a meta,
  // eso le da el "resorte" sin simular física tarjeta por tarjeta).
  const meta = { q: 0, p: 0, par: 0 };
  const pinta = { q: 0, p: 0, par: 0 };

  function medir() {
    W = escenario.clientWidth;
    H = escenario.clientHeight;
    VH = window.innerHeight;
    navH = nav ? nav.offsetHeight : 72;
    cartas = todas.filter((c) => c.offsetParent !== null);   // en celular el CSS esconde ocho
    ancho = cartas.length ? cartas[0].offsetWidth : 60;
    movil = angosta.matches;
  }

  // q: la entrada, de 0 (la sección apenas asoma abajo) a 1 (llegó arriba).
  // p: el recorrido mientras el escenario está fijo, de 0 a 1.
  function leerScroll() {
    const r = sec.getBoundingClientRect();
    meta.q = limita(1 - r.top / Math.max(1, VH));
    meta.p = limita(-r.top / Math.max(1, r.height - H));
  }

  function colocar() {
    const N = cartas.length;
    if (N < 2) return;
    const q = pinta.q;
    const m = suave(tramo(pinta.p, 0, 0.25));          // círculo → arco
    const u = tramo(pinta.p, 0.25, 1);                  // el arco se recorre
    const cy = navH / 2;                                // centro del área que no tapa la barra
    const rCirculo = Math.min(Math.min(W, H - navH - 60) * 0.4, 350);   // 60: aire para el crédito de abajo
    // Si en el círculo no caben todas lado a lado (laptop con zoom, pantallas bajas), se achican ahí.
    const chica = Math.min(1, (2 * Math.PI * rCirculo) / N / (ancho + 8));
    const paso = ancho + 10;
    const rArco = Math.min(W, H * 1.5) * (movil ? 1.4 : 1.1);
    const centroArco = H * (movil ? 0.1 : 0.25) + rArco;
    const abre = movil ? 100 : 130;
    const inicio = -90 - abre / 2;
    const salto = abre / (N - 1);
    const corre = -u * abre * 0.35;                     // se corre, sin dejar medio arco vacío al final
    const grande = movil ? 1.5 : 1.8;

    for (let i = 0; i < N; i++) {
      const s = regadas[i];
      const lx = i * paso - ((N - 1) * paso) / 2;
      const ang = (i / N) * 360;
      const rad = (ang * Math.PI) / 180;
      const cx = Math.cos(rad) * rCirculo;
      const cyC = Math.sin(rad) * rCirculo + cy;
      let x, y, r, e = 1, o = 1;
      if (q < 0.5) {                                    // regadas → línea
        const a = suave(q / 0.5);
        x = mezcla(s.x * W * 1.2, lx, a);
        y = mezcla(s.y * H, cy, a);
        r = mezcla(s.r, 0, a);
        e = mezcla(0.6, 1, a);
        o = a;
      } else {                                          // línea → círculo
        const b = suave((q - 0.5) / 0.5);
        x = mezcla(lx, cx, b);
        y = mezcla(cy, cyC, b);
        r = mezcla(0, ang + 90, b);
        e = mezcla(1, chica, b);
      }
      if (m > 0) {                                      // → arco (desde donde vaya, sin saltos)
        const aA = inicio + i * salto + corre;
        const rA = (aA * Math.PI) / 180;
        x = mezcla(x, Math.cos(rA) * rArco + pinta.par, m);
        y = mezcla(y, Math.sin(rA) * rArco + centroArco, m);
        r = mezcla(r, aA + 90, m);
        e = mezcla(e, grande, m);
        o = mezcla(o, 1, m);
      }
      const st = cartas[i].style;
      st.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg) scale(${e.toFixed(3)})`;
      st.opacity = o.toFixed(3);
    }
    const t = tramo(m, 0.8, 1);
    intro.style.opacity = (tramo(q, 0.75, 1) * limita(1 - m * 2)).toFixed(3);
    texto.style.opacity = t.toFixed(3);
    texto.style.transform = `translate(-50%, ${((1 - t) * 20).toFixed(1)}px)`;
  }

  function pintar(ahora) {
    pendiente = false;
    if (!vivo) return;
    const dt = antes ? Math.min(0.05, (ahora - antes) / 1000) : 0.016;
    antes = ahora;
    leerScroll();
    const k = 1 - Math.exp(-dt * 7);
    let quietas = true;
    for (const c of ['q', 'p', 'par']) {
      const d = meta[c] - pinta[c];
      if (Math.abs(d) < (c === 'par' ? 0.3 : 0.0005)) pinta[c] = meta[c];
      else { pinta[c] += d * k; quietas = false; }
    }
    colocar();
    if (!quietas && activo) pedir();
    else antes = 0;                                     // la próxima vez el reloj arranca de nuevo
  }

  function pedir() {
    if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); }
  }

  // Cambiar de modo cambia el alto de la sección. Si la sección ya quedó arriba
  // (alguien recargó más abajo), lo de abajo se movería: se compensa, salvo que
  // el navegador ya lo haya hecho solo (scroll anchoring). Si en cambio el
  // usuario está DENTRO de la sección (por ejemplo gira el celular a horizontal
  // y se apaga el modo vivo), la sección se encoge bajo sus pies y queda varias
  // pantallas abajo de su contenido: se reubica justo debajo de la barra fija.
  // 'instant' es obligatorio en los dos casos porque html tiene scroll-behavior: smooth.
  function conAncla(cambio) {
    const r0 = sec.getBoundingClientRect();
    const y0 = window.scrollY;
    const dentro = r0.top < 0 && r0.bottom > 0;
    cambio();
    const r1 = sec.getBoundingClientRect();
    if (r0.bottom <= 0 && window.scrollY === y0 && r1.height !== r0.height) {
      window.scrollBy({ top: r1.height - r0.height, left: 0, behavior: 'instant' });
    } else if (dentro && r1.height !== r0.height) {
      const alturaNav = navH || (nav ? nav.offsetHeight : 72);   // por si aún no se llamó a medir()
      window.scrollBy({ top: r1.top - alturaNav, left: 0, behavior: 'instant' });
    }
  }

  function limpiar() {
    for (const c of todas) { c.style.transform = ''; c.style.opacity = ''; c.classList.remove('rebano__carta--volteada'); }
    intro.style.opacity = '';
    texto.style.opacity = '';
    texto.style.transform = '';
  }

  function encender() {
    if (vivo) return;
    conAncla(() => sec.classList.add('rebano--vivo'));
    sec.classList.toggle('rebano--activo', activo);
    vivo = true;
    medir();
    leerScroll();
    pinta.q = meta.q; pinta.p = meta.p; pinta.par = meta.par = 0;   // sin "arrancar desde cero" al recargar
    colocar();
  }

  function apagar() {
    if (!vivo) return;
    vivo = false;
    conAncla(() => sec.classList.remove('rebano--vivo', 'rebano--activo'));
    limpiar();
  }

  // Muy baja (celular acostado, ventana enana) o con "reducir movimiento": quieta.
  const cabe = () => !quieto.matches && window.innerHeight >= 460 && window.innerWidth <= window.innerHeight * 2.4;

  function revisar() {
    try {
      if (cabe()) {
        if (!vivo) encender();
        else { medir(); pedir(); }
      } else apagar();
    } catch (e) {
      apagar();
    }
  }

  try {
    const vigia = new IntersectionObserver((entradas) => {
      const estaba = activo;
      activo = entradas[entradas.length - 1].isIntersecting;
      sec.classList.toggle('rebano--activo', activo && vivo);
      // Lo que pasó fuera de pantalla no se anima: al volver, cada foto ya está en su lugar.
      if (activo && !estaba && vivo) { leerScroll(); pinta.q = meta.q; pinta.p = meta.p; colocar(); }
      if (activo) pedir();
    }, { rootMargin: '10% 0px' });
    vigia.observe(sec);

    window.addEventListener('scroll', () => { if (vivo && activo) pedir(); }, { passive: true });

    let redimension = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(redimension);
      redimension = requestAnimationFrame(revisar);
    });
    window.addEventListener('pageshow', () => { if (vivo) { medir(); pedir(); } });
    if (typeof quieto.addEventListener === 'function') quieto.addEventListener('change', revisar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (vivo) { medir(); pedir(); } }).catch(() => {});

    // Un poco de movimiento con el mouse, solo en computadora y solo en el arco.
    sec.addEventListener('pointermove', (e) => {
      if (!vivo || !fino.matches || !W) return;
      if (pinta.p <= 0) {                                 // el arco (donde se ve el parallax) aún no empieza
        meta.par = 0;
        if (pinta.par !== 0) pedir();                     // sigue en 0 mientras pinta.par no lo alcance
        return;
      }
      meta.par = ((e.clientX / W) * 2 - 1) * 40;
      pedir();
    });
    sec.addEventListener('pointerleave', () => { meta.par = 0; if (vivo) pedir(); });

    // En celular no hay "pasar el mouse" para ver el reverso: tocar una tarjeta la voltea
    // (otro toque la regresa). Usa "click" porque el navegador no lo dispara cuando el
    // dedo arrastra para bajar; con mouse no hace nada porque ahí manda el hover.
    const mazo = sec.querySelector('.rebano__cartas');
    if (mazo) mazo.addEventListener('click', (e) => {
      if (!vivo || fino.matches || !(e.target instanceof Element)) return;
      const carta = e.target.closest('.rebano__carta');
      if (carta) carta.classList.toggle('rebano__carta--volteada');
    });

    revisar();
  } catch (e) {
    apagar();
  }
})();
