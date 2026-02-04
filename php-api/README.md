# API PHP (Reservas)

Este mini-proyecto expone una API simple para:
- Obtener horarios disponibles
- Crear reservas

## Requisitos
- PHP 8.0+
- Extensión `pdo_mysql` habilitada

## Configuración
1. Copia `php-api/.env.example` a `php-api/.env`
2. Completa las credenciales de MySQL

## Endpoints

Todos requieren token en `X-API-KEY` o `?token=...`.

### `GET /api/horarios?fecha=YYYY-MM-DD`
Devuelve los horarios disponibles para la fecha indicada.

### `POST /api/reservas`
Body JSON:
```
{
  "nombre": "Juan Perez",
  "cedula": "12345678",
  "telefono": "099123456",
  "marca": "Yamaha",
  "modelo": "FZ",
  "km": "12000",
  "matricula": "ABC1234",
  "tipo_turno": "Particular",
  "particular_tipo": "Service",
  "garantia_tipo": null,
  "garantia_fecha_compra": null,
  "garantia_numero_service": null,
  "garantia_problema": null,
  "fecha": "2026-02-04",
  "hora": "10:00",
  "detalles": ""
}
```

### `GET /api/vehiculo?matricula=ABC1234`
Devuelve marca/modelo si la matrícula existe.

## Nota
La lógica de horarios respeta:
- Horarios base activos
- Bloqueos
- Reservas existentes
- Sábados sólo hasta las 12:00
