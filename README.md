# 🐺 WolfZone POS — Sistema de Control de Parqueadero (Farmanorte)

Sistema integral de gestión de parqueaderos y estacionamientos comerciales de alta disponibilidad. Diseñado para operar en esquema **Servidor Central + Múltiples Taquillas / Sucursales**, con soporte de base de datos relacional PostgreSQL, sincronización en tiempo real vía WebSockets, asistencia remota integrada (FarmaDesk) e impresión térmica automatizada.

![Farmanorte WolfZone POS](public/assets/wolfzone_logo_farmanorte.jpg)

---

## 🌟 Características Principales

* 🚗 **Control de Entradas y Salidas:** Registro por placa, tipo de vehículo (Carro, Moto, Pesado, Bicicleta, etc.), asignación gráfica de cajones/plazas y cálculo tarifario dinámico por fracciones, minutos, horas, días o mensualidades.
* 🎫 **Emisión de Tickets e Impresión Térmica:** Generación de recibos con código de barras y QR compatibles con impresoras térmicas de 58mm y 80mm (ESC/POS), soporte de impresión silenciosa sin confirmación emergente.
* 💵 **Gestión de Caja y Turnos:** Apertura de caja, registro de ingresos, egresos, anticipos, cierres de turno ciegos, arqueos y cuadre con reportes detallados.
* 🏢 **Arquitectura Multicaja y Multisucursal:** 
  * Puerto `3000`: Acceso LAN para cajas y taquillas locales.
  * Puerto `3001`: Acceso WAN / VPN para sucursales remotas.
  * Puerto `9050`: Hub de asistencia y control remoto en vivo (**FarmaDesk**).
* 🛡️ **Seguridad y Auditoría:** Matriz de roles y permisos (Administrador, Supervisor, Cajero), trazabilidad completa en `audit_logs` y respaldos automáticos continuos de base de datos cada 6 horas.
* 🔄 **Alta Tolerancia a Fallos:** Conexión nativa a **PostgreSQL 16 / 18** con fallback automático a almacenamiento local (IndexedDB) en caso de contingencia de red.

---

## 🏗️ Topología del Sistema

```
                      ┌──────────────────────────────────────────────┐
                      │    🖥️ SERVIDOR CENTRAL (Linux o Windows)     │
                      │  ──────────────────────────────────────────  │
                      │  • PostgreSQL 16 (wolfzonepos_db : 5432)     │
                      │  • Node.js Backend (Express + Vite)          │
                      │  • Backups automáticos cada 6 horas          │
                      └──────┬────────────────────┬──────────────────┘
                             │                    │
        ┌────────────────────┴────────┐   ┌───────┴────────────────────────┐
        │  🌐 RED LOCAL (LAN - :3000) │   │  🌍 SUCURSALES / WAN (:3001)   │
        ├─────────────────────────────┤   ├────────────────────────────────┤
        │ • Taquilla 1 (Entrada)      │   │ • Sucursal 2 (Punto Remoto)    │
        │ • Taquilla 2 (Cobro/Salida) │   │ • Monitor Supervisor Remoto    │
        │ • Lector de Código / Barrera│   │ • FarmaDesk Hub Asistencia 9050│
        └─────────────────────────────┘   └────────────────────────────────┘
```

---

## 🐧 1. Instalación en Servidor LINUX (Kubuntu / Ubuntu / Debian)
> **Recomendado para el Servidor Central.** Optimizado para cualquier versión (desde Kubuntu 18.04 LTS con Kernel 4.15 hasta Ubuntu 22.04 / 24.04 modernas) mediante **Docker y Docker Compose**.

### Ventajas en Linux:
* **Aislamiento Total:** El contenedor provee su propio entorno moderno con Node.js 20 y PostgreSQL 16 Alpine, evitando problemas de incompatibilidad de librerías (`GLIBC_2.28`).
* **Cero Configuración Manual:** El script instala dependencias, levanta la base de datos y compila el frontend en 1 solo paso.

### Pasos de Despliegue:

