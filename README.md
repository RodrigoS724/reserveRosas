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
4. Workflow de release publicando assets en cada tag `v*`.

Comportamiento:

- En app empaquetada (`app.isPackaged = true`), se busca update al iniciar.
- Se vuelve a verificar cada 30 minutos (configurable).
- Si descarga una nueva version, muestra dialogo para reiniciar e instalar.

Variables opcionales:

- `AUTO_UPDATE_ENABLED=0` para desactivar.
- `AUTO_UPDATE_ALLOW_PRERELEASE=1` para prereleases.
- `AUTO_UPDATE_INTERVAL_MS=1800000` para intervalo personalizado.

## Release 1.0 (GitHub)

Pasos recomendados:

1. Verificar que `GH_TOKEN` exista en GitHub Actions (el workflow ya usa `secrets.GITHUB_TOKEN`).
2. Ejecutar localmente `npm run release:github -- major` para crear y pushear `v1.0.0`.
3. Esperar el workflow `Release (Windows)`.
4. Confirmar en el release de GitHub que existan:
	- `App-RosasUy-Setup-1.0.0.exe`
	- `latest.yml`
	- `*.blockmap`
5. Instalar `1.0.0` en una PC de prueba y validar deteccion de update al publicar `1.0.1`.

## Estructura separada de repositorios

Este repo queda solo para la app desktop.

- Backend Node: `..\\reserveRosas-server`
- Web publica (PHP): `..\\reserveRosas-web`

Si no existen esas carpetas hermanas, el script `npm run api` fallara hasta crearlas/moverlas.
