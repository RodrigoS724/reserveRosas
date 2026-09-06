-- MySQL schema for ReserveRosas

CREATE TABLE IF NOT EXISTS reservas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cedula VARCHAR(50),
  telefono VARCHAR(50),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  km VARCHAR(50),
  matricula VARCHAR(50),
  tipo_turno VARCHAR(50),
  particular_tipo VARCHAR(50),
  garantia_tipo VARCHAR(50),
  garantia_fecha_compra VARCHAR(50),
  garantia_numero_service VARCHAR(50),
  garantia_problema TEXT,
  fecha DATE NOT NULL,
  hora VARCHAR(10) NOT NULL,
  detalles TEXT,
  estado VARCHAR(50) DEFAULT 'pendiente',
  notas TEXT
);

CREATE TABLE IF NOT EXISTS horarios_base (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hora VARCHAR(10) UNIQUE NOT NULL,
  activo TINYINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bloqueos_horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  hora VARCHAR(10) NOT NULL,
  motivo TEXT
);

CREATE TABLE IF NOT EXISTS horarios_aprontes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hora VARCHAR(10) UNIQUE NOT NULL,
  cupo INT NOT NULL DEFAULT 1,
  activo TINYINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS aprontes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NULL,
  vehiculo_id INT NULL,
  nombre VARCHAR(255) NOT NULL,
  fecha DATE NOT NULL,
  hora VARCHAR(10) NOT NULL,
  telefono VARCHAR(50),
  localidad VARCHAR(100),
  observaciones TEXT,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  factura VARCHAR(100),
  estado VARCHAR(60) DEFAULT 'APRONTE',
  repuestos_garantia TEXT,
  correo_alerta_garantia VARCHAR(255),
  dias_alerta_garantia INT DEFAULT 7,
  fecha_alerta_garantia DATE NULL,
  garantia_espera_desde DATETIME NULL,
  garantia_notificada TINYINT DEFAULT 0,
  garantia_notificada_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aprontes_fecha_hora (fecha, hora)
);

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cedula VARCHAR(50) UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  localidad VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historial_reservas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reserva_id INT NOT NULL,
  campo VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  fecha DATETIME NOT NULL,
  usuario VARCHAR(100),
  FOREIGN KEY (reserva_id) REFERENCES reservas(id)
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NULL,
  dt_vehiculo_cod_id INT NULL,
  matricula VARCHAR(50) UNIQUE,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  color VARCHAR(50),
  fecha_compra DATE NULL,
  motor VARCHAR(100),
  nombre VARCHAR(200),
  telefono VARCHAR(50),
  numero_motor VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dt_vehiculo_cod (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehiculos_sin_ingresar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ci VARCHAR(50),
  motor VARCHAR(100),
  matricula VARCHAR(50),
  modelo VARCHAR(100),
  color VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repuestos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS garantias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NULL,
  motor VARCHAR(100),
  estado VARCHAR(60),
  texto TEXT,
  repuesto_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (vehiculo_id),
  INDEX (repuesto_id)
);

CREATE TABLE IF NOT EXISTS servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NULL,
  motor VARCHAR(100),
  estado VARCHAR(60),
  nro_servicio VARCHAR(50),
  km VARCHAR(20),
  matricula VARCHAR(50),
  telefono VARCHAR(50),
  texto TEXT,
  fecha_ingreso DATE NULL,
  fecha_egreso DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (vehiculo_id),
  INDEX (matricula)
);

CREATE TABLE IF NOT EXISTS vehiculos_historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  fecha DATE NOT NULL,
  km VARCHAR(50),
  tipo_turno VARCHAR(50),
  particular_tipo VARCHAR(50),
  garantia_tipo VARCHAR(50),
  garantia_fecha_compra VARCHAR(50),
  garantia_numero_service VARCHAR(50),
  garantia_problema TEXT,
  detalles TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  permissions_json TEXT,
  activo TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_username VARCHAR(255),
  actor_role VARCHAR(50),
  accion VARCHAR(100) NOT NULL,
  target_username VARCHAR(255),
  detalle TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed horarios_base si está vacío
INSERT IGNORE INTO horarios_base (hora, activo) VALUES
('08:00', 1), ('09:00', 1), ('10:00', 1), ('11:00', 1),
('13:00', 1), ('14:00', 1), ('15:00', 1), ('16:00', 1);
