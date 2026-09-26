// ============================================================
// PRECIOS — el servicio con tres tarjetas y un solo mensual/anual (25/09,
// mock-up de Beto). Anual = 20 % menos y confeti al cambiar a anual. Los
// importes mensuales viven en el HTML (data-mensual de cada .tarjeta) y salen
// de la cláusula quinta del contrato; si cambian allá, se cambian ahí.
//
// Mejora progresiva: sin este archivo las tarjetas se ven con su precio
// mensual y sin selector. Si el confeti no carga, los precios funcionan igual.
// ============================================================
(() => {
  'use strict';

  const plan = document.getElementById('plan');
  if (!plan) return;
  const periodo = plan.querySelector('.plan__periodo');
  const leer = document.getElementById('plan-leer');
  const anual = document.getElementById('plan-anual');
  const tarjetas = Array.from(plan.querySelectorAll('.tarjeta')).map((t) => ({
    mensual: Number(t.dataset.mensual),
    titulo: (t.querySelector('.tarjeta__titulo') || {}).textContent || '',
    cifra: t.querySelector('.tarjeta__cifra'),
    per: t.querySelector('.tarjeta__per'),
    nota: t.querySelector('.tarjeta__nota'),
    aparte: t.querySelector('.tarjeta__aparte'),   // el "más de 1,000" dentro de la tercera tarjeta
  }));
  if (!periodo || !leer || !anual || !tarjetas.length || tarjetas.some((t) => !t.mensual || !t.cifra || !t.per || !t.nota)) return;

  const DESCUENTO_ANUAL = 0.2;
  const cifra = (n) => Math.round(n).toLocaleString('es-MX');
  const pesos = (n) => '$' + cifra(n);
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Confeti con lienzo propio y sin worker: la versión por defecto crea un worker
  // desde un Blob, que la CSP de la página bloquea.
  let confeti = null;
  try {
    const lienzo = document.getElementById('confeti');
    if (lienzo && typeof window.confetti === 'function' && typeof window.confetti.create === 'function') {
      confeti = window.confetti.create(lienzo, { resize: true, useWorker: false, disableForReducedMotion: true });
    }
  } catch (e) { confeti = null; }

  const esAnual = () => {
    const r = periodo.querySelector('input[name="periodo-plan"]:checked');
    return !!r && r.value === 'anual';
  };

  // anunciar: solo al cambiar el selector, no al cargar (si no, el lector de pantalla lo lee de golpe).
  function pintar(anunciar) {
    const a = esAnual();
    const frases = [];
    for (const t of tarjetas) {
      if (a) {
        const alAnio = t.mensual * 12 * (1 - DESCUENTO_ANUAL);
        const ahorro = t.mensual * 12 - alAnio;
        // En anual, en grande va lo que sale AL MES (se compara directo con el mensual: $400 contra
        // $320) y abajo el año completo, que se paga por adelantado, y el ahorro (Beto, 26/09).
        t.cifra.textContent = cifra(alAnio / 12);
        t.per.textContent = 'al mes, más IVA';
        t.nota.textContent = `${pesos(alAnio)} al año, pagado por adelantado. Te ahorras ${pesos(ahorro)}.`;
        let frase = `${t.titulo}: ${pesos(alAnio / 12)} al mes pagando el año por adelantado, ${pesos(alAnio)} al año`;
        // tercera tarjeta: aclarar que de 1,000 cabezas para arriba el precio sube (aparte).
        if (t.aparte) {
          const aparteAnual = Number(t.aparte.dataset.mensual) * 12 * (1 - DESCUENTO_ANUAL);
          t.aparte.textContent = `${pesos(aparteAnual / 12)} al mes (${pesos(aparteAnual)} al año)`;
          frase += `, de 501 a 1,000; con más de 1,000, ${pesos(aparteAnual / 12)} al mes, ${pesos(aparteAnual)} al año`;
        }
        frase += `. Te ahorras ${pesos(ahorro)}`;
        frases.push(frase);
      } else {
        t.cifra.textContent = cifra(t.mensual);
        t.per.textContent = 'al mes, más IVA';
        t.nota.textContent = '';
        let frase = `${t.titulo}: ${pesos(t.mensual)} al mes`;
        if (t.aparte) {
          const aparteMensual = Number(t.aparte.dataset.mensual);
          t.aparte.textContent = `${pesos(aparteMensual)} al mes`;
          frase += ` de 501 a 1,000; con más de 1,000, ${pesos(aparteMensual)} al mes`;
        }
        frases.push(frase);
      }
    }
    if (anunciar) leer.textContent = (a ? 'Pago anual por adelantado, más IVA. ' : 'Pago mensual, más IVA. ') + frases.join('. ') + '.';
  }

  function festejar() {
    if (!confeti || quieto.matches) return;
    const r = anual.getBoundingClientRect();
    confeti({
      particleCount: 110, spread: 75, startVelocity: 38, ticks: 200, scalar: 0.95,
      origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight },
      colors: ['#E7A56B', '#EDE6DA', '#D08A4E', '#C9C1B3', '#8FB39A'],
    });
  }

  try {
    let antes = esAnual();
    periodo.addEventListener('change', () => {
      const ahora = esAnual();
      pintar(true);
      if (ahora && !antes) festejar();   // solo al cambiar de verdad a anual
      antes = ahora;
    });
    pintar();
    periodo.hidden = false;
    plan.classList.add('plan--vivo');
  } catch (e) {
    periodo.hidden = true;
    plan.classList.remove('plan--vivo');
  }
})();
