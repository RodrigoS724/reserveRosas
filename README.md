# ReserveRosas (Desktop App)

Aplicacion Electron + Vue para gestion de reservas y operativa interna.

## Scripts utiles

- `npm run dev`: entorno de desarrollo.
- `npm run build`: build completo de app.
- `npm run build:win`: build instalador Windows.
- `npm run build:win:publish`: build y publicacion en GitHub Releases.
- `npm run release:github`: bump de version + push de tag.
- `npm run api`: arranca backend separado en `..\\reserveRosas-server`.

## Actualizaciones automaticas (GitHub)

La app incluye auto-update con `electron-updater`.

Requisitos:

1. `electron-builder.json5` con `publish.provider = github`.
2. Publicar releases (assets NSIS + `latest.yml`) desde CI o local.
3. Repositorio GitHub accesible para los clientes de la app.

Comportamiento:

- En app empaquetada (`app.isPackaged = true`), se busca update al iniciar.
- Se vuelve a verificar cada 30 minutos (configurable).
- Si descarga una nueva version, muestra dialogo para reiniciar e instalar.

Variables opcionales:

- `AUTO_UPDATE_ENABLED=0` para desactivar.
- `AUTO_UPDATE_ALLOW_PRERELEASE=1` para prereleases.
- `AUTO_UPDATE_INTERVAL_MS=1800000` para intervalo personalizado.

## Estructura separada de repositorios

Este repo queda solo para la app desktop.

- Backend Node: `..\\reserveRosas-server`
- Web publica (PHP): `..\\reserveRosas-web`

Si no existen esas carpetas hermanas, el script `npm run api` fallara hasta crearlas/moverlas.
