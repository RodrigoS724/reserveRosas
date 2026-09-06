# Separacion de repositorios (desktop, server, web, chat)

## Estado actual

- App desktop: este repositorio (`reserveRosas`).
- Backend Node movido a carpeta hermana: `../reserveRosas-server`.
- Web publica PHP movida a carpeta hermana: `../reserveRosas-web`.
- Microservicio de mensajeria: `../reserveRosas-chat-service`.

## Crear repositorio para backend

Desde `../reserveRosas-server`:

1. `git init`
2. `git add .`
3. `git commit -m "init: backend server"`
4. Crear repo remoto y hacer push.

## Crear repositorio para web publica

Desde `../reserveRosas-web`:

1. `git init`
2. `git add .`
3. `git commit -m "init: web php"`
4. Crear repo remoto y hacer push.

## Crear repositorio para mensajeria

Desde `../reserveRosas-chat-service`:

1. `git init`
2. `git add .`
3. `git commit -m "init: chat service"`
4. Crear repo remoto y hacer push.

## Notas

- En este repo desktop, `npm run api` ahora apunta a `../reserveRosas-server/index.js`.
- Si trabajas en VS Code multi-root, agrega como carpetas del workspace:
  - `../reserveRosas-server`
  - `../reserveRosas-web`
  - `../reserveRosas-chat-service`
