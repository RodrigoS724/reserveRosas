<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// CORS básico (ajustar en producción)
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
                SELECT hora FROM reservas WHERE fecha = ?
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

  if ($method === 'GET' && $path === '/api/vehiculo') {
    $matricula = normalizeMatricula($_GET['matricula'] ?? '');
    if ($matricula === '') {
      jsonResponse(['ok' => false, 'error' => 'Matrícula requerida'], 400);
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
      jsonResponse(['ok' => false, 'error' => 'Cédula inválida'], 400);
    }

    $tipo = $data['tipo_turno'];
    if ($tipo === 'Garantía') {
      if (empty($data['garantia_tipo']) || empty($data['garantia_fecha_compra'])) {
        jsonResponse(['ok' => false, 'error' => 'Datos de garantía incompletos'], 400);
      }
      if ($data['garantia_tipo'] === 'Service' && empty($data['garantia_numero_service'])) {
        jsonResponse(['ok' => false, 'error' => 'Número de service requerido'], 400);
      }
      if ($data['garantia_tipo'] === 'Reparación' && empty($data['garantia_problema'])) {
        jsonResponse(['ok' => false, 'error' => 'Descripción del problema requerida'], 400);
      }
    }

    if ($tipo === 'Particular') {
      if (empty($data['particular_tipo'])) {
        jsonResponse(['ok' => false, 'error' => 'Tipo particular requerido'], 400);
      }
    }

    $pdo = db();

    // Validar disponibilidad del horario
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM reservas WHERE fecha = ? AND hora = ?");
    $stmt->execute([$data['fecha'], $data['hora']]);
    $exists = (int) ($stmt->fetch()['total'] ?? 0) > 0;
    if ($exists) {
      jsonResponse(['ok' => false, 'error' => 'Horario no disponible'], 409);
    }

    // Evitar duplicado de cédula en el mismo día
    if (!empty($cedula)) {
      $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM reservas WHERE fecha = ? AND cedula = ?");
      $stmt->execute([$data['fecha'], normalizeCedula($cedula)]);
      $dup = (int) ($stmt->fetch()['total'] ?? 0) > 0;
      if ($dup) {
        jsonResponse(['ok' => false, 'error' => 'La cédula ya tiene una reserva ese día'], 409);
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
      $data['telefono'],
      $data['marca'],
      $data['modelo'],
      $data['km'] ?? '',
      normalizeMatricula($data['matricula']),
      $data['tipo_turno'],
      $data['particular_tipo'] ?? null,
      $data['garantia_tipo'] ?? null,
      $data['garantia_fecha_compra'] ?? null,
      $data['garantia_numero_service'] ?? null,
      $data['garantia_problema'] ?? null,
      $data['fecha'],
      $data['hora'],
      $data['detalles'] ?? ''
    ]);

    $id = (int) $pdo->lastInsertId();

    $pdo->prepare("
            INSERT INTO historial_reservas
            (reserva_id, campo, valor_anterior, valor_nuevo, fecha)
            VALUES (?, 'creación', '', 'reserva creada', NOW())
        ")->execute([$id]);

    // Guardar/actualizar vehiculo
    $matricula = normalizeMatricula($data['matricula']);
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
            $data['telefono']
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
            $data['telefono'],
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
          $data['km'] ?? '',
          $data['tipo_turno'],
          $data['particular_tipo'] ?? null,
          $data['garantia_tipo'] ?? null,
          $data['garantia_fecha_compra'] ?? null,
          $data['garantia_numero_service'] ?? null,
          $data['garantia_problema'] ?? null,
          $data['detalles'] ?? ''
        ]);

    jsonResponse(['ok' => true, 'id' => $id], 201);
  }

  jsonResponse(['ok' => false, 'error' => 'Endpoint no encontrado'], 404);
}

// ---------- WEB ----------
$token = apiToken();

