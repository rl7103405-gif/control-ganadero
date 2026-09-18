# Página de venta del control ganadero

Una sola página, sin frameworks ni build: `index.html`, `estilos.css`,
`script.js`, `404.html` y `assets/` (capturas del **rancho de demostración**,
datos ficticios — nunca del San Fernando).

Se prueba con `python -m http.server 5301` y abriendo `http://127.0.0.1:5301`.

## Reglas que no se rompen

- **Solo se anuncia lo que la app ya hace.** Nada de collares, costo por kilo ni
  funciones de `IDEAS.md` hasta que existan.
- **Las capturas son del rancho falso** (`app-rancho/demo`). Si cambia la app,
  se vuelven a tomar.
- **Seguridad:** CSP estricta (solo scripts propios, sin scripts en línea, sin
  conexiones), nada de `innerHTML` con datos del visitante, el formulario no
  manda nada a ningún servidor ni guarda nada: arma un mensaje de WhatsApp.
  Ligas externas con `noopener noreferrer`.
- **Accesibilidad:** contraste AA, foco visible, se puede usar con teclado,
  respeta "reducir movimiento", y sin JavaScript se ve todo el contenido.

Las fuentes Newsreader e Instrument Sans (licencia SIL OFL) están autoalojadas
en `assets/fuentes/`, no cargan de Google Fonts.

## Diseño

"Tierra de noche": fondo carbón cálido, un solo acento ámbar (luz de lámpara),
serif grande en minúsculas (Newsreader) y sans quieta (Instrument Sans). El
teléfono es el único objeto: en la portada sale iluminado desde abajo, y en
"Qué hace" se queda fijo y cambia de pantalla conforme se baja. En celular cada
paso trae su propia captura. Las variables están arriba de `estilos.css`.

Lo que falta para publicarla está en `PUBLICAR.md`.

## La demo viva (`demo/`)

Es la app real con el rancho FICTICIO, compilada aparte y sin Firebase:

```
cd ../app-rancho
npx vite build --config demo/vite.publica.config.js
cd ../pagina-control-ganadero/demo
sed 's|\.\./\.\./assets/|./assets/|g' demo/publica/index.html > index.html && rm -rf demo
```

Después hay que volver a ponerle a `demo/index.html` la CSP, la hoja `aviso-demo.css` y la
cinta "Demostración · rancho ficticio" (ver el commit del 18/09), y barrer el paquete:
no debe aparecer `AIza`, ni nombres reales. Nunca se compila con `DEMO_DATOS=real`.
