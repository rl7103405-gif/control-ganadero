// ============================================================
// PRECIOS — la tarjeta del servicio (25/09), como la de Mi Cartera:
// mensual o anual (20 % menos, con confeti al pasar a anual) y el escalón
// por cabezas. Los importes salen de la tabla de la cláusula quinta del
// contrato; si cambian allá, se cambian en los value de los radios del HTML.
//
// Mejora progresiva: sin este archivo se ve la tabla de siempre. Solo si todo
// arranca bien se muestran los controles y se pone .plan--vivo (que esconde
// la tabla). Si el confeti no carga, los precios funcionan igual.
// ============================================================
(() => {
  'use strict';

  const plan = document.getElementById('plan');
  if (!plan) return;
  const controles = plan.querySelector('.plan__controles');
  const monto = document.getElementById('plan-monto');
  const per = document.getElementById('plan-per');
  const nota = document.getElementById('plan-nota');
  const leer = document.getElementById('plan-leer');
  const anual = document.getElementById('plan-anual');
  if (!controles || !monto || !per || !nota || !leer || !anual) return;

  const DESCUENTO_ANUAL = 0.2;
  const pesos = (n) => '$' + Math.round(n).toLocaleString('es-MX');
  const cifra = (n) => Math.round(n).toLocaleString('es-MX');
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

  function elegido(nombre) {
    const r = plan.querySelector(`input[name="${nombre}"]:checked`);
    return r || plan.querySelector(`input[name="${nombre}"]`);
  }

  function pintar() {
    const radio = elegido('cabezas-plan');
    const mensual = Number(radio.value);
    const escalon = radio.dataset.escalon || '';
    const esAnual = elegido('periodo-plan').value === 'anual';
    if (esAnual) {
      const alAnio = mensual * 12 * (1 - DESCUENTO_ANUAL);
      monto.textContent = cifra(alAnio);
      per.textContent = 'al año, más IVA';
      nota.textContent = `Pago anual por adelantado. Equivale a ${pesos(alAnio / 12)} al mes: te ahorras ${pesos(mensual * 12 - alAnio)} al año.`;
      leer.textContent = `${escalon}, pago anual: ${pesos(alAnio)} al año, más IVA. `;
    } else {
      monto.textContent = cifra(mensual);
      per.textContent = 'al mes, más IVA';
      nota.textContent = 'Pagas mes con mes.';
      leer.textContent = `${escalon}, pago mensual: ${pesos(mensual)} al mes, más IVA. `;
    }
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
    let periodo = elegido('periodo-plan').value;
    controles.addEventListener('change', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      pintar();
      if (t.name === 'periodo-plan') {
        if (t.value === 'anual' && periodo !== 'anual') festejar();   // solo al cambiar de verdad a anual
        periodo = t.value;
      }
    });
    pintar();
    controles.hidden = false;
    plan.classList.add('plan--vivo');
  } catch (e) {
    controles.hidden = true;
    plan.classList.remove('plan--vivo');
  }
})();
