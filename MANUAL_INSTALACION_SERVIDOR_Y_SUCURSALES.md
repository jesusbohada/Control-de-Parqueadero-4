# Manual Técnico de Instalación y Despliegue
## Sistema de Control de Parqueadero POS — Wolfzone & Farmanorte

---

## 1. Topología del Sistema y Arquitectura de Red

El sistema **Wolfzone POS** está diseñado bajo una arquitectura flexible que permite dos esquemas de operación coordinados:

```mermaid
flowchart TD
    subgraph Sede_Principal ["🖥️ SERVIDOR CENTRAL (Sede Principal)"]
        direction TB
        DB[("PostgreSQL 18\nPuerto: 5433 / 5432\nBD: wolfzonepos_db")]
        NODE["Node.js + Express Backend\nLAN: 3000 | WAN: 3001\nWebSocket Hub: 9050"]
        ADMIN["Pantalla Administración\ny Auditoría General"]
        BACKUPS["Carpeta backups/\nCopias automáticas cada 6h"]
        DB <--> NODE
        NODE <--> ADMIN
        NODE --> BACKUPS
    end

    subgraph Red_Local ["🌐 RED LOCAL / LAN"]
        TAQ_LAN1["💻 Taquilla 1 (Patio Entrada)\nAcceso Web Kiosco\nhttp://IP_SERVIDOR:3000"]
        TAQ_LAN2["💻 Taquilla 2 (Cobro / Salida)\nAcceso Web Kiosco\nhttp://IP_SERVIDOR:3000"]
    end

    subgraph Sucursales_Remotas ["🌍 SUCURSALES REMOTAS / WAN"]
        SUC_REM1["🏢 Sucursal 2 (Punto de Venta Remoto)\nConexión VPN o WAN: 3001\nSincronización WebSocket"]
        FARMADESK["🐺 Agente FarmaDesk Pro\nEscritorio Remoto y Soporte\nPuerto 9050"]
    end

    NODE <==>|Red Local Ethernet / Wi-Fi| Red_Local
    NODE <==>|Internet / VPN Segura| Sucursales_Remotas
```

---

## 2. INSTRUCTIVO 1: Instalación en el Servidor Central (Sede Principal)

Esta máquina actuará como el **cerebro del sistema**, alojando la base de datos PostgreSQL, los respaldos automáticos y sirviendo la aplicación a las demás taquillas.

### Requisitos del Servidor:
* **Sistema Operativo**: Windows 10, Windows 11 o Windows Server (64 bits).
* **Hardware**: Memoria RAM de 4 GB o superior (8 GB recomendado).
* **Conexión**: Cable de red Ethernet directo al router (evitar Wi-Fi en el servidor).
* **IP Fija Local**: Asignar una IP estática en Windows o reserva DHCP en el router (ejemplo: `192.168.1.100` o `192.168.14.250`).

---

### Paso 1: Instalación de Componentes Base (Automático en 1 Clic)

1. En la carpeta del proyecto, localiza y ejecuta haciendo clic derecho y eligiendo **Ejecutar como Administrador**:
   ```cmd
   INSTALAR_SISTEMA_NUEVO.bat
   ```
2. El asistente verificará y realizará automáticamente:
   * **Node.js LTS**: Lo descargará e instalará vía `winget` si no está presente.
   * **Git**: Para descargas y actualizaciones en 1 clic.
   * **PostgreSQL**: Detectará la instalación existente o la aprovisionará.
   * **Dependencias**: Ejecutará `npm install` creando todos los módulos necesarios.
   * **Compilación**: Compilará la interfaz optimizada en la carpeta `/dist`.

---

### Paso 2: Verificación de la Base de Datos PostgreSQL