1. **Abrir la terminal (Konsole)** (`Ctrl + Alt + T`).
2. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/jesusbohada/Control-de-Parqueadero-4.git wolfzone-pos
   ```
3. **Entrar a la carpeta del proyecto:**
   ```bash
   cd wolfzone-pos
   ```
4. **Ejecutar el instalador automatizado:**
   ```bash
   sudo bash desplegar-servidor-linux.sh
   ```
5. **Habilitar los puertos en el cortafuegos (Firewall UFW):**
   ```bash
   sudo ufw allow 3000/tcp comment 'Wolfzone POS LAN'
   sudo ufw allow 3001/tcp comment 'Wolfzone POS WAN'
   sudo ufw allow 9050/tcp comment 'FarmaDesk Signaling Hub'
   sudo ufw reload
   ```

### Comandos de Administración en Linux:
| Tarea | Comando (en la carpeta del proyecto) |
| :--- | :--- |
| **Ver registros en vivo (Logs)** | `sudo docker compose logs -f` |
| **Reiniciar el servidor** | `sudo docker compose restart` |
| **Detener el servidor** | `sudo docker compose down` |
| **Iniciar el servidor** | `sudo docker compose up -d` |
| **Ver uso de CPU / RAM** | `sudo docker stats` |
| **Hacer un respaldo manual de BD**| `sudo docker exec -t wolfzone_postgres pg_dump -U postgres wolfzonepos_db > backups/backup_manual.sql` |

---

## 🪟 2. Instalación en WINDOWS (Servidor o Taquillas / Cajas)
> Compatible con Windows 10, Windows 11 y Windows Server (64 bits).

### Requisitos Previos:
* [Node.js LTS (v18 o v20)](https://nodejs.org/) *(El instalador automático `.bat` puede descargarlo vía `winget` si no está instalado)*.
* *(Solo si la máquina actúa como Servidor Central)*: [PostgreSQL 16 o 18](https://www.postgresql.org/download/windows/).

### Pasos de Instalación Rápida:

1. **Descargar / Clonar el proyecto:**
   ```cmd
   git clone https://github.com/jesusbohada/Control-de-Parqueadero-4.git
   cd Control-de-Parqueadero-4
   ```
2. **Ejecutar el Asistente de Instalación:**
   * Haz clic derecho sobre `INSTALAR_SISTEMA_NUEVO.bat` y selecciona **Ejecutar como Administrador**.
   * El asistente descargará paquetes, compilará la aplicación y verificará el motor de datos.
3. **Configurar el Auto-Arranque en Segundo Plano (Opcional pero Recomendado):**
   * Ejecuta `Instalar-AutoArranque-Windows.bat` y selecciona:
     * **Opción 1 (Modo Servidor Central):** Inicia la base de datos y Node.js de forma 100% invisible en segundo plano al encender el PC (sin abrir ventanas ni navegador).
     * **Opción 2 (Modo Taquilla / Caja):** Inicia los servicios en segundo plano y abre automáticamente la interfaz de cobro en el navegador.
     * **Opción 3:** Crea accesos directos en el Escritorio.

### Scripts de Control en Windows:
| Archivo `.bat` | Descripción |
| :--- | :--- |
| `INICIAR_PARQUEADERO.bat` | Arranca la aplicación interactivamente en la terminal. |
| `Iniciar-Parqueadero-Silencioso.vbs` | Arranca el sistema en segundo plano sin ventana de consola. |
| `Iniciar-POS-Impresion-Silenciosa.bat`| Abre Google Chrome en modo Kiosco con bandera `--kiosk-printing` para tickets sin diálogo. |
| `REINICIAR_PARQUEADERO.bat` | Detiene procesos colgados de Node y reinicia el servidor. |
| `Detener-Parqueadero.bat` | Detiene inmediatamente la ejecución de la app. |
| `CREAR_BASE_DATOS_POSTGRES.bat` | Crea la base de datos `wolfzonepos_db` y aplica las tablas automáticamente. |
| `REPARAR_POSTGRESQL.bat` | Diagnóstica y soluciona fallos de conexión con el servicio PostgreSQL. |
| `RESPALDAR_BASE_DATOS.bat` | Genera una copia `.sql` con fecha y hora dentro de `backups/`. |

---

## 💻 3. Acceso desde Equipos Cliente (Taquillas de Red Local)

Cualquier computador, tablet o terminal táctil conectado a la red Wi-Fi o cableada del parqueadero puede operar como punto de cobro **sin necesidad de instalar Node.js ni bases de datos**:

1. Abre Google Chrome o Microsoft Edge en el equipo de la taquilla.
2. Ingresa la dirección IP del Servidor Central:
   ```
   http://IP_DEL_SERVIDOR:3000
   ```
   *(Ejemplo: `http://192.168.1.100:3000`)*.
3. Para operar en pantalla completa tipo kiosco con impresión directa:
   ```cmd
   chrome.exe --kiosk --kiosk-printing --app=http://192.168.1.100:3000
   ```

---

## 🔑 Credenciales y Accesos por Defecto

* **Punto de Venta / Taquilla:** `http://localhost:3000` (o la IP del servidor)
* **Ruta de Acceso Administrativo:** `http://localhost:3000/wolfzonepos`

| Usuario | PIN Predeterminado | Rol | Alcance |
| :--- | :---: | :--- | :--- |
| **admin** | `1234` | Administrador | Control total, tarifas, reportes, usuarios y configuración. |
| **supervisor** | `1234` | Supervisor | Apertura/cierre de turnos, cancelaciones y arqueos. |
| **cajero1** | `1234` | Cajero / Operador | Ingreso de vehículos, cobro de tickets y cobro de mensualidades. |

*(Nota: Los PINs y usuarios pueden ser modificados o ampliados desde el panel de **Configuración de Usuarios y Roles**)*.

---

## 🔄 ¿Cómo Actualizar el Sistema en el Futuro?

Gracias al control de versiones con Git, actualizar a la última versión es inmediato:

### En Servidor Linux (Docker):
```bash
cd wolfzone-pos
git pull origin main
sudo docker compose down
sudo docker compose up -d --build
```

### En Servidor Windows:
```cmd
cd Control-de-Parqueadero-4
git pull origin main
call npm install
call npm run build
call REINICIAR_PARQUEADERO.bat
```
*(O simplemente haz doble clic en `ACTUALIZAR_SISTEMA.bat`)*.

---

## 📄 Licencia y Créditos

Desarrollado para el control operativo y comercial de parqueaderos de **Farmanorte** bajo la suite **WolfZone POS**.  
Todos los derechos reservados.
