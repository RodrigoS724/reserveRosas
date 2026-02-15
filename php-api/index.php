<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// CORS basico (ajustar en produccion)
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/');
if ($basePath === '') {
    $basePath = '/';
}
// Normalizar path para que funcione en subcarpetas (ej: /php-api/api/...)
if ($basePath !== '/' && str_starts_with($path, $basePath)) {
    $path = substr($path, strlen($basePath));
    if ($path === '') {
        $path = '/';
    }
}
if (!str_starts_with($path, '/api')) {
    if (preg_match('#/api/[^a]*#', $requestUri, $m)) {
        $path = $m[0];
    } else {
        $apiPos = strpos($path, '/api/');
        if ($apiPos !== false) {
            $path = substr($path, $apiPos);
        }
    }
}

if (isDebug() && isset($_GET['__debug_global'])) {
    jsonResponse([
        'ok' => true,
        'request_uri' => $requestUri,
        'parsed_path' => $path,
        'script_name' => $_SERVER['SCRIPT_NAME'] ?? null,
        'base_path' => $basePath,
        'host' => $_SERVER['HTTP_HOST'] ?? null
    ]);
}

if (isDebug() && isset($_GET['__debug'])) {
    jsonResponse([
        'ok' => true,
        'request_uri' => $requestUri,
        'parsed_path' => $path,
        'script_name' => $_SERVER['SCRIPT_NAME'] ?? null,
        'base_path' => $basePath
    ]);
}

