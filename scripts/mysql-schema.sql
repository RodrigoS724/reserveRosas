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
  matricula VARCHAR(50) UNIQUE,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  nombre VARCHAR(200),
  telefono VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

-- Seed horarios_base si está vacío
INSERT IGNORE INTO horarios_base (hora, activo) VALUES
('08:00', 1), ('09:00', 1), ('10:00', 1), ('11:00', 1),
('13:00', 1), ('14:00', 1), ('15:00', 1), ('16:00', 1);