El sistema cuenta con autodetección de puertos (**5433** y **5432**) y credenciales.
1. Abre el archivo [.env](file:///C:/Users/sun_d/antigravity/Control-de-Parqueadero-4-2026-10-13-61ceb/.env) en el servidor y confirma la siguiente línea:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:password@localhost:5433/wolfzonepos_db
   DISABLE_HMR=false
   ```
2. Para verificar que PostgreSQL esté en ejecución, puedes usar el script de prueba o ejecutar:
   ```cmd
   INICIAR_PARQUEADERO.bat --server-only
   ```
3. Si en algún momento necesitas regenerar las tablas o los usuarios administradores, ejecuta:
   ```cmd
   CREAR_BASE_DATOS_POSTGRES.bat
   ```

---

### Paso 3: Configurar Firewall y Red para las Sucursales

Para que las demás computadoras y taquillas de la sucursal puedan entrar al sistema, los puertos deben estar abiertos en el Firewall de Windows:

1. Haz clic derecho sobre **`CONFIGURAR_SERVIDOR_CENTRAL_RED.bat`** y selecciona **Ejecutar como Administrador**.
2. El script configurará automáticamente:
   * **Puerto 3000 TCP/UDP (LAN)**: Para que cualquier PC de la sede entre vía web.
   * **Puerto 3001 TCP/UDP (WAN)**: Para conexiones de sucursales externas.
   * **Puertos 5433 y 5432 TCP**: Para acceso directo de base de datos en red local.
   * **Puerto 9050 TCP/UDP**: Para el sistema de soporte remoto FarmaDesk Pro.
   * **Mapeo UPnP en el Router**: Intenta abrir los puertos hacia el exterior automáticamente.
3. El asistente mostrará en pantalla la **IP Local del Servidor** (ejemplo: `192.168.1.150`). **Anota esta IP**, ya que se usará en todas las taquillas.

---

### Paso 4: Configurar Auto-Arranque con Windows (24/7)

Para que el servidor inicie solo cada vez que se encienda la computadora o tras un corte de luz:

1. Ejecuta:
   ```cmd
   Instalar-AutoArranque-Windows.bat
   ```
2. Selecciona la opción **`[1] MODO SERVIDOR CENTRAL`**.
3. A partir de ese momento, Windows arrancará el servicio en segundo plano de forma silenciosa y transparente sin necesidad de abrir ventanas manuales.

---

## 3. INSTRUCTIVO 2: Instalación en Sucursales y Taquillas

Para las computadoras de cobro, taquillas de patio y puntos de pago, dispones de dos modalidades:

### MODALIDAD A: Terminal Web Ligera (Recomendada — Cero Instalación)
*No requiere instalar Node.js ni PostgreSQL en la máquina del cajero.*

#### Paso 1: Comprobar Conectividad con el Servidor
1. Asegúrate de que la máquina de la taquilla esté conectada a la misma red local (o red VPN).
2. Abre el navegador web (Edge o Chrome) y digita la dirección del servidor:
   ```
   http://IP_DEL_SERVIDOR:3000
   ```
   *(Reemplaza `IP_DEL_SERVIDOR` por la IP obtenida en el Paso 3 del servidor, ej. `http://192.168.1.150:3000`)*.
3. Aparecerá de inmediato la pantalla de Login con el logo oficial de **Farmanorte**.

#### Paso 2: Crear el Acceso Directo Modo App (Kiosco POS)
Para que el cajero tenga una experiencia idéntica a una aplicación de escritorio sin barras de direcciones ni botones de navegación:

1. En el Escritorio de Windows de la taquilla, haz clic derecho -> **Nuevo** -> **Acceso directo**.
2. En la casilla de ubicación, pega el siguiente comando:
   ```cmd
   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://IP_DEL_SERVIDOR:3000
   ```
   *(Si usa Google Chrome, usa `chrome.exe --app=http://IP_DEL_SERVIDOR:3000`)*.
3. Nombra el acceso directo: **`Wolfzone POS - Taquilla`**.
4. Haz clic en Finalizar. Al abrirlo, se iniciará en una ventana independiente, limpia y ultra-rápida.

#### Paso 3: Configurar Impresora Térmica de Tickets y Cajón Monedero
1. Conecta la impresora térmica USB (SAT, Epson, Xprinter, Bixolon) e instala su controlador oficial en Windows.
2. Abre el Panel de Control -> **Dispositivos e impresoras** y establécela como **Impresora predeterminada**.
3. En las propiedades de la impresora -> **Opciones avanzadas / Configuración de dispositivo**:
   * Tamaño de papel: **80mm** (o 58mm según el rollo).
   * Cajón de dinero: Seleccionar *"Abrir antes de imprimir"* o *"Open drawer #1"*.
4. Al entrar a la aplicación en **Configuración de Negocio (icono engranaje)**:
   * Activar: *"Impresión silenciosa en segundo plano"*.
   * Ancho de papel: **80mm**.

---

### MODALIDAD B: Nodo Sucursal Autónomo (Offline-First con Sincronización)
*Útil cuando la sucursal remota está en otra ciudad o tiene internet inestable y necesita operar localmente.*

1. Copia la carpeta del sistema a la máquina de la sucursal.
2. Ejecuta:
   ```cmd
   INSTALAR_SISTEMA_NUEVO.bat
   ```
   *(Al solicitar base de datos, puedes seleccionar la opción `[3] Omitir por ahora` para que opere con la base de datos IndexedDB local ultra-rápida)*.
3. En la esquina superior derecha o en la barra lateral, haz clic en **Sincronización de Sucursal**.
4. Ingresa:
   * **URL del Servidor Central**: `http://IP_PUBLICA_O_DOMINIO:3001`
   * **ID de Sucursal**: `suc-002` (o el código asignado).
5. Haz clic en **Sincronizar**. El nodo descargará el catálogo de tarifas, abonados y enviará los tickets generados al Servidor Central.

---

## 4. Matriz de Usuarios y Credenciales del Sistema

| Rol | Usuario | Contraseña / PIN | Permisos Principales |
| :--- | :--- | :--- | :--- |
| **Administrador Maestro** | `admin` | `admin123` | Control total, edición de tarifas, anulación, cierres fiscales, reportes y usuarios. |
| **Supervisor de Patio** | `supervisor` | `super123` | Reasignación de plazas, control de turnos, arqueos y reportes operativos. |
| **Cajero de Turno** | `cajero` | `caja123` | Registro de entradas, salidas, cobro de tickets, reimpresión y cierre de turno. |
| **Caja Rápida** | `caja` | `caja` | Operación simplificada para horas pico en taquilla. |

---

## 5. Protocolo de Mantenimiento y Recuperación Rápida

### ¿Qué hacer ante un corte de luz o reinicio imprevisto?
1. Si el servidor no responde o el sistema abre la ventana de *Recuperación de Sistema*:
   * Ejecuta en el Servidor Central:
     ```cmd
     REPARAR_POSTGRESQL.bat
     ```
   * Selecciona la opción **`[1] Reparación Rápida`**. El script limpiará cualquier bloqueo residual y reiniciará el motor en segundos.

### Copias de Seguridad (Backups)
* El sistema genera respaldos automáticos en formato JSON enriquecido cada 6 horas en la carpeta `backups/`.
* Para generar un respaldo manual inmediato antes de un cierre contable, ejecuta:
  ```cmd
  RESPALDAR_BASE_DATOS.bat
  ```

### Asistencia y Soporte Remoto en Vivo
* Cada máquina cuenta con el cliente **FarmaDesk Pro** (`Iniciar-FarmaDesk.bat`).
* Al ejecutarlo, el Administrador Central puede ver la pantalla de la taquilla, diagnosticar fallas de hardware y brindar soporte en tiempo real a través del puerto `9050`.