a>
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reserva Taller Rosas</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="[color-scheme:dark]">
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
    <div class="max-w-5xl mx-auto px-5 py-10">
      <header class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight">Reserva de Turno</h1>
          <p class="text-slate-400 mt-1">Taller Central Rosas</p>
        </div>
        <span class="px-3 py-1.5 rounded-full border border-slate-700 text-xs text-slate-300">Online</span>
      </header>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 shadow-2xl" id="stepCalendario">
        <div class="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Paso 1 · Elegir fecha y hora</div>
        <div class="space-y-4">
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Fecha</label>
            <input id="fecha" type="date"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Horarios
              disponibles</label>
            <div id="horarios" class="grid grid-cols-3 md:grid-cols-4 gap-2"></div>
            <div id="horariosStatus" class="text-xs mt-2 text-slate-400"></div>
          </div>
          <div class="pt-2">
            <button id="btnContinuar"
              class="bg-blue-600 text-white font-black tracking-widest uppercase px-6 py-3 rounded-xl shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled>Continuar</button>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 shadow-2xl hidden" id="stepFormulario">
        <div class="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Paso 2 · Datos del cliente y
          vehículo</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Nombre
              completo</label>
            <input id="nombre" type="text" placeholder="Ej: Juan Pérez"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Cédula</label>
            <input id="cedula" type="text" placeholder="1.234.567-8"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
            <div id="cedulaStatus" class="text-xs mt-1"></div>
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Teléfono</label>
            <input id="telefono" type="tel" placeholder="099 123 456"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Matrícula</label>
            <input id="matricula" type="text" placeholder="ABC 1234"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Marca</label>
            <input id="marca" type="text" class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Modelo</label>
            <input id="modelo" type="text" class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">KM</label>
            <input id="km" type="number" class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Tipo de
              Turno</label>
            <select id="tipo_turno" class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100">
              <option value="Particular">Particular</option>
              <option value="Garantía">Garantía</option>
            </select>
          </div>
        </div>

        <div id="particularBox" class="mt-4">
          <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Tipo
            Particular</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select id="particular_tipo" class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100">
              <option value="Service">Service</option>
              <option value="Taller">Taller</option>
            </select>
            <input id="detalles" type="text" placeholder="Detalles (si es Taller)"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
        </div>

        <div id="garantiaBox" class="mt-4 hidden">
          <label class="block text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">Garantía</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select id="garantia_tipo" class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100">
              <option value="Reparación">Reparación</option>
              <option value="Service">Service</option>
            </select>
            <input id="garantia_fecha" type="date"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <input id="garantia_numero_service" type="text" placeholder="Número de service"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
            <input id="garantia_problema" type="text" placeholder="Descripción del problema"
              class="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100" />
          </div>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <button id="btnVolver"
            class="border border-slate-700 text-slate-200 font-black tracking-widest uppercase px-6 py-3 rounded-xl">Volver</button>
          <button id="btnReservar"
            class="bg-blue-600 text-white font-black tracking-widest uppercase px-6 py-3 rounded-xl shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled>Confirmar Reserva</button>
          <a id="btnWhatsapp"
            class="border border-slate-700 text-slate-200 font-black tracking-widest uppercase px-6 py-3 rounded-xl"
            target="_blank" href="#">Escribir por WP</a>
        </div>
        <div id="successBanner" class="hidden mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-semibold">
          Reserva confirmada correctamente.
        </div>
        <div id="formStatus" class="text-xs mt-2"></div>
      </div>
    </div>
  </div>

  <script>
    const API_TOKEN = <?php echo json_encode($token); ?>;
    const BASE_PATH = <?php echo json_encode($basePath); ?>;
    const API_BASE = (BASE_PATH === '/' ? '' : BASE_PATH);
    const API_ORIGIN = window.location.origin + API_BASE;
    const $ = (id) => document.getElementById(id);

    const fecha = $('fecha');
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
    const successBanner = $('successBanner');
    const detalles = $('detalles');
    const cedula = $('cedula');
    const cedulaStatus = $('cedulaStatus');
    const matricula = $('matricula');
    const marca = $('marca');
    const modelo = $('modelo');
    const telefono = $('telefono');
    const btnWhatsapp = $('btnWhatsapp');

    let horaSeleccionada = '';

    function setStatus(el, text, ok = true) {
      el.textContent = text;
      el.className = ok ? 'text-xs mt-1 text-emerald-400' : 'text-xs mt-1 text-rose-400';
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
          setStatus(horariosStatus, 'Token inválido o faltante', false);
          return;
        }
        if (!json.ok) throw new Error(json.error || 'Error');
        const data = json.data || [];
        horariosStatus.textContent = data.length ? '' : 'Sin horarios disponibles';
        data.forEach(h => {
          const btn = document.createElement('button');
          btn.className = 'px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm font-bold hover:border-blue-500/60';
          btn.textContent = h.hora;
          btn.onclick = () => {
            horaSeleccionada = h.hora;
            document.querySelectorAll('#horarios button').forEach(b => b.classList.remove('border-blue-500', 'text-blue-200', 'bg-blue-500/10'));
            btn.classList.add('border-blue-500', 'text-blue-200', 'bg-blue-500/10');
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

    function validarForm() {
      const required = [$('nombre').value, telefono.value, marca.value, modelo.value, matricula.value, fecha.value, horaSeleccionada];
      const okBase = required.every(v => String(v).trim() !== '');

      const ciOk = cedula.value.trim() === '' ? true : validarCedulaUY(cedula.value);
      if (!ciOk) {
        setStatus(cedulaStatus, 'Cédula inválida', false);
      } else {
        cedulaStatus.textContent = '';
      }

      btnReservar.disabled = !(okBase && ciOk);
      btnContinuar.disabled = !fecha.value || !horaSeleccionada;
    }

    async function buscarVehiculo() {
      const mat = matricula.value.trim();
      if (mat.length < 4) return;
      try {
        const res = await fetch(`${API_ORIGIN}/api/vehiculo?matricula=${encodeURIComponent(mat)}${API_TOKEN ? `&token=${encodeURIComponent(API_TOKEN)}` : ''}`, {
          headers: API_TOKEN ? { 'X-API-KEY': API_TOKEN } : {}
        });
        const json = await res.json();
        if (json.ok && json.data) {
          marca.value = json.data.marca || marca.value;
          modelo.value = json.data.modelo || modelo.value;
        }
      } catch { }
    }

    function toggleDetallesParticular() {
      const esService = particularTipo.value === 'Service';
      detalles.classList.toggle('hidden', esService);
      detalles.disabled = esService;
      if (esService) {
        detalles.value = '';
      }
    }

    async function enviarReserva() {
      formStatus.textContent = 'Enviando...';

      const payload = {
        nombre: $('nombre').value.trim(),
        cedula: cedula.value.trim(),
        telefono: telefono.value.trim(),
        marca: marca.value.trim(),
        modelo: modelo.value.trim(),
        km: $('km').value.trim(),
        matricula: matricula.value.trim(),
        tipo_turno: tipoTurno.value,
        particular_tipo: tipoTurno.value === 'Particular' ? particularTipo.value : null,
        garantia_tipo: tipoTurno.value === 'Garantía' ? $('garantia_tipo').value : null,
        garantia_fecha_compra: tipoTurno.value === 'Garantía' ? $('garantia_fecha').value : null,
        garantia_numero_service: tipoTurno.value === 'Garantía' ? $('garantia_numero_service').value : null,
        garantia_problema: tipoTurno.value === 'Garantía' ? $('garantia_problema').value : null,
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
        setStatus(formStatus, 'Reserva creada con éxito', true);
        successBanner.classList.remove('hidden');
        const nombre = payload.nombre || 'Estimado cliente';
        const mensaje = `Estimado ${nombre} gracias por su reserva el día ${payload.fecha}. Lo esperamos! Que tenga un buen día`;
        const tel = telefono.value.replace(/\D/g, '');
        if (tel) {
          const url = `https://wa.me/${tel}atext=${encodeURIComponent(mensaje)}`;
          window.open(url, '_blank');
        }
        fetchHorarios();
      } catch (e) {
        setStatus(formStatus, e.message || 'Error al crear reserva', false);
      }
    }

    const hoy = new Date();
    fecha.value = hoy.toISOString().split('T')[0];
    fetchHorarios();
    fecha.addEventListener('change', fetchHorarios);
    ['nombre', 'telefono', 'marca', 'modelo', 'matricula', 'km'].forEach(id => {
      $(id).addEventListener('input', validarForm);
    });
    cedula.addEventListener('input', validarForm);
    matricula.addEventListener('blur', buscarVehiculo);
    tipoTurno.addEventListener('change', () => {
      const esGarantia = tipoTurno.value === 'Garantía';
      garantiaBox.classList.toggle('hidden', !esGarantia);
      particularBox.classList.toggle('hidden', esGarantia);
      validarForm();
    });
    btnReservar.addEventListener('click', enviarReserva);
    particularTipo.addEventListener('change', toggleDetallesParticular);
    btnContinuar.addEventListener('click', () => {
      if (btnContinuar.disabled) return;
      stepCalendario.classList.add('hidden');
      stepFormulario.classList.remove('hidden');
    });
    btnVolver.addEventListener('click', () => {
      stepFormulario.classList.add('hidden');
      stepCalendario.classList.remove('hidden');
    });

    btnWhatsapp.href = 'https://wa.me/';
    telefono.addEventListener('input', () => {
      const t = telefono.value.replace(/\D/g, '');
      btnWhatsapp.href = t ? `https://wa.me/${t}` : 'https://wa.me/';
    });
    toggleDetallesParticular();
  </script>
</body>

</html>


