# Panel Administrativo con API remota

Para usar la app como panel administrativo y mover la logica al VPS:

1. Configura en `.env` (o `mysql.env` desde Configuracion):
   - `API_REMOTE_URL=https://tu-dominio.com`
   - `API_REMOTE_TOKEN=tu_token`
2. Reinicia Electron.

Con `API_REMOTE_URL` seteada:
- Se desactiva inicializacion local de DB SQLite/MySQL.
- Se desactivan backup scheduler y resumen diario locales.
- Cada `window.api.*` se reenvia al backend remoto via:
  - `POST {API_REMOTE_URL}/api/admin/ipc`
  - Body JSON: `{ "channel": "reservas:crear", "args": [ ... ] }`
  - Header opcional: `Authorization: Bearer {API_REMOTE_TOKEN}`

## Contrato de respuesta del backend remoto

Respuesta recomendada:

```json
{ "ok": true, "data": { } }
```

Errores:

```json
{ "ok": false, "error": "mensaje" }
```

Tambien se acepta un payload directo (sin `ok/data`) y se retorna tal cual al frontend.

## Canales locales que NO se proxyean

- `config:env:get`
- `config:env:set`

Se mantienen locales para poder cambiar configuracion del panel aunque la API remota no este disponible.