// ---------- API ----------
if (str_starts_with($path, '/api')) {
    requireToken();

    if ($method === 'GET' && $path === '/api/debug') {
        jsonResponse([
            'ok' => true,
            'debug' => isDebug(),
            'base_path' => $basePath,
            'token_loaded' => apiToken() !== '' ? 'yes' : 'no',
            'mysql_host' => $_ENV['MYSQL_HOST'] ?? null,
            'mysql_db' => $_ENV['MYSQL_DATABASE'] ?? null
        ]);
    }

  if ($method === 'GET' && $path === '/api/horarios') {
    $fecha = $_GET['fecha'] ?? '';
    if ($fecha === '') {
      jsonResponse(['ok' => false, 'error' => 'Fecha requerida'], 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare("
            SELECT h.hora
            FROM horarios_base h
            WHERE h.activo = 1
              AND h.hora NOT IN (
                SELECT hora
                FROM reservas
                WHERE fecha = ?
                  AND LOWER(IFNULL(estado, 'pendiente')) NOT IN ('cancelada', 'cancelado')
              )
              AND h.hora NOT IN (
                SELECT hora FROM bloqueos_horarios WHERE fecha = ?
              )
            ORDER BY h.hora
        ");
    $stmt->execute([$fecha, $fecha]);
    $horarios = $stmt->fetchAll();

    if (isSaturday($fecha)) {
      $horarios = array_values(array_filter($horarios, fn($h) => $h['hora'] < '12:00'));
    }

    jsonResponse(['ok' => true, 'data' => $horarios]);
  }
}
  if ($method === 'GET' && $path === '/api/vehiculo') {
    $matricula = normalizeMatricula($_GET['matricula'] ?? '');
    if (!isValidMatriculaUy($matricula)) {
      jsonResponse(['ok' => false, 'error' => 'Matricula invalida'], 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare("SELECT marca, modelo FROM vehiculos WHERE matricula = ? LIMIT 1");
    $stmt->execute([$matricula]);
    $row = $stmt->fetch() ?:  null;
    jsonResponse(['ok' => true, 'data' => $row]);
  }

  if ($method === 'POST' && $path === '/api/reservas') {
    $data = readJsonBody();

    $required = ['nombre', 'telefono', 'marca', 'modelo', 'matricula', 'tipo_turno', 'fecha', 'hora'];
    foreach ($required as $field) {
      if (empty($data[$field])) {
        jsonResponse(['ok' => false, 'error' => "Campo requerido: {$field}"], 400);
      }
    }

    $cedula = $data['cedula'] ?? '';
    if ($cedula !== '' && !isValidCedulaUy($cedula)) {
      jsonResponse(['ok' => false, 'error' => 'Cedula invalida'], 400);
    }
    $telefono = $data['telefono'] ?? '';
    if (!isValidTelefonoUy($telefono)) {
      jsonResponse(['ok' => false, 'error' => 'Telefono invalido'], 400);
    }
    $telefono = normalizeTelefonoUy($telefono);

    if (!isValidMatriculaUy($data['matricula'] ?? '')) {
      jsonResponse(['ok' => false, 'error' => 'Matricula invalida'], 400);
    }
    $matriculaNorm = normalizeMatricula($data['matricula'] ?? '');

    $tipo = $data['tipo_turno'];
    $garantiaTipo = (string)($data['garantia_tipo'] ?? '');
    $particularTipo = (string)($data['particular_tipo'] ?? '');
    $isService = ($tipo === 'Particular' && $particularTipo === 'Service')
      || ($tipo === 'Garantia' && $garantiaTipo === 'Service');

    $km = preg_replace('/\D+/', '', (string)($data['km'] ?? '')) ?? '';
    if ($isService && $km === '') {
      jsonResponse(['ok' => false, 'error' => 'KM requerido para service'], 400);
    }
    if (!$isService) {
      $km = '';
    }

    $garantiaNumeroService = null;
    if ($tipo === 'Garantia') {
      if ($garantiaTipo === '') {
        jsonResponse(['ok' => false, 'error' => 'Datos de garantia incompletos'], 400);
      }
      if ($garantiaTipo === 'Service') {
        $numeroService = preg_replace('/\D+/', '', (string)($data['garantia_numero_service'] ?? '')) ?? '';
        if ($numeroService === '') {
          jsonResponse(['ok' => false, 'error' => 'Numero de service requerido (solo numerico)'], 400);
        }
        $garantiaNumeroService = $numeroService;
      }
      if (in_array($garantiaTipo, ['Reparacion', 'Reparación'], true) && empty($data['garantia_problema'])) {
        jsonResponse(['ok' => false, 'error' => 'Descripcion del problema requerida'], 400);
      }
    }

    if ($tipo === 'Particular') {
      if ($particularTipo === '') {
        jsonResponse(['ok' => false, 'error' => 'Tipo particular requerido'], 400);
      }
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
      // Validar disponibilidad del horario (lock)
      $stmt = $pdo->prepare("
        SELECT 1
        FROM reservas
        WHERE fecha = ? AND hora = ?
          AND LOWER(IFNULL(estado, 'pendiente')) NOT IN ('cancelada', 'cancelado')
        FOR UPDATE
      ");
      $stmt->execute([$data['fecha'], $data['hora']]);
      $exists = (bool) $stmt->fetch();
      if ($exists) {
        $pdo->rollBack();
        jsonResponse(['ok' => false, 'error' => 'Horario no disponible'], 409);
      }

      // Evitar duplicado de cedula en el mismo dia
      if (!empty($cedula)) {
        $stmt = $pdo->prepare("
          SELECT 1
          FROM reservas
          WHERE fecha = ? AND cedula = ?
            AND LOWER(IFNULL(estado, 'pendiente')) NOT IN ('cancelada', 'cancelado')
          FOR UPDATE
        ");
        $stmt->execute([$data['fecha'], normalizeCedula($cedula)]);
        $dup = (bool) $stmt->fetch();
        if ($dup) {
          $pdo->rollBack();
          jsonResponse(['ok' => false, 'error' => 'La cedula ya tiene una reserva ese dia'], 409);
        }
      }

    $insert = $pdo->prepare("
            INSERT INTO reservas (
              nombre, cedula, telefono,
              marca, modelo, km, matricula,
              tipo_turno, particular_tipo, garantia_tipo,
              garantia_fecha_compra, garantia_numero_service, garantia_problema,
              fecha, hora, detalles
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

    $insert->execute([
      $data['nombre'],
      normalizeCedula($cedula),
      $telefono,
      $data['marca'],
      $data['modelo'],
      $km,
      $matriculaNorm,
      $data['tipo_turno'],
      $particularTipo !== '' ? $particularTipo : null,
      $garantiaTipo !== '' ? $garantiaTipo : null,
      $data['garantia_fecha_compra'] ?? null,
      $garantiaNumeroService,
      $data['garantia_problema'] ?? null,
      $data['fecha'],
      $data['hora'],
      $data['detalles'] ?? ''
    ]);

    $id = (int) $pdo->lastInsertId();

    $pdo->prepare("
            INSERT INTO historial_reservas
            (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
            VALUES (?, 'creacion', '', 'reserva creada', NOW())
        ")->execute([$id]);

    // Guardar/actualizar vehiculo
     $matricula = $matriculaNorm;

    $stmt = $pdo->prepare("SELECT id FROM vehiculos WHERE matricula = ? LIMIT 1");
    $stmt->execute([$matricula]);
    $vehiculo = $stmt->fetch();
    if (!$vehiculo) {
      $pdo->prepare("
                INSERT INTO vehiculos (matricula, marca, modelo, nombre, telefono)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([
            $matricula,
            $data['marca'],
            $data['modelo'],
            $data['nombre'],
            $telefono
          ]);
      $vehiculoId = (int) $pdo->lastInsertId();
    } else {
      $vehiculoId = (int) $vehiculo['id'];
      $pdo->prepare("
                UPDATE vehiculos
                SET marca = ?, modelo = ?, nombre = ?, telefono = ?
                WHERE id = ?
            ")->execute([
            $data['marca'],
            $data['modelo'],
            $data['nombre'],
            $telefono,
            $vehiculoId
          ]);
    }

    $pdo->prepare("
            INSERT INTO vehiculos_historial (
              vehiculo_id, fecha, km, tipo_turno,
              particular_tipo, garantia_tipo, garantia_fecha_compra,
              garantia_numero_service, garantia_problema, detalles
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
          $vehiculoId,
          $data['fecha'],
          $km,
          $data['tipo_turno'],
          $particularTipo !== '' ? $particularTipo : null,
          $garantiaTipo !== '' ? $garantiaTipo : null,
          $data['garantia_fecha_compra'] ?? null,
          $garantiaNumeroService,
          $data['garantia_problema'] ?? null,
          $data['detalles'] ?? ''
        ]);
    $pdo->commit();
    jsonResponse(['ok' => true, 'id' => $id], 201);
  } catch (Throwable $e) {
    if ($pdo->inTransaction()) {
      $pdo->rollBack();
    }
    $msg = isDebug() ? ($e->getMessage() ?: 'Error') : 'No se pudo crear la reserva';
    jsonResponse(['ok' => false, 'error' => $msg], 500);
  }

  jsonResponse(['ok' => false, 'error' => 'Endpoint no encontrado'], 404);
}

// ---------- WEB ----------
$token = apiToken();
?>
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reserva Taller Rosas</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
</head>

<body class="[color-scheme:light]">
  <div class="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50 text-slate-800">
    <div class="max-w-5xl mx-auto px-5 py-10">
      <header class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-emerald-900">Reserva de Turno</h1>
          <p class="text-emerald-700 mt-1">Taller Central Rosas</p>
        </div>
        <span class="px-3 py-1.5 rounded-full border border-emerald-200 text-xs text-emerald-700 bg-white">Online</span>
      </header>

      <div class="rounded-2xl border border-emerald-100 bg-white p-6 md:p-8 shadow-xl" id="stepCalendario">
        <div class="text-sm font-black uppercase tracking-widest text-emerald-600 mb-4">Paso 1 : Elegir fecha y hora</div>
        <div class="grid gap-6 md:grid-cols-[280px_1fr] md:items-start">
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 w-full max-w-sm mx-auto">
            <div class="flex items-center justify-between mb-3">
              <button id="calPrev" type="button"
                class="h-8 w-8 rounded-full border border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400">&lsaquo;</button>
              <div id="calTitle" class="text-sm font-black text-emerald-900"></div>
              <button id="calNext" type="button"
                class="h-8 w-8 rounded-full border border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400">&rsaquo;</button>
            </div>
            <div class="grid grid-cols-7 text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">
              <div class="text-center">Dom</div>
              <div class="text-center">Lun</div>
              <div class="text-center">Mar</div>
              <div class="text-center">Mie</div>
              <div class="text-center">Jue</div>
              <div class="text-center">Vie</div>
              <div class="text-center">Sab</div>
            </div>
            <div id="calGrid" class="grid grid-cols-7 gap-1"></div>
            <input id="fecha" type="hidden" />
            <div id="fechaSeleccion" class="mt-3 text-xs text-emerald-700"></div>
          </div>
          <div class="space-y-3 w-full">
            <div>
              <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Horarios disponibles</label>
              <div id="horarios" class="space-y-2 max-h-64 overflow-auto pr-1"></div>
              <div id="horariosStatus" class="text-xs mt-2 text-emerald-700"></div>
            </div>
            <div class="pt-2">
              <button id="btnContinuar"
                class="bg-emerald-600 text-white font-black tracking-widest uppercase px-6 py-3 rounded-xl shadow-lg shadow-emerald-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled>Continuar</button>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-emerald-100 bg-white p-6 md:p-8 shadow-xl hidden" id="stepFormulario">
  <div class="text-sm font-black uppercase tracking-widest text-emerald-600 mb-4">Paso 2 : Datos del cliente y vehculo</div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Nombre completo</label>
      <input id="nombre" type="text" placeholder="Titular del vehiculo (Nombre y apellido)"
        class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
      <div id="nombreStatus" class="text-xs mt-1"></div>
    </div>
    <div>
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Cedula</label>
      <input id="cedula" type="text" placeholder="1.234.567-8"
        class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
      <div id="cedulaStatus" class="text-xs mt-1"></div>
    </div>
    <div>
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Telefono</label>
      <input id="telefono" type="tel" inputmode="numeric" placeholder="099 111 111"
        class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
      <div id="telefonoStatus" class="text-xs mt-1"></div>
    </div>
    <div>
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Matricula</label>
      <input id="matricula" type="text" placeholder="ABC1234"
        class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
      <div id="matriculaStatus" class="text-xs mt-1"></div>
    </div>
    <div>
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Marca</label>
      <input id="marca" type="text" class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
    </div>
    <div>
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Modelo</label>
      <input id="modelo" type="text" class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
    </div>
  </div>

  <div class="mt-4">
    <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Tipo de Turno</label>
    <input id="tipo_turno" type="hidden" value="" />
    <div class="grid grid-cols-2 gap-3">
      <button type="button" id="btnParticular"
        class="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold uppercase text-xs tracking-widest">Particular</button>
      <button type="button" id="btnGarantia"
        class="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold uppercase text-xs tracking-widest">Garantia</button>
    </div>
  </div>

  <div id="particularBox" class="mt-4 hidden">
    <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Tipo Particular</label>
    <input id="particular_tipo" type="hidden" value="" />
    <div class="grid grid-cols-2 gap-3">
      <button type="button" id="btnParticularService"
        class="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold uppercase text-xs tracking-widest">Service</button>
      <button type="button" id="btnParticularTaller"
        class="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold uppercase text-xs tracking-widest">Taller</button>
    </div>
    <div id="particularDetallesBox" class="mt-4 hidden">
      <input id="detalles" type="text" placeholder="Detalles (si es Taller)"
        class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
    </div>
  </div>

  <div id="garantiaBox" class="mt-4 hidden">
    <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Garantia</label>
    <input id="garantia_tipo" type="hidden" value="" />
    <div class="grid grid-cols-2 gap-3">
      <button type="button" id="btnGarantiaReparacion"
        class="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold uppercase text-xs tracking-widest">Reparacion</button>
      <button type="button" id="btnGarantiaService"
        class="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold uppercase text-xs tracking-widest">Service</button>
    </div>
    <div id="garantiaProblemaBox" class="mt-4 hidden">
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Descripcion del problema</label>
      <input id="garantia_problema" type="text" placeholder="Descripcion del problema"
        class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
    </div>
  </div>

  <div id="serviceDataRow" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 hidden">
    <div id="garantiaNumeroServiceBox" class="hidden">
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">Numero de service</label>
      <input id="garantia_numero_service" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Numero de service"
        class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
    </div>
    <div id="kmBox" class="hidden">
      <label class="block text-[10px] uppercase tracking-widest text-emerald-700 font-black mb-2">KM</label>
      <input id="km" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Ej: 45000"
        class="w-full rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900" />
    </div>
  </div>

  <div class="mt-6 flex flex-wrap gap-3">
    <button id="btnVolver"
      class="border border-emerald-200 text-emerald-700 font-black tracking-widest uppercase px-6 py-3 rounded-xl">Volver</button>
    <button id="btnReservar"
      class="bg-emerald-600 text-white font-black tracking-widest uppercase px-6 py-3 rounded-xl shadow-lg shadow-emerald-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled>Confirmar Reserva</button>
  </div>
  <div id="successBanner" class="hidden mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-semibold">
    Reserva confirmada correctamente.
  </div>
  <div id="formStatus" class="text-xs mt-2"></div>
</div>
    </div>
  </div>
  <a id="btnWhatsapp"
    class="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-emerald-500 text-white shadow-xl flex items-center justify-center text-xl"
    target="_blank" href="https://wa.me/" aria-label="WhatsApp">
    <svg viewBox="0 0 32 32" class="h-6 w-6 fill-current" aria-hidden="true">
      <path d="M19.11 17.2c-.27-.13-1.62-.8-1.87-.89-.25-.09-.44-.13-.62.13-.18.27-.71.89-.88 1.07-.16.18-.32.2-.6.07-.27-.13-1.15-.43-2.2-1.36-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.41.12-.55.12-.12.27-.32.4-.48.13-.16.18-.27.27-.45.09-.18.04-.33-.02-.46-.07-.13-.62-1.5-.85-2.06-.22-.53-.45-.46-.62-.47l-.53-.01c-.18 0-.46.07-.71.33-.25.27-.93.91-.93 2.22 0 1.31.96 2.58 1.09 2.75.13.18 1.88 2.87 4.56 4.03.64.28 1.14.45 1.53.58.64.2 1.22.17 1.68.1.51-.08 1.62-.66 1.85-1.29.23-.64.23-1.18.16-1.29-.07-.11-.25-.18-.53-.31zM16.02 5.5c-5.77 0-10.46 4.7-10.46 10.46 0 1.85.5 3.65 1.45 5.22L5.5 26.5l5.5-1.43a10.43 10.43 0 0 0 5.02 1.27c5.77 0 10.46-4.7 10.46-10.46S21.8 5.5 16.02 5.5zm0 19.1c-1.64 0-3.24-.44-4.65-1.27l-.33-.2-3.26.85.87-3.18-.21-.33a8.36 8.36 0 0 1-1.32-4.54c0-4.62 3.75-8.37 8.37-8.37 4.62 0 8.37 3.75 8.37 8.37 0 4.62-3.75 8.37-8.37 8.37z"/>
    </svg>
  </a>
    <script>
    const API_TOKEN = <?php echo json_encode($token); ?>;
    const BASE_PATH = <?php echo json_encode($basePath); ?>;
    const API_BASE = (BASE_PATH === '/' ? '' : BASE_PATH);
    const API_ORIGIN = window.location.origin + API_BASE;
    const $ = (id) => document.getElementById(id);

    const fecha = $('fecha');
    const calPrev = $('calPrev');
    const calNext = $('calNext');
    const calTitle = $('calTitle');
    const calGrid = $('calGrid');
    const fechaSeleccion = $('fechaSeleccion');
    const horariosEl = $('horarios');
    const horariosStatus = $('horariosStatus');
    const btnReservar = $('btnReservar');
    const btnContinuar = $('btnContinuar');
    const btnVolver = $('btnVolver');
    const stepCalendario = $('stepCalendario');
    const stepFormulario = $('stepFormulario');
    const formStatus = $('formStatus');
    const tipoTurno = $('tipo_turno');
    const particularBox = $('particularBox');
    const garantiaBox = $('garantiaBox');
    const particularTipo = $('particular_tipo');
    const particularDetallesBox = $('particularDetallesBox');
    const successBanner = $('successBanner');
    const detalles = $('detalles');
    const cedula = $('cedula');
    const cedulaStatus = $('cedulaStatus');
    const nombreStatus = $('nombreStatus');
    const matricula = $('matricula');
    const matriculaStatus = $('matriculaStatus');
    const marca = $('marca');
    const modelo = $('modelo');
    const telefono = $('telefono');
    const telefonoStatus = $('telefonoStatus');
    const btnWhatsapp = $('btnWhatsapp');
    const btnParticular = $('btnParticular');
    const btnGarantia = $('btnGarantia');
    const btnParticularService = $('btnParticularService');
    const btnParticularTaller = $('btnParticularTaller');
    const btnGarantiaReparacion = $('btnGarantiaReparacion');
    const btnGarantiaService = $('btnGarantiaService');
    const garantiaNumeroService = $('garantia_numero_service');
    const garantiaProblema = $('garantia_problema');
    const garantiaNumeroServiceBox = $('garantiaNumeroServiceBox');
    const garantiaProblemaBox = $('garantiaProblemaBox');
    const serviceDataRow = $('serviceDataRow');
    const kmBox = $('kmBox');
    const kmInput = $('km');

    let horaSeleccionada = '';
    let ultimoLookupMatricula = '';
    let calendarioMes = new Date();
    calendarioMes.setDate(1);
    const availabilityCache = {};
    let cargandoDisponibilidad = false;
    let lastDisponibilidadKey = '';

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 21);

    function formatFechaISO(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function getMinutesFromHora(label) {
      const raw = String(label).trim().toLowerCase();
      const match = raw.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
      if (!match) return null;
      let h = Number(match[1]);
      const m = Number(match[2]);
      const ampm = match[3];
      if (ampm) {
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
      }
      return h * 60 + m;
    }

    function formatFechaLarga(d) {
      return `${d.getDate()} de ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }

    function esDomingo(d) {
      return d.getDay() === 0;
    }

    function estaEnRango(d) {
      return d >= today && d <= maxDate;
    }

    async function cargarDisponibilidadMes(year, month) {
      if (cargandoDisponibilidad) return;
      cargandoDisponibilidad = true;
      try {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        for (let day = 1; day <= end.getDate(); day++) {
          const d = new Date(year, month, day);
          if (!estaEnRango(d) || esDomingo(d)) {
            availabilityCache[formatFechaISO(d)] = false;
            continue;
          }
          const iso = formatFechaISO(d);
          if (availabilityCache[iso] !== undefined) continue;
          try {
            const res = await fetch(`${API_ORIGIN}/api/horarios?fecha=${iso}${API_TOKEN ? `&token=${encodeURIComponent(API_TOKEN)}` : ''}`, {
              headers: API_TOKEN ? { 'X-API-KEY': API_TOKEN } : {}
            });
            const json = await res.json();
            availabilityCache[iso] = !!(json && json.ok && Array.isArray(json.data) && json.data.length);
          } catch {
            availabilityCache[iso] = false;
          }
        }
      } finally {
        cargandoDisponibilidad = false;
        renderCalendar();
      }
    }

    function renderCalendar() {
      const year = calendarioMes.getFullYear();
      const month = calendarioMes.getMonth();
      calTitle.textContent = `${monthNames[month]} ${year}`;
      calGrid.innerHTML = '';
      const first = new Date(year, month, 1);
      const startDay = first.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'h-9 w-9';
        calGrid.appendChild(empty);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const iso = formatFechaISO(d);
        const isDisabled = esDomingo(d) || !estaEnRango(d) || availabilityCache[iso] === false;
        const isSelected = fecha.value === iso;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = day;
        btn.className = `h-9 w-9 rounded-full text-sm font-bold ${
          isSelected
            ? 'bg-emerald-600 text-white'
            : 'bg-white text-emerald-900 border border-emerald-100 hover:border-emerald-400'
        }`;
        if (isDisabled) {
          btn.className = 'h-9 w-9 rounded-full text-sm font-bold text-slate-300 bg-transparent border border-transparent cursor-not-allowed';
          btn.disabled = true;
        } else {
          btn.onclick = () => {
            fecha.value = iso;
            fechaSeleccion.textContent = `Fecha seleccionada: ${formatFechaLarga(d)}`;
            renderCalendar();
            fetchHorarios();
          };
        }
        calGrid.appendChild(btn);
      }

      const key = `${year}-${month}`;
      if (lastDisponibilidadKey !== key) {
        lastDisponibilidadKey = key;
        cargarDisponibilidadMes(year, month);
      }
    }

    function setStatus(el, text, ok = true) {
      el.textContent = text;
      el.className = ok ? 'text-xs mt-1 text-emerald-600' : 'text-xs mt-1 text-rose-600';
    }

    async function fetchHorarios() {
      horariosEl.innerHTML = '';
      horaSeleccionada = '';
      btnReservar.disabled = true;
      if (!fecha.value) {
        horariosStatus.textContent = '';
        return;
      }
      horariosStatus.textContent = 'Cargando...';
      try {
        const res = await fetch(`${API_ORIGIN}/api/horarios?fecha=${fecha.value}${API_TOKEN ? `&token=${encodeURIComponent(API_TOKEN)}` : ''}`, {
          headers: API_TOKEN ? { 'X-API-KEY': API_TOKEN } : {}
        });
        const json = await res.json();
        if (!res.ok && res.status === 401) {
          setStatus(horariosStatus, 'Token invalido o faltante', false);
          return;
        }
        if (!json.ok) throw new Error(json.error || 'Error');
        let data = json.data || [];
        const hoyIso = formatFechaISO(new Date());
        if (fecha.value === hoyIso) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          data = data.filter(h => {
            const mins = getMinutesFromHora(h.hora);
            return mins === null ? true : mins >= nowMinutes;
          });
        }
        horariosStatus.textContent = data.length ? '' : 'Sin horarios disponibles';
        data.forEach(h => {
          const btn = document.createElement('button');
          btn.className = 'w-full text-left px-4 py-2 rounded-lg border border-emerald-200 bg-white text-emerald-900 text-sm font-bold hover:border-emerald-500';
          btn.textContent = h.hora;
          btn.onclick = () => {
            horaSeleccionada = h.hora;
            document.querySelectorAll('#horarios button').forEach(b => b.classList.remove('border-emerald-500', 'text-emerald-900', 'bg-emerald-100'));
            btn.classList.add('border-emerald-500', 'text-emerald-900', 'bg-emerald-100');
            validarForm();
          };
          horariosEl.appendChild(btn);
        });
      } catch (e) {
        setStatus(horariosStatus, 'Error al cargar horarios', false);
      }
    }

    function validarCedulaUY(value) {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 8) return false;
      const padded = digits.padStart(8, '0').split('').map(d => parseInt(d, 10));
      const weights = [2, 9, 8, 7, 6, 3, 4];
      let sum = 0;
      for (let i = 0; i < 7; i++) sum += padded[i] * weights[i];
      const check = (10 - (sum % 10)) % 10;
      return check === padded[7];
    }

    function validarNombreCompleto(value) {
      const parts = value.trim().split(/\s+/).filter(Boolean);
      return parts.length >= 2;
    }

    function normalizarTelefonoUy(value) {
      let digits = value.replace(/\\D/g, '');
      if (digits.length === 0) {
        return { formatted: '', local: '' };
      }
      if (digits.startsWith('598')) {
        digits = digits.slice(3);
      }
      if (digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      if (digits.startsWith('9')) {
        digits = digits.slice(1);
      }
      const local = `09${digits}`.slice(0, 9);
      return { formatted: local, local };
    }

    function telefonoValido(value) {
      return /^0\d{8}$/.test(value.trim());
    }

    function normalizarMatricula(value) {
      return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    function matriculaValida(value) {
      return /^[A-Z]{3}\d{3,4}$/.test(normalizarMatricula(value));
    }

    function setActive(btn, group) {
      group.forEach(b => b.classList.remove('border-emerald-500', 'bg-emerald-100', 'text-emerald-900'));
      btn.classList.add('border-emerald-500', 'bg-emerald-100', 'text-emerald-900');
    }

    function validarForm() {
      const required = [$('nombre').value, telefono.value, marca.value, modelo.value, matricula.value, fecha.value, horaSeleccionada, tipoTurno.value];
      const okBase = required.every(v => String(v).trim() !== '');

      const ciOk = cedula.value.trim() === '' ? true : validarCedulaUY(cedula.value);
      if (!ciOk) {
        setStatus(cedulaStatus, 'Cedula invalida', false);
      } else {
        cedulaStatus.textContent = '';
      }

      const nombreOk = validarNombreCompleto($('nombre').value);
      if (!nombreOk) {
        setStatus(nombreStatus, 'Ingresa nombre y apellido', false);
      } else {
        nombreStatus.textContent = '';
      }

      const telOk = telefonoValido(telefono.value);
      if (!telOk) {
        setStatus(telefonoStatus, 'Formato valido: 099111111', false);
      } else {
        telefonoStatus.textContent = '';
      }

      const matOk = matriculaValida(matricula.value);
      if (!matOk) {
        setStatus(matriculaStatus, 'Formato: 3 letras + 3/4 numeros', false);
      } else if (matriculaStatus.textContent === '') {
        setStatus(matriculaStatus, 'Matricula valida', true);
      }

      const garantiaOk = tipoTurno.value !== 'Garantia'
        ? true
        : (
          $('garantia_tipo').value !== '' && (
            $('garantia_tipo').value === 'Service'
              ? /^\d+$/.test(garantiaNumeroService.value.trim())
              : garantiaProblema.value.trim() !== ''
          )
        );

      const particularOk = tipoTurno.value !== 'Particular'
        ? true
        : ($('particular_tipo').value === 'Service' ? true : detalles.value.trim() !== '');

      const kmOk = kmInput.disabled ? true : /^\d+$/.test(kmInput.value.trim());

      btnReservar.disabled = !(okBase && ciOk && nombreOk && telOk && matOk && garantiaOk && particularOk && kmOk);
      btnContinuar.disabled = !fecha.value || !horaSeleccionada;
    }

    async function buscarVehiculo() {
      const mat = normalizarMatricula(matricula.value);
      if (!matriculaValida(mat)) return;
      if (mat === ultimoLookupMatricula) return;
      ultimoLookupMatricula = mat;
      try {
        const res = await fetch(`${API_ORIGIN}/api/vehiculo?matricula=${encodeURIComponent(mat)}${API_TOKEN ? `&token=${encodeURIComponent(API_TOKEN)}` : ''}`, {
          headers: API_TOKEN ? { 'X-API-KEY': API_TOKEN } : {}
        });
        const json = await res.json();
        if (json.ok && json.data) {
          marca.value = json.data.marca || marca.value;
          modelo.value = json.data.modelo || modelo.value;
          setStatus(matriculaStatus, 'Vehiculo encontrado', true);
        } else {
          setStatus(matriculaStatus, 'Vehiculo no registrado', true);
        }
      } catch { }
    }

    function toggleDetallesParticular() {
      const esService = particularTipo.value === 'Service';
      particularDetallesBox.classList.toggle('hidden', esService);
      detalles.disabled = esService;
      if (esService) {
        detalles.value = '';
      }
    }

    function toggleGarantiaInputs() {
      const esService = $('garantia_tipo').value === 'Service';
      garantiaProblemaBox.classList.toggle('hidden', esService);
      garantiaProblema.disabled = esService;
      if (esService) {
        garantiaProblema.value = '';
      } else {
        garantiaNumeroService.value = '';
      }
    }

    function toggleKmInput() {
      const isParticularService = tipoTurno.value === 'Particular' && particularTipo.value === 'Service';
      const isGarantiaService = tipoTurno.value === 'Garantia' && $('garantia_tipo').value === 'Service';
      const showNumeroService = isGarantiaService;
      const showKm = isParticularService || isGarantiaService;

      serviceDataRow.classList.toggle('hidden', !(showNumeroService || showKm));
      garantiaNumeroServiceBox.classList.toggle('hidden', !showNumeroService);
      garantiaNumeroService.disabled = !showNumeroService;
      kmBox.classList.toggle('hidden', !showKm);
      kmInput.disabled = !showKm;

      kmBox.classList.toggle('md:col-span-2', showKm && !showNumeroService);
      garantiaNumeroServiceBox.classList.remove('md:col-span-2');

      if (!showNumeroService) {
        garantiaNumeroService.value = '';
      }
      if (!showKm) {
        kmInput.value = '';
      }
    }

    async function generarPdfReserva(payload) {
      if (!window.jspdf) return;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);

      const colors = {
        greenDark: [5, 120, 90],
        greenSoft: [236, 253, 245],
        text: [0, 0, 0],
        muted: [0, 0, 0]
      };

      const drawHeader = () => {
        doc.setFillColor(...colors.greenDark);
        doc.rect(0, 0, pageWidth, 42, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Taller Rosas', 36, 18);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Comprobante de Reserva', 36, 26);
        doc.setFontSize(9);
        doc.text('Servicio automotriz', 36, 32);
      };

      const drawCard = (x, y, w, h, label, value) => {
        doc.setFillColor(...colors.greenSoft);
        doc.setDrawColor(209, 250, 229);
        doc.roundedRect(x, y, w, h, 2, 2, 'FD');
        doc.setTextColor(...colors.muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(label.toUpperCase(), x + 3, y + 5);
        doc.setTextColor(...colors.text);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(String(value || '-'), x + 3, y + 10);
      };

      drawHeader();

      let y = 50;
      const gap = 4;
      const colWidth = (contentWidth - gap) / 2;
      const cardH = 14;

      drawCard(margin, y, colWidth, cardH, 'Cliente', payload.nombre);
      drawCard(margin + colWidth + gap, y, colWidth, cardH, 'Telefono', payload.telefono);
      y += cardH + gap;

      drawCard(margin, y, colWidth, cardH, 'Fecha', payload.fecha);
      drawCard(margin + colWidth + gap, y, colWidth, cardH, 'Hora', payload.hora);
      y += cardH + gap;

      drawCard(margin, y, colWidth, cardH, 'Matricula', payload.matricula);
      drawCard(margin + colWidth + gap, y, colWidth, cardH, 'Vehiculo', `${payload.marca} ${payload.modelo}`.trim());
      y += cardH + gap;

      if (payload.km) {
        drawCard(margin, y, colWidth, cardH, 'KM', payload.km);
      }
      drawCard(margin + colWidth + gap, y, colWidth, cardH, 'Turno', `${payload.tipo_turno}${payload.particular_tipo ? ' - ' + payload.particular_tipo : ''}`);
      y += cardH + gap;

      if (payload.tipo_turno === 'Garantia') {
        drawCard(margin, y, colWidth, cardH, 'Garantia', payload.garantia_tipo || '-');
        if (payload.garantia_numero_service) {
          drawCard(margin + colWidth + gap, y, colWidth, cardH, 'Numero de service', payload.garantia_numero_service);
          y += cardH + gap;
        } else if (payload.garantia_problema) {
          drawCard(margin + colWidth + gap, y, colWidth, cardH, 'Motivo', 'Reparacion');
          y += cardH + gap;
        } else {
          y += cardH + gap;
        }
      }

      if (payload.garantia_problema || payload.detalles) {
        const detailText = payload.garantia_problema || payload.detalles;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');
        doc.setTextColor(...colors.muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('DETALLE', margin + 3, y + 5);
        doc.setTextColor(...colors.text);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const wrapped = doc.splitTextToSize(String(detailText), contentWidth - 6);
        doc.text(wrapped, margin + 3, y + 10);
        y += 24;
      }

      doc.setTextColor(...colors.muted);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('Gracias por confiar en Taller Rosas', margin, 286);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - margin, 286, { align: 'right' });

      const file = `reserva-${payload.fecha}-${payload.matricula}.pdf`;
      doc.save(file.replace(/\s+/g, ''));
    }

    async function enviarReserva() {
      formStatus.textContent = 'Enviando...';

      const payload = {
        nombre: $('nombre').value.trim(),
        cedula: cedula.value.trim(),
        telefono: normalizarTelefonoUy(telefono.value).local,
        marca: marca.value.trim(),
        modelo: modelo.value.trim(),
        km: kmInput.disabled ? '' : kmInput.value.replace(/\D/g, '').trim(),
        matricula: normalizarMatricula(matricula.value.trim()),
        tipo_turno: tipoTurno.value,
        particular_tipo: tipoTurno.value === 'Particular' ? particularTipo.value : null,
        garantia_tipo: tipoTurno.value === 'Garantia' ? $('garantia_tipo').value : null,
        garantia_numero_service: tipoTurno.value === 'Garantia' ? $('garantia_numero_service').value : null,
        garantia_problema: tipoTurno.value === 'Garantia' ? $('garantia_problema').value : null,
        fecha: fecha.value,
        hora: horaSeleccionada,
        detalles: particularTipo.value === 'Service' ? '' : detalles.value.trim()
      };

      try {
        const res = await fetch(`${API_ORIGIN}/api/reservas${API_TOKEN ? `?token=${encodeURIComponent(API_TOKEN)}` : ''}`, {
          method: 'POST',
          headers: API_TOKEN ? { 'Content-Type': 'application/json', 'X-API-KEY': API_TOKEN } : { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Error');
        setStatus(formStatus, 'Reserva creada con exito', true);
        successBanner.classList.remove('hidden');
        try {
          await generarPdfReserva(payload);
        } catch (pdfError) {
          console.error('No se pudo generar el comprobante:', pdfError);
        }
        fetchHorarios();
      } catch (e) {
        setStatus(formStatus, e.message || 'Error al crear reserva', false);
      }
    }

    function setFechaInicial() {
      let d = new Date();
      while (esDomingo(d)) {
        d.setDate(d.getDate() + 1);
      }
      fecha.value = formatFechaISO(d);
      fechaSeleccion.textContent = `Fecha seleccionada: ${formatFechaLarga(d)}`;
      calendarioMes = new Date(d.getFullYear(), d.getMonth(), 1);
      renderCalendar();
      fetchHorarios();
    }

    calPrev.addEventListener('click', () => {
      calendarioMes.setMonth(calendarioMes.getMonth() - 1);
      renderCalendar();
    });
    calNext.addEventListener('click', () => {
      calendarioMes.setMonth(calendarioMes.getMonth() + 1);
      renderCalendar();
    });

    setFechaInicial();

    ['nombre', 'marca', 'modelo', 'km'].forEach(id => {
      $(id).addEventListener('input', validarForm);
    });
    kmInput.addEventListener('input', () => {
      kmInput.value = kmInput.value.replace(/\D/g, '');
      validarForm();
    });
    garantiaNumeroService.addEventListener('input', () => {
      garantiaNumeroService.value = garantiaNumeroService.value.replace(/\D/g, '');
      validarForm();
    });
    garantiaProblema.addEventListener('input', validarForm);
    cedula.addEventListener('input', validarForm);

    matricula.addEventListener('blur', buscarVehiculo);
    matricula.addEventListener('input', () => {
      const normalized = normalizarMatricula(matricula.value).slice(0, 7);
      matricula.value = normalized;
      if (matriculaValida(normalized)) {
        buscarVehiculo();
      }
      validarForm();
    });

    telefono.addEventListener('input', () => {
      const { formatted } = normalizarTelefonoUy(telefono.value);
      telefono.value = formatted;
      const t = telefono.value.replace(/\D/g, '');
      btnWhatsapp.href = t ? `https://wa.me/${t}` : 'https://wa.me/';
      validarForm();
    });

    btnParticular.addEventListener('click', () => {
      tipoTurno.value = 'Particular';
      setActive(btnParticular, [btnParticular, btnGarantia]);
      particularBox.classList.remove('hidden');
      garantiaBox.classList.add('hidden');
      toggleKmInput();
      validarForm();
    });
    btnGarantia.addEventListener('click', () => {
      tipoTurno.value = 'Garantia';
      setActive(btnGarantia, [btnParticular, btnGarantia]);
      garantiaBox.classList.remove('hidden');
      particularBox.classList.add('hidden');
      toggleKmInput();
      validarForm();
    });

    btnParticularService.addEventListener('click', () => {
      particularTipo.value = 'Service';
      setActive(btnParticularService, [btnParticularService, btnParticularTaller]);
      toggleDetallesParticular();
      toggleKmInput();
      validarForm();
    });
    btnParticularTaller.addEventListener('click', () => {
      particularTipo.value = 'Taller';
      setActive(btnParticularTaller, [btnParticularService, btnParticularTaller]);
      toggleDetallesParticular();
      toggleKmInput();
      validarForm();
    });

    btnGarantiaReparacion.addEventListener('click', () => {
      $('garantia_tipo').value = 'Reparacion';
      setActive(btnGarantiaReparacion, [btnGarantiaReparacion, btnGarantiaService]);
      toggleGarantiaInputs();
      toggleKmInput();
      validarForm();
    });
    btnGarantiaService.addEventListener('click', () => {
      $('garantia_tipo').value = 'Service';
      setActive(btnGarantiaService, [btnGarantiaReparacion, btnGarantiaService]);
      toggleGarantiaInputs();
      toggleKmInput();
      validarForm();
    });

    btnReservar.addEventListener('click', enviarReserva);
    btnContinuar.addEventListener('click', () => {
      if (btnContinuar.disabled) return;
      stepCalendario.classList.add('hidden');
      stepFormulario.classList.remove('hidden');
    });
    btnVolver.addEventListener('click', () => {
      stepFormulario.classList.add('hidden');
      stepCalendario.classList.remove('hidden');
    });

    btnWhatsapp.href = 'https://wa.me/59894860496';
    toggleDetallesParticular();
    toggleGarantiaInputs();
    toggleKmInput();
    btnParticular.click();
    btnParticularService.click();
  </script>
</body>

</html>

















































